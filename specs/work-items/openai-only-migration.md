# OpenAI‑Only Migration (Embeddings + Reranking)

Scope: Move from HF/Qwen to OpenAI for embeddings and reranking. Update schema to 1536‑d, implement LLM‑as‑reranker with `gpt-4o-mini`, and remove redundant HF code after rollout.

## Decisions

- Embeddings: `text-embedding-3-small` (1536‑d). Cheap, strong baseline.
- Reranker: List‑wise reranking via `gpt-4o-mini` returning strict JSON `{ items: [{ index, score }] }`.
- Retrieval: vector topK\*3 → optional FTS hybrid → rerank → topK.

## Schema & Indexing

- Replace `document_chunks.embedding vector(1024)` with `embedding vector(1536)` and recreate IVFFlat (lists=100).
- Ensure FTS index exists on `document_chunks.content`.
- Update `public.retrieval_hybrid` to accept `p_query_embedding vector(1536)` and use the new column.

## Services & APIs

- Embeddings service [DONE]: `services/openai.services.ts#getOpenAIEmbeddings()` using `text-embedding-3-small` (1536‑d).
- Reranker service [DONE]: `services/openai.services.ts#rerankWithOpenAI()` (list‑wise JSON via `gpt-4o-mini`).
- Ingestion [DONE]: `app/api/ingest/academic/route.ts` writes 1536‑d embeddings to `document_chunks.embedding`.
- Retrieval route [NEXT]: compute query embedding (1536‑d), call `public.retrieval_hybrid`, optionally rerank, return topK.

## Rollout Plan

1. Create and apply combined migration (1536‑d + hybrid) [READY].
2. Implement retrieval API route(s) using 1536‑d embeddings [NEXT].
3. Re‑ingest a small React subset; verify dims=1536 and search quality [NEXT].
4. Enable reranking in retrieval; verify JSON validity/latency; fallback to fused order on errors/timeouts [NEXT].
5. Gradually re‑embed more topics; monitor costs and p95 latency [NEXT].

## Cleanup (after verification)

- HF/Qwen removals [DONE]:
  - Deleted `services/reranker.services.ts`, `services/embeddings.services.ts`.
  - Removed `HF_URL`/`HF_KEY` constants and HF axios clients.
  - Deleted smoke files `app/api/smoke/qwen/route.ts`, `scripts/smoke-qwen.mjs`.
- Docs [DONE]: Updated `specs/blueprints/existing-files.md` to reflect changes.

## Risks & Mitigations

- Token costs: keep candidate set small (≤ 20), truncate passages, cache rerank when possible.
- JSON robustness: use response_format/schema; validate; fallback to fused order on failure.
- Vector mismatch: ensure all retrievals use `embedding_1536` before dropping old column.

## Status

- DONE:
  - Combined migration adds 1536‑d embeddings, FTS index, and hybrid RPC.
  - OpenAI SDK installed; `openai.services.ts` added (embeddings + reranker).
  - Ingestion updated to write 1536‑d embeddings; HF/Qwen code removed; docs updated.
- NEXT:
  - Create `/api/retrieval/query` route using 1536‑d + optional rerank.
  - Re‑ingest a small React subset to validate dims and quality; tune lists.
  - Add fallback to fused order on rerank errors/timeouts; add simple caching later.
