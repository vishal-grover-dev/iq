# Intelligent Web Ingestion (Design)

Goal: A robust, domain‑agnostic ingestion pipeline that scales from React‑only MVP to additional streams (Angular, Vue, Node, Java, C#, Go) without rework.

## MVP Scope (React-only)

- Seeds: reference section roots and targeted subsection seeds (for example, core, DOM, server/client, compiler), provided at runtime.
- Planner: BFS constrained by domain/prefix, include/exclude regex, per‑section depth, polite rate limits.
- Extractor: Readability‑style fallback + React site adapter (main/article selection, breadcrumb parsing).
- Adaptive labels: derive `{ topic, subtopic, version }` from URL path + headings + breadcrumbs; React adapter provides mapping rules.
- Quality gates: boilerplate/nav removal, dedup (hash/simhash‑lite), section‑aware chunking (≈1–2k chars, 10–15% overlap).
- Embeddings: OpenAI `text-embedding-3-small` (1536‑d) standard.
- Observability: `ingestion_events`, progress, coverage by labels, recent, errors.

## Future (post‑MVP, multi‑stream)

- Site adapters for Angular, Vue, MDN, Node, TS, Java, Go docs.
- Incremental recrawl via ETag/Last‑Modified and content fingerprint; re‑embed on change only.
- LLM fallback labeler (server‑only, bounded) when heuristics are uncertain.
- Concurrency scheduler and per‑domain backoff tuning.
- Repo‑mode parity (prefer docs repos with path allowlists when available).

## API Shape (incremental)

- mode: "web"
- seeds[]: string[]
- domain / prefix (optional)
- includePatterns[] / excludePatterns[]
- depth or depthMap (Record<string, number>)
- maxPages, crawlDelayMs, maxConcurrency (bounded)
- topic (required), version? (optional)
- dryRun?: boolean (return plan only)

## Tasks

- [ ] Add `seeds[]`, include/exclude, depthMap to schema and processor
- [ ] Implement site adapter interface; add React adapter
- [ ] Add `ingestion_events` table + writes; expose in status
- [ ] Add dedup (hash) + near‑dup (simhash‑lite) gating
- [ ] Add dry‑run “plan” endpoint for previewing crawl scope
- [ ] Add incremental recrawl (ETag/Last‑Modified) (post‑MVP)
- [ ] Add LLM fallback labeler with budget guard (post‑MVP)
- [ ] Add adapters for Angular/Vue/MDN/Node/TS (post‑MVP)

## Notes

- Keep embeddings dimension at 1536‑d across indexing and queries for consistency.
