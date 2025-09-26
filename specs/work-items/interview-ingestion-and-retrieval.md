# Interview Ingestion and Retrieval (v1)

## Goal

Unify the active work around Interview Streams: ingest authoritative sources (repo/web), index with embeddings, and retrieve grounded context for downstream features. Academic uploads and the prior generation flow are removed.

## Principles & Context

- Repo-first for docs (clean licensing, structured Markdown/MDX). Web crawl is a bounded fallback.
- Source-agnostic planner and crawler: no site-specific hardcoding; rely on include/exclude patterns, depth limits, and robots.txt.
- Keep a single embedding space: OpenAI `text-embedding-3-small` (1536‑d) for indexing and queries.
- Prefer deterministic label derivation from paths/headings/breadcrumbs. Use LLMs only for small, bounded heuristics (e.g., planner hints).

## Scope (now)

- Ingestion: GitHub docs repos preferred; sitemap-limited web crawl as fallback.
- Indexing: normalize → chunk (≈1–2k chars, light overlap) → 1536‑d OpenAI embeddings.
- Status: job creation, processing progress, coverage, and recent items.
- Retrieval: hybrid search (vector + keyword) with optional LLM-as-reranker; query enhancement stub.
- UI: Interview Streams form to enqueue repo/web ingestions; simple progress and coverage modal.

## Non‑Goals (now)

- Payments/auth; advanced admin tooling.

## APIs (active)

- POST `/api/ingest/repo` → enqueue repo-based ingestion.
- POST `/api/ingest/repo/plan` → plan repo ingestion: counts Markdown files under optional subpaths, proposes batch slices, and summarizes categories (e.g., Guide vs Reference buckets). Input accepts GitHub tree URLs and auto-derives the subfolder.
- POST `/api/ingest/web` → enqueue crawl-based ingestion (seeds, include/exclude, depth, maxPages).
- GET `/api/ingest/:id` → status + progress, coverage, recent, and events.
- POST `/api/retrieval/query` → hybrid retrieval with optional rerank; returns normalized snippets.
- POST `/api/retrieval/enhance-query` → enhancement stub (optional usage).

## Sources & Labeling

- Sources (order of preference)
  - GitHub docs repos for React (`reactjs/react.dev` MDX: `src/content/learn`, `src/content/reference`), MDN (`mdn/content` for HTML/CSS/JS), TypeScript (`microsoft/TypeScript-Website` handbook), and others (Redux, React Router, Next.js, Testing Library, Jest).
  - Web fallback: sitemap-limited seeds within domain/prefix; respect robots.txt and throttle.
- Label shape: `{ topic, area?, subtopic?, version? }`.
- Categorization rules (deterministic examples)
  - MDN paths → topic = HTML/CSS/JavaScript; derive area/subtopic from path segments (e.g., Guide/Reference; Async/Promises).
  - React → topic = React; subtopic from section (Learn/Reference/Hooks/Performance); version = 18/19 if available.
  - TS → topic = TypeScript; subtopics from handbook sections (Types, Generics, Narrowing, JSX).

### Dynamic Label Resolution (Pluggable + LLM fallback)

- Pluggable registry: Both repo and web ingestion delegate to a single resolver (`resolveLabels`) that first applies deterministic heuristics, then optional source-specific rules (keyed by domain/repo), and only if uncertain, a bounded LLM fallback. Keeps the system source‑agnostic and extensible (e.g., Node.js, Vue) without touching core pipelines.
- Config-driven rules: Maintain a small JSON ruleset mapping regex/prefix patterns to `{ topic, subtopic, version }` labels per source. Operators can refine labels or add new sources without code changes; deployments pick up changes automatically.
- Caller hints: Allow ingestion payloads to include `labelHints` (topic/subtopic overrides, path-prefix → bucket mappings). Hints take precedence over auto-derivation and eliminate ambiguity for bespoke structures.
- LLM fallback (OpenAI-only): When rules can’t confidently classify, call a compact classifier prompt (e.g., gpt-4o-mini) that returns strict JSON `{ topic, subtopic, version, confidence }`. Enforce a whitelist of allowed topics/subtopics, require a minimum confidence, cache results by normalized path/URL, and never override explicit hints.
- Observability & safety: Track counters (rule hits, LLM hits, low-confidence rejects), log short-retention samples for QA, and provide an offline backfill job to enrich existing `documents`/`document_chunks` with improved labels. Roll out behind a feature flag.

## Data Model (reuse)

- `ingestions` (type: "repo" | "web", status, source, params, counts, metadata.progress).
- `documents` (id, ingestion_id, url_or_path, title, version, labels jsonb).
- `document_chunks` (id, document_id, chunk_index, content, tokens, embedding vector(1536), labels jsonb).
- `ingestion_events` for step-level observability (stage, message, meta, timestamp).

## Ingestion Defaults

- Web: maxPages=50, depth=2, crawlDelayMs=300 (polite; bounded).
- Dedup: hash + near-duplicate skip; noisy pages filtered.
- Observability: `ingestion_events` written at step level.

## Ingestion Pipeline & Safety Rails

1. Plan

- Repo mode: enumerate files under allowed docs paths (filters by extension `.md`, `.mdx` and path allowlists). A planning endpoint can be called to preview total counts, category breakdown, and proposed batch slices.
- Web mode: BFS per `seeds[]` within `domain/prefix`, governed by `includePatterns[]`, optional `excludePatterns[]`, `depth`/`depthMap`, `maxPages`, `crawlDelayMs` (polite backoff). Robots.txt is fetched and cached with TTL.
- Optional AI assist: `suggestCrawlHeuristics(url, htmlPreview, navigationPreview)` proposes include patterns and depth hints (bounded and validated).

2. Fetch & Extract

- Repos: fetch Markdown/MDX; extract title/headings/prose/code blocks.
- Web: Readability-style extraction; remove boilerplate/nav; basic language/quality checks to drop error or noisy pages.

3. Normalize & Label

- Normalize whitespace, merge tiny sections, keep code blocks intact when possible.
- Derive `{ topic, subtopic, version }` from path/headings/breadcrumbs; React/MDN/TS heuristics as above.

4. Chunk

- Recursive character splitter targeting ≈1–2k chars with light overlap (≈10–15%).
- Compute simple token counts for observability.

5. Embed

- OpenAI embeddings `text-embedding-3-small` (1536‑d). Batch with retry/backoff for 429/5xx. Pre-truncate long inputs.

6. Persist & Progress

- Upsert `documents` (idempotent on `(bucket, path)`), replace `document_chunks` for the document, and write `ingestion_events` during each stage.
- Maintain `metadata.progress`: { totalPlanned, processed, currentPathOrUrl, step: crawling|chunking|embedding, errorsCount, lastUpdatedAt }.

7. Batching (repo) and Resume

- Repo processing is cursor-based and resumable: `metadata.batch = { totalPlanned, nextStart, batchSize }`. Each call to the process route handles one batch and returns quickly with `{ completed, processed, total }`.
- UI (Interview Streams) auto-triggers the next batch when `step=awaiting_next_batch`, so runs progress without manual clicks.

7. Deduplication

- Exact dedup via SHA‑256 content hash.
- Near-dup skip using light shingling (e.g., 5-word Jaccard ≥ 0.9) with event logs.

## Reliability Hardening (React docs pilot)

### Context

- Recent catalog runs showed many completed ingestions with 0 documents/chunks due to URL fragment duplicates, intra-run races on the same page, and generic label fallback. Base URL issues were also seen in CLI runs.

### Problems observed

- Multiple catalog entries pointed to the same page (hash fragments), causing dedup to drop later jobs.
- 32 parallel jobs raced to write the same paths; unique (bucket, path) guard made many runs end with 0 docs.
- Generic subtopic derivation (e.g., "Learn") overshadowed explicit subtopics.
- CLI baseURL misconfiguration initially returned invalid URL errors.

### Recommended fixes

1) Normalize and dedupe seeds before enqueue
   - Strip URL fragments and query, normalize protocol/host, and lower-case host.
   - Only enqueue one job per normalized path; mark all catalog entries that map to the same path as covered.

2) Preflight skip for existing documents
   - Before creating an ingestion, check `documents` for (bucket='web', path=normalized URL).
   - If present, set `embedded=true` in the catalog and do not create an ingestion.

3) Concurrency control by domain/path groups
   - Keep overall concurrency, but batch same-host or same-path groups to avoid intra-run conflicts on the same page.

4) Stronger completion check and retry
   - After "completed", verify document and chunk counts increased; if not and page is not present, retry once with a longer crawl delay and log reason.

5) Precise labeling
   - Prefer explicit subtopic from metadata/catalog; ignore generic buckets (Learn/Guide/Docs/Tutorial).
   - For react.dev `reference/*`, label as `Reference/<leaf>`.

6) Observability & docs
   - Log resolved baseURL in CLI, per-item state transitions, and final coverage counts.
   - Set `documents.num_pages` for HTML to a sensible proxy (e.g., `chunks.length`).

### One-time validation run (operator playbook)

Note: keep commands and SQL out of this document; follow the repo scripts referenced.

1) Reset environment
   - Stop any running ingestion jobs.
   - Clear ingestion-related tables using the provided database script (documents, document_chunks, ingestions, ingestion_events). Do not modify migrations.
   - Verify tables are empty via the helper script (counts only).

2) Reset catalog
   - Set `embedded=false` for all entries in `data/interview-ingest-catalog.json` using a quick JSON edit or helper script.
   - Commit changes.

3) Run catalog pilot (React only)
   - Start dev server.
   - Execute the catalog CLI with controlled concurrency.
   - Observe logs for enqueue → process → completed per item; ensure baseURL is printed.

4) Verify coverage
   - Use the database helper script to fetch per-ingestion document and chunk counts for the window of the run.
   - Confirm that all normalized unique paths show non-zero chunks; duplicates should have been preflight-skipped.
   - Spot-check labels on a few documents for correct subtopics (no generic "Learn").

5) Mark success
   - Ensure the catalog file has `embedded=true` for processed entries.
   - Capture a brief note in this document with the date and high-level counts.

## Retrieval Defaults

- topK=8, alpha=0.5 (vector/keyword blend), rerank enabled with fallback on timeout.
- Embeddings: OpenAI `text-embedding-3-small` (1536‑d) for both indexing and queries.

## Retrieval Logic

1. Candidate set

- Resolve `ingestions` for the caller and provided label filters; join to `documents` → candidate `document_id` set.

2. Vector search

- Compute query embedding (same model/dimension). Order by `<->` distance; fetch topK×3.

3. Keyword search (FTS)

- Use Postgres `to_tsvector('english', content)` with `plainto_tsquery` terms; fetch topK×3 within the candidate set.

4. Score fusion

- Normalize distances/ranks to [0,1]; blend via `final = alpha * vectorScore + (1 - alpha) * keywordScore`. If only one signal exists, use it.

5. Rerank (optional)

- LLM-as-reranker (`gpt-4o-mini`) over fused candidates with 2–4s timeout. On timeout, fallback to fused order.

6. Return

- TopK items with { documentId, chunkIndex, content, tokens, score, title?, bucket, path, rerankScore? } and debug timings.

## Status & Progress

- Derived counts: documentsProcessed, chunksProcessed/vectorsStored.
- Coverage: distinct labels (topic, subtopic, version) present so far.
- In‑flight: processed/totalPlanned, currentPathOrUrl, step, errorsCount, lastUpdatedAt.

## UI: Interview Streams (admin-facing)

- Stream selector: `Front-end with React` (initial).
- Rows (repeatable) per source:
  - Topic: `React` | `JavaScript` (more later).
  - Subtopic: predefined by topic + `Other` (modal for custom subtopic).
  - Ingest Type: `Docs Repo (GitHub)` | `Website (Crawl)`.
  - URL: repo root or site seed URL.
- Submission: enqueue per-row job
  - Repo → POST `/api/ingest/repo` { repoUrl, paths: [], topic, version?, maxFiles: 200 }.
  - Web → POST `/api/ingest/web` { seeds: [url], domain, includePatterns?, excludePatterns?, depth or depthMap, maxPages (≤50), crawlDelayMs (≥300), topic }.
- Progress: poll status endpoint; show coverage and recent; display modal on completion.

### Planning & Controls (repo)

- Plan button (UI) calls `/api/ingest/repo/plan` to preview: total files, batch slices (size ≤200), and category breakdown (e.g., Guide/*, Reference/operators, Reference/global_objects).
- Controls scaffolded: Resume/Retry (calls process endpoint), and Download run report (export from status), with Pause planned as a follow-up.

## Catalog-driven ingestion (ops)

- Catalog: `data/interview-ingest-catalog.json` with `{ subtopic, ingestType, url, embedded }` per topic.
- Utility: `runCatalogIngestion({ topic?, maxConcurrency?, logger? })` reads catalog, dedupes URLs, and enqueues repo/web ingestions. Defaults: all topics, concurrency=4, `console` logger.
- Script: `pnpm run:catalog --topic=React --concurrency=4` for ad-hoc runs with ISO-timestamped logs.

## React Ingestion URL Map (react.dev)

- React → Components & Props: https://react.dev/learn/passing-props-to-a-component
- React → JSX & Rendering: https://react.dev/learn/writing-markup-with-jsx, https://react.dev/learn/conditional-rendering, https://react.dev/learn/rendering-lists, https://react.dev/learn/render-and-commit
- React → State & Lifecycle: https://react.dev/learn/state-a-components-memory, https://react.dev/learn/preserving-and-resetting-state
- React → Events & Forms (Controlled): https://react.dev/learn/responding-to-events, https://react.dev/learn/forms
- React → Lists & Keys (Reconciliation): https://react.dev/learn/rendering-lists
- React → Context API: https://react.dev/learn/passing-data-deeply-with-context, https://react.dev/reference/react/createContext, https://react.dev/reference/react/useContext
- React → Hooks: useState: https://react.dev/reference/react/useState
- React → Hooks: useEffect: https://react.dev/reference/react/useEffect, https://react.dev/learn/synchronizing-with-effects
- React → Hooks: useLayoutEffect: https://react.dev/reference/react/useLayoutEffect
- React → Hooks: useMemo: https://react.dev/reference/react/useMemo
- React → Hooks: useCallback: https://react.dev/reference/react/useCallback
- React → Hooks: useRef: https://react.dev/reference/react/useRef
- React → Hooks: useImperativeHandle: https://react.dev/reference/react/useImperativeHandle
- React → Hooks: useId: https://react.dev/reference/react/useId
- React → Hooks: useSyncExternalStore: https://react.dev/reference/react/useSyncExternalStore
- React → Hooks: useContext: https://react.dev/reference/react/useContext
- React → Hooks: useReducer: https://react.dev/reference/react/useReducer
- React → Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
- React → Refs & DOM: Referencing Values: https://react.dev/learn/referencing-values-with-refs
- React → Refs & DOM: Manipulating the DOM: https://react.dev/learn/manipulating-the-dom-with-refs
- React → Forwarding Refs: https://react.dev/learn/reusing-logic-with-forwarding-refs
- React → Performance Optimization: https://react.dev/learn/escape-hatches#optimizing-re-renders, https://react.dev/reference/react/memo, https://react.dev/reference/react/lazy
- React → Memoization (React.memo/useMemo/useCallback): https://react.dev/reference/react/memo, https://react.dev/reference/react/useMemo, https://react.dev/reference/react/useCallback
- React → Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- React → Portals: https://react.dev/reference/react-dom/createPortal
- React → Fragments: https://react.dev/reference/react/Fragment
- React → Strict Mode: https://react.dev/reference/react/StrictMode
- React → Concurrent Rendering (Basics): https://react.dev/reference/react/useTransition, https://react.dev/reference/react/useDeferredValue
- React → Suspense (Intro): https://react.dev/reference/react/Suspense, https://react.dev/reference/react/lazy
- React → Effects: Dependencies & Cleanup: https://react.dev/learn/synchronizing-with-effects, https://react.dev/learn/you-might-not-need-an-effect
- React → Controlled vs Uncontrolled Forms: https://react.dev/learn/forms, https://react.dev/learn/referencing-values-with-refs
- React → Data Fetching Patterns (High-level): https://react.dev/learn/you-might-not-need-an-effect, https://react.dev/learn/synchronizing-with-effects
- React → useTransition & useDeferredValue (Basics): https://react.dev/reference/react/useTransition, https://react.dev/reference/react/useDeferredValue
- React → Error Handling Patterns: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary

## Notes

- Prefer repo-mode when possible for license clarity and clean content.
- Keep the system source‑agnostic; no site-specific hardcoding in planners/processors.
- Generation will be redesigned separately; this document remains focused on ingestion and retrieval only.

## Implemented Changes (2025-09-25)

- GitHub tree URL normalization: pasting a URL like `.../tree/main/files/en-us/web/javascript` auto-derives the repo base and sets `paths` to the subfolder.
- Repo plan endpoint: counts files under `paths`, proposes slices (≤200 per batch), and summarizes categories for preview.
- Cursor-based batching for repo: process route handles one batch per call and updates `metadata.batch`; UI auto-advances batches without manual clicks.
- Idempotency: `documents` upsert on `(bucket, path)`; `document_chunks` are replaced per document to prevent duplicates and allow re-runs.
- Path-derived labels: for MDN JS, subtopics are derived from the path (e.g., `Guide/<Leaf>`, `Reference/Operators`, `Reference/Global Objects`). Form subtopic is ignored unless explicitly overridden.
- JS corpus run: MDN JavaScript folder fully ingested (1322 docs, 4655 chunks, 0 null embeddings) via batches; verified counts and labels.

## Deprecation Plan

- This document supersedes:
  - `specs/work-items/upload-interview-questions.md` (generation removed; ingestion/retrieval folded here).
  - `specs/work-items/intelligent-web-ingestion.md` (React-specific notes generalized into source-agnostic heuristics).
- After review and sign-off, delete the superseded docs and keep this as the single source of truth.

## Tasks

- [ ] QA: Run React docs coverage crawl (repo/web) and review embeddings counts
- [ ] Document recommended seeds/patterns per topic (React, JS) for v1
- [ ] Verify retrieval precision@K with/without rerank on sampled queries
- [ ] Outline next-gen question generation requirements (separate doc)
- [x] Confirm deprecation and delete `upload-interview-questions.md` and `intelligent-web-ingestion.md`

- Reliability hardening (implementation)
  - [x] Implement seed normalization and catalog-level pre-dedupe in runner
  - [x] Add preflight check (skip if `documents(bucket='web', path=normalized)` exists) and update catalog without enqueuing
  - [x] Group work items by hostname/path key; process groups sequentially within a host to avoid races; keep cross-host concurrency
  - [x] Enhance completion verification and add a single retry with increased crawl delay
  - [x] Persist `documents.num_pages = chunks.length` for web ingestions during processing
  - [x] Repo: cursor-based batching per process call with `metadata.batch` ({ totalPlanned, nextStart, batchSize }).
  - [x] Repo: idempotent `documents` upsert by `(bucket, path)` and replace `document_chunks` to allow safe re-runs.
  - [x] Auto-derive subdirectory from GitHub tree URLs and scope enumeration to that folder.
  - [x] Path-derived subtopics for MDN JS (Guide/<leaf>, Reference/<category>, Global Objects) with override option.

- Dynamic label resolution (design & rollout)
  - [ ] Add pluggable LabelResolver registry shared by repo/web ingestion
  - [ ] Add config-driven rules file for per-source regex/prefix → labels mapping
  - [ ] Implement OpenAI-based fallback classifier with whitelist + confidence threshold
  - [ ] Add caching + metrics (rule hits, LLM hits, rejects); wire to logs
  - [ ] Provide an offline backfill job to enrich existing labels safely
  - [ ] Gate with a feature flag; pilot on one non-MDN source (e.g., Node.js)

- One-time validation run (operator playbook)
  - [ ] Stop any running ingestion jobs
  - [ ] Clear ingestion-related tables using the provided database script; do not modify migrations
  - [ ] Verify tables are empty via the helper script (counts only)
  - [ ] Set `embedded=false` for all entries in `data/interview-ingest-catalog.json`; commit changes
  - [ ] Start dev server
  - [ ] Execute the catalog CLI with controlled concurrency; ensure baseURL is printed
  - [ ] Fetch per-ingestion document and chunk counts for the run window
  - [ ] Confirm normalized unique paths show non-zero chunks; duplicates are preflight-skipped
  - [x] Spot-check labels for correct subtopics (no generic "Learn"); MDN JS derivation verified on full run
  - [ ] Ensure catalog entries are marked `embedded=true` for processed items
  - [ ] Add a brief note here with date and high-level counts
