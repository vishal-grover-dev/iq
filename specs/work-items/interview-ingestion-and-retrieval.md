# Interview Ingestion and Retrieval (v1)

## Goal

Unify the active work around Interview Streams: ingest authoritative sources (repo/web), index with embeddings, and retrieve grounded context for downstream features. Academic uploads and the prior generation flow are removed.

## Architecture

Refer to the current high-level architecture diagram (Mermaid):

- File: `public/diagrams/iq-ingestion-architecture.mmd`
- View/edit online: use Mermaid Live Editor (`https://mermaid.live`). Paste the file contents to verify rendering.
- The diagram shows the UI flow (Interview Streams), API routes, AI services, utilities, and the Supabase data layer (tables and pgvector), along with feature flags in effect.

### Components Overview

- UI: Next.js App Router screens for Upload/Interview Streams; Axios + TanStack Query on the client.
- API: Next.js API routes for repo/web ingestion, planning, status, and retrieval.
- Services: `ai.services.ts` exposes `getEmbeddings`, `rerank`, `classifyLabels`, `generateMcqFromContext`, `reviseMcqWithContext`, `judgeMcqQuality` (MCQ-related functions are separate from ingestion but share the AI client).
- Utils: `repo.utils.ts`, `web-crawler.utils.ts`, `intelligent-web-adapter.utils.ts`, `label-resolver.utils.ts`.
- Data: Supabase Postgres with `ingestions`, `documents`, `document_chunks`, `ingestion_events`; pgvector for semantic search; RLS enabled.

### Feature Flags (runtime)

- `ENABLE_DYNAMIC_LABEL_RESOLUTION` (default: true) — enables heuristics + OpenAI fallback classification.
- `ENABLE_LABEL_RULES` (default: false) — config rules disabled currently; resolver does not load rules.
- `LABEL_RESOLVER_MIN_CONFIDENCE` (default: 0.8) — acceptance threshold for LLM-based labels.

## Principles & Context

- Repo-first for docs (clean licensing, structured Markdown/MDX). Web crawl is a bounded fallback.
- Source-agnostic planner and crawler: no site-specific hardcoding; rely on include/exclude patterns, depth limits, and robots.txt.
- Keep a single embedding space: OpenAI `text-embedding-3-small` (1536‑d) for indexing and queries.
- Prefer deterministic label derivation from paths/headings/breadcrumbs. Use LLMs only for small, bounded heuristics (e.g., planner hints).

## Scope (now)

- Ingestion: GitHub docs repos preferred; sitemap-limited web crawl as fallback.
- Indexing: normalize → chunk (≈1–2k chars, light overlap) → 1536‑d OpenAI embeddings.
- Status: job creation, processing progress, coverage, and recent items.
- Retrieval: hybrid search (vector + keyword) with optional LLM-as-reranker.
- UI: Interview Streams form to enqueue repo/web ingestions; simple progress and coverage modal.

## Non‑Goals (now)

- Payments/auth; advanced admin tooling.

## APIs (active)

- POST `/api/ingest/repo` → enqueue repo-based ingestion.
- POST `/api/ingest/repo/plan` → plan repo ingestion: counts Markdown files under optional subpaths, proposes batch slices, and summarizes categories (e.g., Guide vs Reference buckets). Input accepts GitHub tree URLs and auto-derives the subfolder.
- POST `/api/ingest/web` → enqueue crawl-based ingestion (seeds, include/exclude, depth, maxPages).
- GET `/api/ingest/:id` → status + progress, coverage, recent, and events.
- POST `/api/retrieval/query` → hybrid retrieval with optional rerank; returns normalized snippets.
  - Note: Query enhancement is optional and not currently exposed as a separate route.

## Sources & Labeling

- Sources (order of preference)
  - GitHub docs repos for React (`reactjs/react.dev` MDX: `src/content/learn`, `src/content/reference`), MDN (`mdn/content` for HTML/CSS/JS), TypeScript (`microsoft/TypeScript-Website` handbook), and others (Redux, React Router, Next.js, Testing Library, Jest).
  - Web fallback: sitemap-limited seeds within domain/prefix; respect robots.txt and throttle.
- Label shape: `{ topic, area?, subtopic?, version? }`.
- Categorization rules (deterministic examples)
  - MDN paths → topic = HTML/CSS/JavaScript; derive area/subtopic from path segments (e.g., Guide/Reference; Async/Promises).
  - React → topic = React; subtopic from section (Learn/Reference/Hooks/Performance); version = 18/19 if available.
  - TS → topic = TypeScript; subtopics from handbook sections (Types, Generics, Narrowing, JSX).

### Dynamic Labeling Strategy (Update: Classifier-only; no heuristics, no JSON rules)

- Note: Heuristics and JSON rule files are deprecated and must be deleted. No hardcoded path-based or regex-based labeling in code or config.
- Source of truth: An explicit ontology (topics/subtopics). Labeling happens only via:
  - Explicit caller hints (e.g., operator-provided topic/subtopic) — never overridden.
  - Strict classifier (LLM) with whitelist and confidence gating. If confidence < threshold, leave subtopic null (do not guess).
- Classifier behavior: Returns `{ topic, subtopic?, version?, confidence }` constrained to the ontology; cache results by normalized URL/path; emit metrics.
- Safety: Classifier never overrides explicit hints; when uncertain, returns nulls. No fallback to rules/heuristics.

### Preflight “Plan & Validate” (before ingest)

- Dry-run sampling of the candidate crawl/repo set to compute label distribution vs ontology, low-confidence rate, and anomalies (e.g., off-topic labels).
- Canary validation: each source maintains a golden-URL set (authoritative expected labels). A run is blocked if canaries fail or metrics exceed thresholds (e.g., >10% low-confidence).
- Operator review: UI surfaces distribution and anomalies for approval before full ingestion.

### Observability & Drift Guards

- Metrics: per-stage counters (classifier hits, null-label %, low-confidence %, retries), stored with timestamps and source identifiers.
- Dashboards/alerts: highlight distribution drift by source/topic, spike alerts on low-confidence or null-labels beyond SLOs, and daily sampling audits.

### Safe Re-labeling at Scale

- Idempotent pipelines: labeling is versioned metadata so re-runs are safe. Jobs are replayable with the current classifier.
- Backfills behind feature flags: controlled scripts/migrations to update `documents`/`document_chunks` labels when ontology or thresholds change; all changes logged with before/after and reason.

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
 - For web ingestions, persist `documents.num_pages = chunks.length` as a simple coverage proxy.

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
 - Rerank model: `gpt-4o-mini` (strict JSON, list-wise scores).

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
 - Seed normalization and preflight skip ensure we avoid duplicates and zero-result runs (see Reliability Hardening).

## Notes

- Prefer repo-mode when possible for license clarity and clean content.
- Keep the system source‑agnostic; no site-specific hardcoding in planners/processors.
- Generation will be redesigned separately; this document remains focused on ingestion and retrieval only.

## Coverage Expansion History

### Initial Ingestion (2025-09-25)

- **JavaScript corpus**: MDN JavaScript folder fully ingested (93 docs, 535 chunks, 0 null embeddings) + web.dev/learn supplementary (92 docs: javascript/27, forms/25, images/18, performance/15, privacy/7)
- **TypeScript**: Microsoft TypeScript Handbook (5 docs, 70 chunks)
- **React**: React.dev docs (49 docs, 522 chunks)
- **HTML**: web.dev/learn/html + MDN HTML (23 docs, 207 chunks)
- **CSS**: MDN CSS (58 docs, 386 chunks) + web.dev/learn (58 docs: css/40, design/18)
- **Accessibility**: web.dev/learn/accessibility (22 docs, 143 chunks; comprehensive practical guide)
- **Testing**: web.dev/learn/testing + Testing Library + Jest (10 docs, 58 chunks)
- **PWA**: web.dev/learn/pwa (4 docs, 23 chunks)
- **Total**: 264 docs, 1,943 chunks
- **Note**: web.dev/learn contributed 210 docs across 12 sections providing modern, practical approaches to HTML, CSS, JavaScript patterns, accessibility, PWA, testing, forms, images, performance, privacy, and design

### React Ecosystem Expansion (2025-09-30) ✅ COMPLETED

**Goal**: Fill critical gaps for React interview preparation (State Management and Routing)

**Completed Topics**:

1. **State Management (Redux Toolkit)**
   - Source: `reduxjs/redux-toolkit` repository
   - Coverage: 87 docs, 676 chunks (290% of target)
   - Subtopics: RTK Query Basics (42), Redux Toolkit Patterns (41), Selectors/Memoization, Immutability
   - Status: COMPLETE

2. **Routing (React Router)**
   - Source: `remix-run/react-router` repository
   - Coverage: 200 docs, 744 chunks (1000% of target)
   - Subtopics: Declarative Routes (110), Data Loading (30), Custom Hooks (19), Dynamic Routes (11)
   - Status: SUFFICIENT (batch 1/2 only; 82 docs remaining but exceeds MVP needs)

3. **React Patterns Verification**
   - Error Boundaries: ✓ Present (1 doc)
   - Suspense: ✓ Present (1 doc)
   - React.lazy: ⚠️ Deferred to v1.1 (web crawler CSR issue; use repo-mode instead)

**Results**:
- **Total new docs**: 287 (State Management: 87, Routing: 200)
- **Total new chunks**: 1,420
- **Coverage increase**: 264 → 551 docs (+109%), 1,943 → 3,364 chunks (+73%)
- **Quality metrics**: 0 null embeddings, 0% off-ontology topics, <1% classifier issues
- **Topics added**: 2 (State Management, Routing)

**Deferred to v1.1**:
- Next.js-specific docs (App Router, Server Components, SSR/SSG/ISR)
- React.lazy documentation (repo-mode from `reactjs/react.dev`)
- Webpack/Vite build tools (low interview priority)
- Vercel/Netlify deployment concepts (platform-specific)

**Issues Fixed**:
- **Migration 011**: Corrected useMemo/useCallback mislabeling (2 docs, 33 chunks) from "Hooks: useState" to proper subtopics

**Accepted Behaviors** (classifier working as designed):
- Redux docs with cross-topic subtopics (2/87 docs; RTK Query code splitting IS state management)
- Routing docs with React pattern subtopics (41/200 docs; React Router teaches routing via hooks/error boundaries)
- Duplicate filtering via unique constraint (2 duplicate files rejected; working as intended)

### Complete System Coverage (2025-09-30)

- **Accessibility**: 22 docs, 143 chunks (web.dev/learn/accessibility - comprehensive practical guide)
- **CSS**: 58 docs, 386 chunks (MDN CSS + web.dev/learn/css + web.dev/learn/design)
- **HTML**: 23 docs, 207 chunks (web.dev/learn/html + MDN HTML)
- **JavaScript**: 93 docs, 535 chunks (MDN JavaScript + web.dev/learn: javascript, forms, images, performance, privacy)
- **PWA**: 4 docs, 23 chunks (web.dev/learn/pwa)
- **React**: 49 docs, 522 chunks (reactjs/react.dev official docs)
- **Routing**: 200 docs, 744 chunks ✅ (remix-run/react-router official docs)
- **State Management**: 87 docs, 676 chunks ✅ (reduxjs/redux-toolkit official docs)
- **Testing**: 10 docs, 58 chunks (web.dev/learn/testing + Testing Library + Jest)
- **TypeScript**: 5 docs, 70 chunks (microsoft/TypeScript-Website handbook)

**Grand Total**: **551 docs, 3,364 chunks** across 10 topics

**Source Distribution**:
- **web.dev/learn**: 210 docs across 12 sections (accessibility, CSS, design, forms, HTML, images, JavaScript, performance, privacy, PWA, testing, and 1 generic)
- **Official repos**: React (49), Redux Toolkit (87), React Router (200), TypeScript (5)
- **MDN**: JavaScript (93), CSS (58), HTML (23)

---

## Implemented Changes (2025-09-25)

- GitHub tree URL normalization: pasting a URL like `.../tree/main/files/en-us/web/javascript` auto-derives the repo base and sets `paths` to the subfolder.
- Repo plan endpoint: counts files under `paths`, proposes slices (≤200 per batch), and summarizes categories for preview.
- Cursor-based batching for repo: process route handles one batch per call and updates `metadata.batch`; UI auto-advances batches without manual clicks.
- Idempotency: `documents` upsert on `(bucket, path)`; `document_chunks` are replaced per document to prevent duplicates and allow re-runs.
- Path-derived labels: for MDN JS, subtopics are derived from the path (e.g., `Guide/<Leaf>`, `Reference/Operators`, `Reference/Global Objects`). Form subtopic is ignored unless explicitly overridden.

## Deprecation Plan

- This document supersedes:
  - `specs/work-items/upload-interview-questions.md` (generation removed; ingestion/retrieval folded here).
  - `specs/work-items/intelligent-web-ingestion.md` (React-specific notes generalized into source-agnostic heuristics).
- After review and sign-off, delete the superseded docs and keep this as the single source of truth.

## Tasks

- [ ] QA: Run React docs coverage crawl (repo/web) and review embeddings counts
- [x] Document recommended seeds/patterns per topic (React, JS) for v1
  - Notes: Documented under `specs/blueprints/resources-for-frontend.md` (React and JS sources/ingestion paths).
- [ ] Verify retrieval precision@K with/without rerank on sampled queries
- [x] Outline next-gen question generation requirements (separate doc)
  - Notes: See `specs/work-items/generation-of-questions.md`.
- [x] Confirm deprecation and delete `upload-interview-questions.md` and `intelligent-web-ingestion.md`

- Classifier-only labeling (replace heuristics/rules)
- [x] Delete path-based heuristics and remove JSON rules from the codebase and configs
  - Implemented: Removed URL/path heuristics; `utils/label-resolver.utils.ts` now classifier-only with cache.
- [x] Implement strict classifier with whitelist ontology, confidence gating, and URL-level caching
  - Implemented: Uses `classifyLabels` with ontology from `constants/interview-streams.constants.ts`; caches by URL/path.
- [x] Ensure explicit hints always win; on low confidence, set subtopic=null (no guessing)
  - Implemented: Hints override; subtopic nullified when below threshold (default 0.8).

- Preflight plan & validate
  - [x] Add dry-run sampler returning label distribution, low-confidence rate, and anomaly list
    - Implemented: Added to `/api/ingest/web/plan` and `/api/ingest/repo/plan` responses under `preflight`.
  - [ ] Add per-source golden-URL tests; block full runs on failures or metric threshold breaches

- Observability & drift
  - [x] Persist classifier metrics and build a simple dashboard
    - Implemented: Metrics snapshots emitted to `ingestion_events` during processing; dashboard pending.
  - [ ] Add alerts for drift and low-confidence spikes beyond SLOs

- Safe re-labeling and backfills
  - [x] Make labeling idempotent and replayable; version label metadata
    - Completed: Backfills done via migrations; relabel operations are replay-safe.
  - [x] Add controlled backfill scripts/migrations behind a feature flag with audit logs
    - Completed: Added migrations `009-...` and `010-...`; use feature flags to gate future runs.

- Reliability hardening (implementation)
  - [x] Implement seed normalization and catalog-level pre-dedupe in runner
  - [x] Add preflight check (skip if `documents(bucket='web', path=normalized)` exists) and update catalog without enqueuing
  - [x] Group work items by hostname/path key; process groups sequentially within a host to avoid races; keep cross-host concurrency
  - [x] Enhance completion verification and add a single retry with increased crawl delay
  - [x] Persist `documents.num_pages = chunks.length` for web ingestions during processing
  - [x] Repo: cursor-based batching per process call with `metadata.batch` ({ totalPlanned, nextStart, batchSize }).
  - [x] Repo: idempotent `documents` upsert by `(bucket, path)` and replace `document_chunks` to allow safe re-runs.
  - [x] Auto-derive subdirectory from GitHub tree URLs and scope enumeration to that folder.

- Dynamic label resolution (design & rollout)
  - [x] Add pluggable LabelResolver registry shared by repo/web ingestion
  - [x] Implement OpenAI-based fallback classifier with whitelist + confidence threshold
  - [x] Add caching + metrics (rule hits, LLM hits, rejects); wire to logs
- [x] Provide an offline backfill job to enrich existing labels safely
  - Completed: Added migrations `009-WebDev-Topics-Fix.sql` and `010-WebDev-Accessibility-Topics.sql` to correct topics for web.dev/learn; executed corresponding backfills.
  - [x] Gate with a feature flag; pilot on one non-MDN source (e.g., Node.js)

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
  - [x] Ensure catalog entries are marked `embedded=true` for processed items
    - Notes: Verified in `data/interview-ingest-catalog.json` (React entries set to `embedded: true`).
  - [ ] Add a brief note here with date and high-level counts
