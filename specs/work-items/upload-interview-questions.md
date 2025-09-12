# Upload & Indexing for Interview Questions (v1)

Scope: Implement repo/web ingestion, chunking, embeddings, and storage to enable AI‑generated MCQs for React → JS/TS/HTML/CSS. Payments/auth deferred.

## Goals

- Ingest authoritative docs (repos first) for React/JS/TS/HTML/CSS.
- Normalize, chunk, and embed text into pgvector (1536‑d) with labels.
- Expose minimal APIs to enqueue ingestion jobs, track status, and generate questions.

## Non‑Goals (v1)

- Payments and entitlements; refunds.
- Full admin CMS; we’ll use Supabase table editor for QA.
- Broad crawling beyond whitelisted sources.

## Sources (order of preference)

1. GitHub repos (Markdown/MDX):
   - MDN: `mdn/content` (CC‑BY‑SA) — HTML/CSS/JS.
   - React: `reactjs/react.dev` — MDX learn/reference.
   - TypeScript: `microsoft/TypeScript-Website` — Handbook.
   - Redux Toolkit, React Router, Next.js, Testing Library, Jest docs repos.
2. Sitemap‑limited fetch for gaps (e.g., web.dev performance). Respect robots.txt; throttle.

## Data Model (reuse + labels)

- `ingestions` (type: "repo" | "web", status, source, params, counts)
- `documents` (id, ingestion_id, url_or_path, title, version, labels jsonb)
- `document_chunks` (id, document_id, chunk_index, content, tokens, embedding vector(1536), labels jsonb)
- Labels shape: `{ topic, area?, subtopic?, version? }`

## API Endpoints (v1)

- POST `/api/ingest/repo` → { repoUrl, paths[], topic, version? } → returns { ingestionId }
- GET `/api/ingest/:id` → status { queued|processing|completed|failed, counts }
- POST `/api/generate/mcq` → { filters, count, difficulty?, bloomLevels? } → generates/stores MCQs with citations.

## Jobs & Workers

- For v1 within serverless limits: process ≤200 files per job. If more, split into multiple jobs/ingestions.
- Steps per job:
  1. Fetch files (git clone/sparse checkout or GitHub RAW pulls for whitelisted paths).
  2. Parse Markdown/MDX → extract title/headings/prose/code.
  3. Normalize → sections; derive labels from path/breadcrumbs.
  4. Chunk (1–2k chars, 10–15% overlap) and tokenize count.
  5. Embed (OpenAI embeddings 1536‑d) → upsert `document_chunks`.
  6. Update counts; mark completed.

## Chunking & Embeddings

- Chunker: recursive character splitter; try to respect headings; keep code blocks intact when possible.
- Embeddings: OpenAI `text-embedding-3-small` (1536‑d) via server OpenAI SDK.
- Backoff/retry on 429/5xx; batch size 64–128 tokens equivalent.

## Categorization Rules

- MDN paths → topic=HTML/CSS/JavaScript; area/subtopic from path (e.g., `Guide/Using_promises` → area=Async, subtopic=Promises).
- React → topic=React; subtopic from section (Hooks, Performance, Context). Version=18/19 tags from repo.
- TS → topic=TypeScript; subtopics per handbook sections (Types, Generics, Narrowing, JSX).

## Upload UI Enhancements (Web Ingest Mode)

- Add a new tab/section: "Web ingest" next to current upload.
- Fields:
  - Mode: Repo (default) | Web
  - Repo URL(s): text area (one per line)
  - Path filters: optional glob/prefix
  - Topic: select (React, JS, TS, HTML, CSS)
  - Version tag: optional text (e.g., React 18)
  - Max files/pages: default 200
  - Submit → shows Ingestion ID + live status (queued→processing→done)
- For Web mode: Seed URL, domain, prefix, depth, max pages, crawl delay.

## Retrieval for Generation

- Query by filters → select candidate `document_chunks` constrained by labels; order by embedding <-> queryEmbedding; optional FTS blend.
- k defaults: topK\*3 candidates → fuse or direct for v1 (no rerank initially).

## MCQ Generation (v1)

- Input: filters { topic, subtopic?, version? }, count, difficulty?, bloomLevels?
- Prompt on retrieved chunks to produce structured JSON:
  - { question, options[4], correctIndex, explanation, citations: [{url, sectionTitle}], labels: {difficulty, bloom, topic, subtopic, version} }
- Validate with Zod; reject/regen on shape failures; store in `mcq_items` + `mcq_explanations`.

## QA & Review

- One‑tap flag removes item from rotation and writes to a review table.
- Weekly pass to fix/remove flagged items; keep attribution/citations intact.

## Observability

- Log per ingestion: files processed, chunks, vectors, ms per step.
- Log per generation: provider latency, acceptance rate, regen count.

## Existing capabilities to reuse (repo paths)

- Axios clients and interceptors: `services/http.services.ts`
- Embeddings client: `services/openai.services.ts`
- Supabase server/browser utils: `utils/supabase.utils.ts`
- Text extraction/chunking helpers (adapt parts): `utils/langchain.utils.ts`
- Ingestion API scaffolding (pattern to mirror): `app/api/ingest/academic/route.ts`
- Zod schemas (pattern/reference): `schema/ingest.schema.ts`, `schema/retrieval.schema.ts`
- Types and enums (Bloom/types conventions): `types/ingest.types.ts`, `types/retrieval.types.ts`
- Query provider setup (TanStack Query): `store/providers/query.provider.tsx`
- UI building blocks for forms: `components/ui/*`, upload page: `app/upload/page.tsx`

## Risks & Mitigations

- Licensing: stick to permissive sources; attribute MDN.
- Scale/timeouts: split large ingestions; introduce background worker if needed.
- Label drift: recalibrate with aggregate correctness over time.

## Milestones

- M1: Repo ingest for React (≤200 files), embeddings stored, labels present.
- M2: Web ingest fallback (sitemap‑limited), MDN JS subset embedded.
- M3: MCQ generation route + minimal quiz UI consuming generated items.
- M4: Adaptive drills using attempts data.

## Status

- DONE:
  - OpenAI-only migration in effect: embeddings use `text-embedding-3-small` (1536‑d) with optional LLM rerank. See `specs/work-items/openai-only-migration.md`.
  - Academic PDF ingestion route implemented (`app/api/ingest/academic/route.ts`); chunks stored with 1536‑d embeddings.
  - Retrieval API implemented (`app/api/retrieval/query/route.ts`) using hybrid search (vector+FTS) and optional reranking.

- NEXT:
  - Implement repo/web ingest endpoints and processing flow per this doc (jobs, parsing Markdown/MDX, labeling).
  - Implement MCQ generation route and persistence; wire minimal quiz UI to consume generated items.
  - Add Upload UI “Web ingest” tab and status tracking for jobs.

- Notes:
  - Embedding dimension standardized at 1536‑d using OpenAI. Keep the rest of the flow but ensure all ingestion modes use OpenAI embeddings.
