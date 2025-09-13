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

## Interview Streams UI (Finalized for v1)

- Purpose: Admin can curate sources for interview content without dealing with files.
- Default category: `Interview Streams` (replaces the need for a separate web-ingest tab).
- Stream selector: single option for now — `Front-end with React`.
- Rows (repeatable): each row represents one source to ingest.
  - Fields per row
    - `Topic` (combobox): `React` | `JavaScript`.
    - `Subtopic` (combobox): predefined list based on Topic plus `Other`.
      - If `Other` is chosen, open modal to input a custom subtopic; save back into row.
    - `Ingest Type` (combobox): `Docs Repo (GitHub)` | `Website (Crawl)`.
    - `URL` (input):
      - For Repo: `https://github.com/owner/repo` (public docs repos only in v1).
      - For Website: seed URL within the allowed domain (small crawl, sitemap-limited mindset).
  - Row controls
    - First row shows an Add button.
    - Subsequent rows show a Delete button.
- Submission behavior
  - For each row, start an ingestion job:
    - Repo → `POST /api/ingest/repo` with { repoUrl, paths: [], topic, maxFiles: 200 }.
    - Website → `POST /api/ingest/web` with { seedUrl, domain(hostname of URL), depth: 2, maxPages: 50, crawlDelayMs: 300, topic }.
  - Show a success toast when jobs are enqueued.

### Academic Upload (unchanged)

- When `Academic` is selected, show the original fields (Board, Class, Subject, Resource type, optional chapter, Files dropzone).
- Client uploads PDFs to Supabase Storage, then `POST /api/ingest/academic` with uploaded object metadata.

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

## Status & Progress Visibility (v1)

- Status endpoint: GET /api/ingest/:id returns a lightweight status document including id, status (queued|processing|completed|failed), created_at, metadata, and a progress object.
  - Progress (derived, no migration required):
    - documentsProcessed: count of documents for the ingestion
    - chunksProcessed: count of document_chunks joined to those documents
    - vectorsStored: same as chunksProcessed
    - coverage: distinct labels seen so far (topic, subtopic, version)
    - recent: up to 5 most recently inserted documents (title/path)
- In‑flight progress (written incrementally by the job into ingestions.metadata.progress):
  - totalPlanned: total files/pages enumerated (maxFiles/maxPages after listing/crawl plan)
  - processed: number completed so far
  - currentPathOrUrl: file path or URL currently being processed
  - step: crawling | chunking | embedding
  - errorsCount: number of non‑fatal errors
  - lastUpdatedAt: ISO timestamp for UI freshness
- Topic coverage for react.dev and similar sources: derive subtopic labels at document insert time using simple path heuristics (e.g., learn, reference, hooks). The status endpoint can report distinct subtopics covered so far.
- UI: poll the status endpoint every 2–3 seconds while status=processing; display “Processing processed/totalPlanned; current: currentPathOrUrl; step.”
- Optional (granular tracing): add an ingestion_events table via a new migration (do not modify existing migrations) to record step‑level messages with timestamps and a minimal meta payload; expose a streaming or polled feed for live logs.

## Observability

- Log per ingestion: files processed, chunks, vectors, ms per step.
- Log per generation: provider latency, acceptance rate, regen count.
- Status visibility: status endpoint exposes progress counts (documentsProcessed, chunksProcessed/vectorsStored), coverage (labels), recent items, and in‑flight fields (step, currentPathOrUrl, processed/totalPlanned). UI polls every 2–3 seconds until completion/failure.
- Optional events: when enabled, persist step‑level ingestion events (stage, message, meta, timestamp) and surface them in a live console; otherwise rely on status polling.
- Include current step and current path/URL in logs to aid troubleshooting; increment errorsCount for non‑fatal issues and keep lastUpdatedAt fresh for the UI.

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
  - Polish ingestion status tracking UI (poll by `ingestionId`).
  - Implement MCQ generation route and persistence; wire minimal quiz UI to consume generated items.

- Notes:
  - Embedding dimension standardized at 1536‑d using OpenAI. Keep the rest of the flow but ensure all ingestion modes use OpenAI embeddings.

## Tasks

- [x] Enhance ingestion status endpoint to include derived progress/coverage/recent/inflight
- [x] Add MCQ tables (`mcq_items`, `mcq_explanations`) with RLS and indexes via new migration
- [x] Add label-based retrieval RPC (`retrieval_hybrid_by_labels`) via new migration
- [x] Add generation schemas/types for MCQ requests/responses and item validation
- [x] Implement `POST /api/generate/mcq` route (v1 placeholder synthesis) with persistence
- [x] Add client service and hook for MCQ generation
- [x] Build minimal UI action to trigger MCQ generation for selected topic/subtopic
  - Implemented per-row Generate button in `components/upload/interviewSection.component.tsx` invoking `useGenerateMcqMutations`; toasts on success/error. Visual baselines updated.
- [ ] QA: Generate sample MCQs for React topics; review citations and labels
- [x] Improve generation: replace placeholder synthesis with LLM prompt using retrieved context
  - Implemented: retrieval + LLM rerank + `generateMcqsFromContexts` with strict JSON → validated and persisted.
- [ ] Update docs: add examples and notes on generation params and expected outputs
- [x] Change UX: Submit enqueues all ingestions; show progress; modal to confirm Generate after indexing completes
  - Implemented: repo/web routes split into create (pending) and process with progress updates. UI polls and displays completion modal.

## Intelligent Web Ingestion (MVP: React-only)

Purpose: Make web ingestion more robust and topic-aware for React documentation now, with a design we can extend later without rework.

Scope (now):
- Seeds: reference section roots and targeted subsections (for example, core, DOM, server/client, compiler), bounded by domain/prefix and polite rate limits; seeds are provided at runtime.
- Adaptive labeling: derive topic, subtopic, and version from URL segments, headings, and breadcrumbs using deterministic React-specific rules.
- Crawl planner knobs: include and exclude patterns, per-section depth, maximum pages, and crawl delay.
- Quality gates: boilerplate removal, deduplication, section-aware chunking (approximately 1–2k characters, light overlap), embeddings at 1536 dimensions.
- Observability: step-level ingestion events; coverage summary showing documents, chunks, distinct subtopics and versions; recent items and error samples.

Out of scope (now):
- Non-React streams (Angular, Vue, Node, etc.).
- Full incremental recrawls with ETag/Last-Modified (planned separately).

Tasks
- [x] Add include and exclude patterns and per-section depth to the web ingestion schema and route
  - Implemented in `schema/ingest.schema.ts`, `utils/web-crawler.utils.ts`, and `app/api/ingest/web/*`.
- [x] Support multiple seeds per job; plan BFS per seed within domain/prefix bounds
  - Implemented via `seeds[]` parameter in schema and crawler.
- [x] Implement universal label derivation for topic, subtopic, and version
  - Implemented `utils/intelligent-web-adapter.utils.ts`; web processor uses it instead of site-specific adapters.
- [x] Introduce ingestion events (new table via a new migration) and write step-level messages
  - Implemented `005-Ingestion-Events.sql`; events written from repo/web processors.
- [x] Extend status endpoint coverage: distinct subtopics and versions with counts
  - Implemented in `app/api/ingest/[id]/route.ts`; surfaced as `coverage` and `events`.
- [x] Add deduplication (hash) and near-duplicate skip (similarity-lite), logging decisions to events
  - Implemented SHA-256 hash dedup and 5-word shingles Jaccard≥0.9 skip with events.
- [x] Expose admin controls: includePatterns, excludePatterns, depthMap, maxPages, crawlDelayMs
  - Supported via ingestion metadata; validated in schema; consumed by web processor.
- [x] Apply safety rails: hard cap per job and default polite crawl delays
  - Defaults: maxPages=50, depth=2, crawlDelayMs=300; overridable within bounds.
- [ ] QA: run a wide React reference crawl; verify coverage breadth and embeddings counts
  - Pending: run crawl and review coverage/embeddings; adjust heuristics if needed.
- [ ] Documentation: update to reflect universal heuristics and defaults; remove React-only references
  - Pending: refresh docs and examples.