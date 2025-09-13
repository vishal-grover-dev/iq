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

- [x] Add `seeds[]`, include/exclude, depthMap to schema and processor
  - Implemented in `schema/ingest.schema.ts`, `utils/web-crawler.utils.ts`, and web ingestion routes. Back‑compat kept for `seedUrl`.
- [x] Implement site adapter interface; add React adapter
  - Added `utils/web-react-adapter.utils.ts` and integrated in `api/ingest/web/process/route.ts` (label derivation + main content selection).
- [x] Add `ingestion_events` table + writes; expose in status
  - Added migration `005-Ingestion-Events.sql`; events written from repo/web processors; surfaced in status as `events`.
- [x] Add dedup (hash) + near‑dup (simhash‑lite) gating
  - Implemented SHA‑256 hash dedup and 5‑word shingle Jaccard≥0.9 near‑dup skip with events.
- [x] Add dry‑run "plan" endpoint for previewing crawl scope
  - Added `app/api/ingest/web/plan/route.ts` returning planned pages (count + titles).
- [x] Add error recovery and retry logic for failed page fetches
  - Implemented `fetchWithRetry` with exponential backoff, rate limit handling, and timeout protection.
- [x] Add content quality filters (minimum length, language detection)
  - Added `isContentQualityAcceptable` function with English detection, error page filtering, and content-to-noise ratio checks.
- [x] Optimize embedding API calls with better batching
  - Implemented batch processing (5 pages at a time) to reduce API calls and improve performance.
- [x] Improve robots.txt parsing and caching
  - Added in-memory caching for robots.txt with 1-hour TTL and retry logic for failed fetches.

## Notes

- Keep embeddings dimension at 1536‑d across indexing and queries for consistency.
