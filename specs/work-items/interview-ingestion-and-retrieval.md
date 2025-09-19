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

- Repo mode: enumerate files under allowed docs paths (filters by extension `.md`, `.mdx` and path allowlists).
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

- Upsert `documents` and `document_chunks`; write `ingestion_events` during each stage.
- Maintain `metadata.progress`: { totalPlanned, processed, currentPathOrUrl, step: crawling|chunking|embedding, errorsCount, lastUpdatedAt }.

7. Deduplication

- Exact dedup via SHA‑256 content hash.
- Near-dup skip using light shingling (e.g., 5-word Jaccard ≥ 0.9) with event logs.

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
