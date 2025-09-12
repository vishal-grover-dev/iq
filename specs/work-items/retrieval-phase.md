# Retrieval Phase (v1)

## Purpose

Define the end-to-end retrieval experience and backend functionality that powers question generation grounding. Retrieval consumes embedded `document_chunks` to fetch relevant context using pgvector and optional FTS, then returns structured snippets ready for RAG prompts.

## Scope (v1)

- User can select knowledge scope (Board → Class → Subject → Resource subset).
- User can enter a natural-language query or choose a template (e.g., “Generate 10 MCQs for Chapter 5”).
- System retrieves top-k relevant snippets using hybrid search (vector + keyword) with simple rerank.
- Returns normalized context blocks (with document title, page range estimate, provenance).

## Defaults (v1)

- topK: 8
- alpha (hybrid blend): 0.5
- reranker: LLM-as-reranker using `gpt-4o-mini` (list-wise JSON)
- subject scope: subject-wide across resource types by default
- embeddings provider: OpenAI `text-embedding-3-small` (1536-d). Use the same model for indexing and queries.

Non-goals (v1):

- No dataset management UI beyond basic filters.
- No background re-indexing or incremental embeddings.

## UI Plan

### Entry Points

- Questions page CTA after ingestion success.
- Dedicated “Retrieve” panel inside Questions Builder.

### Panels and Controls

- Filters
  - Board (required), Class (required), Subject (required)
  - Resource type: All (default) or multi-select (Textbook, PYQ). Retrieval defaults to subject-wide (ignores resource type) unless explicitly constrained.
  - Optional: Chapter (number/name) if available in metadata
- Query input
  - Placeholder: “Ask about the chapter or specify the paper pattern…”
  - Assist: Predefined templates dropdown
- Retrieval settings (collapsible advanced)
  - Top K (default 8)
  - Hybrid weight alpha (0–1, default 0.5)
  - Max tokens per chunk (truncate UI only)
  - Target Bloom levels (multi-select) with optional per-level distribution

### Results List

- Each result shows: score, preview (first 2–3 sentences), document title, chunk index, and a “view source” action to open Storage object path.
- Multi-select to include/exclude context blocks in final prompt.
- Sticky footer: “Use selected as context” → proceeds to generation step.

### Empty/Loading/Error States

- Loading shimmer and retry on error.
- Empty state guidance: refine filters or broaden query.

## Backend Plan

### API Contracts

- POST `/api/retrieval/query` (Auth required)

  - Request
    - filters: { board, grade, subject, resourceType?, chapterNumber?, chapterName?, subjectWide? }
    - query: string
    - topK?: number
    - alpha?: number
    - bloomTargets?: EBloomLevel[]
    - bloomDistribution?: Record<EBloomLevel, number>
  - Response
    - { ok, items: Array<{ documentId, chunkIndex, content, tokens, score, title?, bucket, path, rerankScore? }>, debug?: { vectorMs, keywordMs, rerankMs, bloomHintApplied?: boolean } }

- POST `/api/retrieval/enhance-query` (Auth required)
  - Request: { rawQuery: string, filters }
  - Response: { ok, enhancedQuery: string, explanations: string[], termHighlights?: string[], debug?: { ms } }

### Retrieval Logic

1. Candidate set by metadata join

- Resolve `ingestions` for user and metadata filters.
- Join to `documents` → get `document_id` set.
- Subject-wide default: include all `documents` for the subject regardless of `resourceType`. If `resourceType` is specified (single or multiple), constrain to it.

2. Vector search

- Compute embedding of the text query using the same model and dimension (1536-d) via OpenAI.
- `select ... order by embedding <-> query_embedding limit topK*3` from `document_chunks` constrained to candidate `document_id` set.

3. Keyword search (optional FTS)

- Use Postgres `to_tsvector('english', content)` on `document_chunks` with `plainto_tsquery` of query terms, constrained to candidate set. Limit topK\*3.

4. Score fusion (hybrid)

- Normalize vector distances to similarity scores.
- Normalize FTS ranks to [0,1].
- Blend: `final = alpha * vectorScore + (1 - alpha) * keywordScore`.
- If only one signal present, use it directly.

Note: Use a single normalization approach project-wide (e.g., vectorSimilarity = 1/(1+distance)).

5. Rerank (in-scope, v1)

- Apply cross-encoder reranker to fused candidates (Bloom-aware). If unavailable or timed out, use fused order.

6. Return topK with provenance

- Include `bucket`, `path`, `title`, and `document_id` to enable “view source.”

### Data Access

- Use Supabase service-role on server route for cross-table joins, still respecting RLS via server account. Ensure user scoping by filtering on `ingestions.user_id`.

### Performance

- Ensure `ivfflat` index exists (already created) and `ANALYZE` runs after large inserts.
- Consider `lists` tuning later; start with 100.
- Paginate results for UI if needed.

## Reranker Configuration (v1)

- Goal: Improve precision@K by applying LLM-as-reranker over the top N (e.g., topK\*3) fused candidates.
- Provider: OpenAI `gpt-4o-mini` returning strict JSON with per-passage scores.
- Flow: hybrid retrieve → rerank with user/enhanced query (+ Bloom hint, see Bloom section) → sort by rerankScore → take topK → include fusedScore for debug.
- Timeouts/fallbacks: 2–4s timeout. On timeout, use fused order.
- Config flags
  - enableRerank: boolean (default true)
  - rerankFanout: number (default topK\*3)

## Types & Contracts

- retrieval: `retrievalRequestSchema`, `retrievalResponseSchema` in `schema/retrieval.schema.ts`
- types in `types/retrieval.types.ts` with `I`/`T`/`E` prefixes per convention

Additional (v1):

- query enhancement: `retrievalEnhancementRequestSchema`, `retrievalEnhancementResponseSchema`
- extend retrieval response with `rerankScore`, `fusedScore`, `explanations`
- `EBloomLevel` enum: Remember, Understand, Apply, Analyze, Evaluate, Create

## Services & Hooks

- `services/retrieval.services.ts`
  - `postRetrievalQuery()` — server API call
- Hooks (browser):
  - `useRetrievalQuery()` with TanStack Query

Additional (v1):

- `postRetrievalEnhanceQuery()` — server API call for query enhancement.
- `useRetrievalEnhancement()` — client hook to enhance query (debounced), powering the preview UI.

Bloom-related (v1):

- Accept and pass `bloomTargets` and `bloomDistribution` through the client service to the API and then to generation.

## Query Enhancement (UX + API)

### UX

- After user types a query, show an “Enhance” button (and optionally auto-run on pause).
- Display a side-by-side or inline diff between original and enhanced query.
- Let the user edit the enhanced version before running retrieval.
- Show added terms/tags chips (e.g., chapter/subject synonyms) they can toggle on/off.
- Persist the final accepted query as `finalQuery` in local state and use it for rerank/retrieval.

### API

- POST `/api/retrieval/enhance-query`
  - Input: { rawQuery, filters }
  - Output: { ok, enhancedQuery, explanations: string[], termHighlights?: string[], debug?: { ms } }
- Approach
  - LLM rewrite with constraints: respect provided filters; avoid injecting categories not present.
  - Augment with synonyms and related terms drawn from: filter metadata, common textbook terminology, and light TF-IDF terms sampled from candidate documents (when available).
  - Bloom-aware hints: if Bloom targets include Apply/Analyze/Evaluate/Create, add verbs and constructs that bias retrieval toward procedural, comparative, evaluative, or generative passages.
  - Guardrails: keep length reasonable; avoid adding speculative facts.

## Open Questions

- None specific to provider parity after OpenAI standardization.
- What is the default K for generation prompts (8 vs 12)?
- Do we need per-board stopword tweaks for FTS?
- Which reranker configuration to standardize on for v1: OpenAI `gpt-4o-mini` params and fanout?
- Query enhancement trigger: manual button only or also auto-run on debounce?

## v2 Considerations

- Add section-aware chunk re-merging for better readability.
- Add caching layer for popular queries.

## Generation (v1)

- Strategies (configurable, default RAG + CoT)
  - Zero-shot (grounded), Few-shot, Chain-of-Thought, Self-consistency (2–3 samples)
- Output shape
  - MCQ: options[], correctIndex, explanation, distractorRationales[]
  - Short/Long: suggestedAnswer, evaluatorKeywords[]
  - Common: id, bloomLevel, promptText, contextRefs[] with citations (documentId:chunkIndex, bucket, path, title)
- UI
  - Advanced settings for strategy, seeds/samples, temperature; save per user/board later
  - MCQ: Reveal answer, Why? panel with citations, View source link
  - Short/Long: Suggested answer and Evaluator keywords sections
- Implementation notes
  - Modular prompts; strict formatting; always cite chunk IDs; ignore out-of-context
  - Bloom control: include per-level targets/exemplars; label each question; regenerate mismatches

## Bloom's Taxonomy Integration (v1)

- UI
  - Multi-select Bloom levels with optional distribution sliders or numeric inputs per level.
  - Show tooltips with level definitions and example verbs.
- API
  - Accept `bloomTargets` and optional `bloomDistribution` in retrieval and pass-through to generation.
  - Set `bloomHintApplied` when enhancement/reranker guidance used.
- Retrieval
  - Enhance queries with Bloom-aligned verbs and patterns.
  - Bias reranker with instruction indicating preferred Bloom levels.
- Generation
  - Use prompts tailored to each level, optionally with few-shot examples per board/subject.
  - Enforce distribution targets and include Bloom labels in output.
- Validation
  - Post-generation classification step confirms Bloom level for each item; if disagreement with target, regenerate that item using the correct level and the same context.
  - Include citations for each item to mitigate hallucinations.

## Hallucination Mitigation & Task Decomposition (v1)

- Answerability check
  - Before generation, use a small LLM to verify if the query is answerable from the selected context; return pass/fail with rationale.
  - If fail, expand retrieval window (increase K, adjust alpha) and retry once.
- Decomposition
  - If still insufficient, decompose into sub-questions/tasks (LLM planner) and retrieve per sub-task sequentially.
  - Execute one sub-task at a time; accumulate verified context; stop early on insufficient evidence.
- Guardrails
  - Require explicit citations (documentId:chunkIndex) for each generated item.
  - Reject or flag outputs with missing/contradictory citations.
  - Optionally run a “consistency check” pass that validates each question against context and verifies Bloom label alignment with the question’s cognitive demand.
- Observability
  - Log `topK`, `alpha`, fused vs rerank scores, enhancement diffs, and answerability results for tuning.

## Streaming & Transport (v1)

- Transport
  - Use server‑sent streaming from API routes so the UI receives tokens/chunks progressively (recovery on reconnect not required v1).
  - Prefer Vercel AI SDK streaming helpers to standardize formatting and backpressure handling.
- Server
  - Use an AI SDK streaming API to produce incremental deltas for question text, options, explanations, and suggested answers.
  - Chunk format: structured segments (e.g., start_question, option, explanation, citation, end_question) to support partial rendering and controls.
- Client
  - Use AI SDK React hooks to subscribe to the stream, render partial content, and maintain stable IDs per question item.
  - Integrate with TanStack Query cache when the final payload consolidates, so the state is durable after streaming completes.
- Error handling
  - Emit structured error frames; client shows resumable states or a clear retry.

## Vercel AI SDK Integration (v1)

- Overview
  - Use the AI SDK for server streaming and React client hooks. It provides ergonomic helpers for streaming text and structured outputs.
- Hooks & Patterns
  - React client: adopt chat/completion hooks to manage input, messages, and streaming UI.
  - Server: use streaming helpers to send incremental tokens/segments to the client.
- UI components
  - Adopt Vercel AI UI SDK components for chat/assistant and streaming experiences to minimize custom HTML and leverage well-tested primitives.
  - Use shadcn/ui for surrounding layout, forms, menus, and non-AI UI surfaces.
- References
  - Vercel AI SDK docs: [Vercel AI SDK](https://sdk.vercel.ai)
  - React hooks overview: [AI SDK UI for React](https://sdk.vercel.ai/docs/ai-sdk-ui)
  - Server streaming (core): [AI SDK Core](https://sdk.vercel.ai/docs/ai-sdk-core)
  - Example app: [Next.js AI Chatbot Template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)
