# Architecture Decisions & Rationale

This document captures the "why" behind key technical choices in the IQ project. It complements the other blueprints by explaining the reasoning, trade-offs, and constraints that led to current patterns.

---

## AI & Embeddings

### OpenAI `text-embedding-3-small` (1536-d)

**Decision:** Use OpenAI embeddings model with 1536 dimensions for all indexing and queries.

**Why:**

- **Single embedding space:** Keeping the same model for indexing and queries ensures semantic consistency and avoids dimension mismatches.
- **Cost-performance balance:** `text-embedding-3-small` offers strong semantic understanding at lower cost vs. larger models while still capturing nuanced technical documentation.
- **Proven track record:** OpenAI embeddings have been battle-tested across documentation search use cases with high retrieval precision.
- **Migration context:** Initially used 1024-d embeddings (migration 002); switched to 1536-d (migration 003) after observing improved retrieval accuracy in early testing.

**Trade-offs:**

- Vendor lock-in to OpenAI (mitigated by abstracting embeddings behind `getEmbeddings` service function).
- Higher dimensionality increases storage/index size vs. 1024-d but improves retrieval quality.

---

### Classifier-only Labeling (No Heuristics/Rules)

**Decision:** Use strict LLM classifier with confidence gating (default 0.8) for topic/subtopic labeling; no hardcoded path-based heuristics or JSON rule files.

**Why:**

- **Reliability lessons learned:** Early catalog runs with URL/path heuristics led to many zero-result ingestions due to:
  - Generic subtopic derivation (e.g., "Learn" bucket) overshadowing explicit subtopics.
  - Brittle regex/prefix rules failing on slight path variations across documentation sites.
  - Maintenance burden of maintaining per-site rule files.
- **Source-agnostic design:** Classifier generalizes to any documentation site without hardcoding site-specific patterns.
- **Explicit ontology:** Whitelist of allowed topics/subtopics from `constants/interview-streams.constants.ts` ensures labels stay within the product's scope.
- **Confidence gating:** When classifier confidence < 0.8, `subtopic` is left `null` rather than guessing, preventing low-quality labels from polluting the index.
- **Operator hints always win:** Explicit `topicHint`/`subtopicHint` from catalog or UI override classifier output, giving humans final control.

**Implementation:**

- `services/ai.services.ts` (`classifyLabels`): Returns `{ topic, subtopic, version, confidence }` using `gpt-4o-mini` with strict JSON schema.
- `utils/label-resolver.utils.ts`: Orchestrates classifier with URL/path-level caching and metrics (hits, rejects).

**Trade-offs:**

- LLM cost per URL (mitigated by caching normalized URL/path).
- Latency during ingestion (acceptable for batch processing; preflight sampling validates before full runs).

---

## Data & Storage

### Supabase + PostgreSQL + pgvector

**Decision:** Use Supabase as the unified database, auth, and storage platform with pgvector for vector search.

**Why:**

- **All-in-one platform:** Combines PostgreSQL, vector support (pgvector), authentication (Supabase Auth), file storage (Supabase Storage), and RLS in a single service, reducing operational complexity.
- **Native vector support:** pgvector enables ANN (approximate nearest neighbor) indexing (`ivfflat`) directly in Postgres without a separate vector database (e.g., Pinecone, Weaviate).
- **Hybrid search in SQL:** Postgres supports both vector similarity (`<->` operator) and full-text search (GIN indexes, `to_tsvector`/`ts_rank`), allowing hybrid retrieval in a single RPC function.
- **Row-Level Security (RLS):** Fine-grained access control at the database layer protects user data without application-layer permission checks on every query.
- **Developer experience:** Supabase client libraries (JavaScript) provide a clean API for auth, storage, and database queries; auto-generated types from schema.
- **Scalability:** Managed Postgres with connection pooling, backups, and replication; can scale vertically and horizontally as needed.

**Trade-offs:**

- Vendor lock-in (mitigated by using standard PostgreSQL + pgvector, which are portable).
- ANN index tuning (IVFFlat `lists=100`) requires periodic reindexing as data grows; consider HNSW for larger scales.

---

### Hybrid Search (Vector + Keyword)

**Decision:** Combine vector similarity search (pgvector) and keyword search (Postgres FTS) with configurable alpha blend (default 0.5).

**Why:**

- **Complementary strengths:**
  - **Vector (semantic):** Captures conceptual similarity; good for paraphrased or synonym-rich queries (e.g., "component lifecycle" → "mounting/unmounting" docs).
  - **Keyword (FTS):** Precise term matching; good for technical terms, API names, and exact phrases (e.g., "useEffect" → React hooks docs).
- **Better coverage:** Hybrid approach reduces retrieval misses; either signal can surface relevant chunks.
- **Tunable balance:** Alpha parameter (0.5 default) lets us weight semantic vs. keyword relevance based on query type or feedback.
- **RPC efficiency:** Single Postgres function (`retrieval_hybrid`) computes both signals and fuses scores in one round-trip, avoiding multi-step orchestration.

**Implementation:**

- `migrations/003-Embeddings-1536-And-Hybrid.sql`: RPC function computes vector distances and FTS ranks, normalizes scores, blends via `alpha`, and returns top-k.
- `app/api/retrieval/query/route.ts`: Calls RPC with query embedding and text; optional LLM reranker (`gpt-4o-mini`) post-processes for final ranking.

**Trade-offs:**

- Increased index storage (vector index + FTS GIN index).
- Tuning alpha requires empirical testing; no universal optimal value.

---

### LLM-as-Reranker (Optional)

**Decision:** Use `gpt-4o-mini` as an optional reranker over fused hybrid search results with 2–4s timeout and fallback to fused order.

**Why:**

- **Cross-encoder quality:** LLMs can assess query-passage relevance better than dot-product similarity or keyword rank alone by understanding context.
- **Listwise scoring:** Model sees all candidates together and can differentiate subtle relevance differences.
- **Graceful degradation:** Timeout + fallback ensures retrieval always returns results even if reranker is slow or fails.

**Trade-offs:**

- Latency (2–4s) and cost per query.
- Non-deterministic (temperature=0 helps but still varies slightly).

---

## Backend & API

### Next.js API Routes (Serverless)

**Decision:** Use Next.js API routes for all backend endpoints (ingestion, retrieval, MCQ generation, status).

**Why:**

- **Monorepo simplicity:** Frontend (React) and backend (API routes) live in one codebase, sharing types, utils, and services without cross-repo sync.
- **Serverless deployment:** Netlify/Vercel deploys API routes as serverless functions, eliminating server management.
- **Fast iteration:** Changes to API logic deploy atomically with frontend; no separate backend build/deploy pipeline.
- **TypeScript end-to-end:** Type safety from database schema → API → React Query hooks → UI components.
- **Edge-ready:** Next.js supports edge runtime for low-latency regions (though nodejs runtime is used for AI/DB operations here).

**Implementation:**

- `app/api/**/route.ts`: Each folder is a route; `GET`/`POST` exports define handlers.
- `services/http.services.ts`: Axios clients with interceptors for consistent error handling and retry logic.

**Trade-offs:**

- **Serverless timeouts:** Default 10s (Netlify) or 60s (Vercel) limits long-running tasks like large crawls. Mitigated by:
  - Batching (repo ingestion uses cursor-based batches).
  - Bounded scope (web crawls limited to maxPages=50, depth=2).
  - Future: background workers for larger jobs.

---

## Frontend & UI

### Next.js App Router

**Decision:** Use Next.js 15+ App Router (React Server Components) for all pages and layouts.

**Why:**

- **React 19 features:** Concurrent rendering, Suspense, streaming SSR, and server components reduce client bundle size and improve initial load.
- **File-based routing:** Intuitive folder structure (`app/upload/page.tsx` → `/upload`); nested layouts, loading states, and error boundaries as first-class primitives.
- **SEO-friendly:** Server-side rendering by default ensures content is crawlable; static generation for marketing pages.
- **Developer experience:** Hot reload, TypeScript, and path aliases (`@/*`) streamline development.

**Trade-offs:**

- Learning curve for server vs. client components (mitigated by `"use client"` directive clarity).
- Some libraries not yet RSC-compatible (wrap in client components as needed).

---

### TanStack Query + Axios (not `fetch`)

**Decision:** Use TanStack Query for server state management; Axios for all HTTP requests (frontend and backend).

**Why TanStack Query:**

- **Server state separation:** Decouples server data (caching, refetch, invalidation) from local UI state (Jotai).
- **Automatic caching:** Queries dedupe and cache responses by key; stale-while-revalidate pattern reduces redundant requests.
- **Declarative fetching:** `useQuery`/`useMutation` hooks replace boilerplate loading/error state management.
- **Optimistic updates:** Mutations can update cache optimistically before server confirms.

**Why Axios over `fetch`:**

- **Interceptors:** Centralized request/response transforms (e.g., auth headers, error normalization) in `services/http.services.ts`.
- **Retry/backoff:** `externalGetWithRetry` helper for crawling with exponential backoff on 429/5xx.
- **Timeout handling:** Built-in timeout config; `fetch` requires manual `AbortController` wiring.
- **Consistency:** Same client config across browser (frontend) and server (API routes calling external URLs).

**Implementation:**

- `store/providers/query.provider.tsx`: QueryClient with staleTime=30s, retry=1, refetchOnWindowFocus=false.
- `services/http.services.ts`: `apiClient` (baseURL=app URL) and `externalClient` (no baseURL, crawler User-Agent).

**Trade-offs:**

- Bundle size (Axios ~13KB, TanStack Query ~15KB vs. native `fetch`/manual state).
- Justified by reduced boilerplate and improved reliability.

---

### shadcn/ui (not Material-UI/Chakra)

**Decision:** Use shadcn/ui components built on Radix UI primitives and styled with Tailwind CSS.

**Why:**

- **Source ownership:** Components are copied into `components/ui/` as source files (not `node_modules` packages), allowing full customization without ejecting or forking.
- **Accessibility built-in:** Radix UI provides WAI-ARIA-compliant primitives (dialogs, dropdowns, switches, etc.) out of the box.
- **Tailwind integration:** Components use utility classes for styling, keeping design system consistent and avoiding CSS-in-JS runtime.
- **Lightweight:** No theme provider overhead or large runtime like Material-UI; only includes components you use.
- **Modern UX:** "New York" style (components.json) provides a professional, elegant aesthetic aligned with contemporary SaaS apps.

**Trade-offs:**

- No pre-built complex components (e.g., data tables, date pickers); must compose from primitives or add libraries.
- Manual updates when shadcn releases new versions (acceptable for source ownership benefits).

---

### Phosphor Icons (not Lucide/Heroicons)

**Decision:** Use `@phosphor-icons/react` for all iconography with `Icon` suffix naming (e.g., `CaretDownIcon`).

**Why:**

- **Consistent design language:** Phosphor offers ~6k icons with uniform stroke/fill styles across weights (regular, bold, fill).
- **Weight flexibility:** Can adjust visual weight (regular for UI, bold for emphasis) without changing icons.
- **React-optimized:** Tree-shakable; only imports used icons.
- **No duotone:** Avoid duotone variants for consistent, professional appearance.

**Trade-offs:**

- Slightly larger bundle vs. Lucide (~500 icons); mitigated by tree-shaking.

---

## Directory Structure & Conventions

### Domain-Driven Folder Organization

**Decision:** Enforce top-level folders (`components/`, `services/`, `utils/`, `hooks/`, `types/`, `constants/`) with consistent naming conventions.

**Why:**

- **Separation of concerns:** Each folder has a clear role; easier to locate code (e.g., all API functions in `services/`, all reusable logic in `utils/`).
- **Scalability:** As features grow, new files fit into existing structure without creating ad-hoc nesting or naming chaos.
- **Team alignment:** Naming conventions (`.component.tsx`, `.services.ts`, `.utils.ts`, `.hook.ts`) signal file purpose at a glance.
- **Import clarity:** Path alias `@/*` keeps imports clean; e.g., `@/services/ai.services` vs. `../../../services/ai.services`.

**Guidelines:**

- JSX/TSX components target 200 lines with a 10% buffer (max ~220 lines); decompose into subcomponents or extract logic to hooks/utils when larger.
- TypeScript and other source files target 500 lines with a 10% buffer (max ~550 lines); split files when approaching the cap.
- Services = API-facing functions only (JSDoc required); helpers → utils.
- **Type naming conventions:**
  - **Interfaces (prefix `I`):** Use for object shapes with named properties (e.g., `IUser`, `IApiResponse`, `IDistributions`). Interfaces define the structure of concrete data.
  - **Types (prefix `T`):** Use for unions, discriminated unions, generics, mapped types, or type aliases that combine multiple shapes (e.g., `TResult<T, E> = { ok: true; value: T } | { ok: false; error: E }`). Never use `type` for simple object shapes—use `interface` instead.
  - **Enums (prefix `E`):** Use only as discriminators for unions or conditionals (e.g., `EAttemptStatus`, `EDifficulty`). Do not use for strings that belong in constants.
  - **Avoid:** Single-property interfaces (use inline `{ prop: type }` in function signatures); mixing `type` and `interface` for the same concept; T-prefixed aliases for object shapes.

**Trade-offs:**

- Slight verbosity in file names (`.component.tsx` vs. `.tsx`); justified by explicitness.

---

## Migrations & Schema

### Immutable Migration Files

**Decision:** Never modify existing migration files; always create new migrations for schema changes.

**Why:**

- **Reproducibility:** Migrations are a versioned history; altering past migrations breaks environments that already ran them.
- **Audit trail:** Each migration documents what changed and when (e.g., `003-Embeddings-1536-And-Hybrid.sql` shows dimension switch).
- **Rollback safety:** Can replay migrations in order to rebuild schema from scratch.
- **Team coordination:** Prevents merge conflicts and ensures all environments converge to the same schema state.

**Workflow:**

- Execute SQL manually (psql or Supabase CLI) for rapid iteration.
- Immediately create a new migration file capturing the exact statements applied.
- Migration naming: `NNN-Short-Descriptive-Title.sql` (e.g., `010-WebDev-Accessibility-Topics.sql`).

**Trade-offs:**

- Migration folder grows over time; periodic squashing in major versions (not done yet).

---

## Reliability & Safety

### Classifier-only + Preflight Validation

**Decision:** Classifier-only labeling with preflight dry-run sampling before full ingestion runs.

**Why (Reliability Hardening Context):**

- **Lessons learned:** React docs pilot runs showed many zero-result ingestions due to:
  - URL fragment duplicates (multiple catalog entries → same normalized path).
  - Intra-run races (32 parallel jobs writing same paths → unique constraint conflicts).
  - Generic subtopic fallback (e.g., "Learn" overshadowing explicit subtopics).
- **Preflight sampling:** Plan endpoints (`/api/ingest/web/plan`, `/api/ingest/repo/plan`) return label distribution, low-confidence rate, and anomalies for operator review before enqueuing.
- **Seed normalization:** Strip fragments/query, lowercase host, dedupe URLs in catalog runner to avoid duplicate ingestion jobs.
- **Preflight skip:** Check `documents(bucket, path)` existence before creating ingestion; mark catalog entry `embedded=true` without enqueuing.

**Trade-offs:**

- Extra latency for preflight checks; justified by preventing wasted runs and ensuring data quality.

---

### Idempotent Ingestion & Cursor-based Batching

**Decision:** Repo ingestion uses cursor-based batching (`metadata.batch`); documents upsert on `(bucket, path)`; chunks replaced per document.

**Why:**

- **Serverless timeout mitigation:** Process one batch (≤200 files) per API call; UI auto-advances batches without manual intervention.
- **Idempotency:** Upsert documents by unique `(bucket, path)` allows safe re-runs; replacing chunks per document prevents duplicates.
- **Resume-friendly:** If a batch fails, restart from `nextStart` cursor; no need to redo completed work.

**Trade-offs:**

- UI polling overhead (acceptable for admin-facing ingestion flows).

---

## MCQ Generation & Quality

### Structured Output + Repair Passes

**Decision:** Use OpenAI structured outputs (JSON schema) for MCQ generation; enforce coding-mode contract with repair passes.

**Why:**

- **Strict schema compliance:** `response_format: { type: "json_schema" }` ensures model returns all required fields (question, options, correctIndex, etc.).
- **Coding-mode enforcement:** When `codingMode=true`, schema requires `code` field; validation checks for 3–50 line fenced block; repair pass retries if missing.
- **Question-code separation:** Prevent model from repeating code block verbatim inside `question` text; enforce prose reference ("Given the code snippet below…").
- **Citation mandates:** Schema requires `citations` array; judge rejects MCQs without source links.

**Trade-offs:**

- Two-pass generation (main + repair) increases latency and cost but ensures quality.

---

### Deduplication: Content-Key + Neighbor-Aware Judge

**Decision:** Use normalized content-key (question gist hash) for exact dedupe; neighbor-aware judge for near-duplicate detection.

**Why:**

- **Save-time deduplication:** Unique constraint on `content_key` (migration 007) prevents identical questions from being saved (409 Conflict).
- **Neighbor retrieval:** `retrieval_mcq_neighbors` RPC (pgvector) finds semantically similar MCQs; judge evaluates candidate against neighbors and requests revision on high similarity.
- **Negative examples:** Generator receives recent saved MCQs as negative examples in prompt to steer away from repeats.

**Implementation:**

- `utils/mcq.utils.ts`: `buildMcqEmbeddingText` normalizes question to gist; `contentKeyHash` computes SHA-256.
- `services/ai.services.ts` (`judgeMcqQuality`): Receives `neighbors` array and prompts judge to assess duplication risk.

**Trade-offs:**

- Neighbor search adds latency (~100ms per retrieval); justified by avoiding low-quality duplicates.

---

### Bank Selection with Neighbor Similarity

**Decision:** Apply neighbor similarity checking to bank question selection to prevent similar questions from being selected in the same attempt.

**Why:**

- **Prevents question repetition:** Similar questions (Q46 and Q49) can occur when bank selection doesn't consider similarity to already-asked questions.
- **Dual similarity checks:**
  - **Attempt-level similarity:** Compare candidate embeddings against questions already asked in current attempt using cosine similarity.
  - **Cross-attempt similarity:** Use `retrieval_mcq_neighbors` RPC to find similar questions from other attempts.
- **Configurable penalties:** Different penalty levels for high (≥0.92) and medium (≥0.85) similarity thresholds.
- **Graceful degradation:** Similarity checks are wrapped in try-catch to prevent bank selection failures.

**Implementation:**

- **Similarity thresholds:** `BANK_SIMILARITY_THRESHOLD_HIGH` (0.92), `BANK_SIMILARITY_THRESHOLD_MEDIUM` (0.85)
- **Penalty system:** High similarity gets 50pt penalty, medium gets 25pt penalty for attempt similarity; neighbor similarity gets 30pt/15pt penalties.
- **Logging:** Comprehensive metrics for similarity scores, gate hits, and penalty application.
- **Performance:** Parallel similarity checks using `Promise.all` for all candidates.

**Trade-offs:**

- **Latency increase:** Each candidate requires embedding comparison and neighbor retrieval (~100-200ms per candidate).
- **Database load:** Additional RPC calls to `retrieval_mcq_neighbors` for each candidate.
- **Complexity:** More sophisticated scoring logic with multiple similarity dimensions.

---

## Static Ontology Configuration

- The evaluation feature loads topics, subtopics, and topic weighting from `data/static-ontology.json` using `utils/static-ontology.utils.ts`.
- This replaces LLM-driven generation for ontology, archetype, and weight data to ensure deterministic behavior.
- Maintenance workflow: update the JSON file when topics or weights change and redeploy.

---

## Constants & Enums Pattern

### One Source of Truth for Strings

**Decision:** Organize all string constants (UI labels, error messages, configuration values) and enums into strongly-typed, single-location definitions using two complementary patterns.

**Pattern Summary:**

1. **Enums (in `types/*.ts`):** Use **only** for discriminators and compile-time type safety

   - Examples: `EAttemptStatus = "pending" | "completed"`, `EIngestionMode = "repo" | "web"`, `EButtonVariants = "primary" | "secondary"`
   - These are values used in conditionals, type guards, or discriminated unions

2. **Constants (in `constants/*.ts`):** Use grouped objects with `as const` for everything else
   - UI labels, copy, and text: `COMMON_LABELS = { LOADING: "Loading..." }`
   - Configuration values and limits: `OPENAI_CONFIG = { CHAT_MODEL: "gpt-4o-mini", ... }`
   - API error messages: `AI_SERVICE_ERRORS = { MISSING_API_KEY: "...", ... }`
   - Related grouped strings: `MCQ_PROMPTS = { GENERATOR_SYSTEM_INTRO: "...", ... }`

**Why:**

- **No duplication:** Each string value exists in exactly one location; prevents "source of truth" ambiguity.
- **Type safety:** Grouped constants with `as const` provide compile-time checking while being more flexible than enums.
- **Maintainability:** Related strings grouped logically make updates easier and faster.
- **Scalability:** Pattern is easy to extend as new domains/features are added; naming conventions keep everything consistent.
- **Readability:** `MCQ_PROMPTS.GENERATOR_SYSTEM_INTRO` vs `EMcqPromptTemplates.GENERATOR_SYSTEM_INTRO` is clearer and more concise.

**Forbidden Patterns:**

- ❌ Enum + corresponding object constant with identical values (e.g., `EMcqPromptTemplates` enum + `MCQ_PROMPT_TEMPLATES` object)
- ❌ Individual exported string constants (e.g., `THEME_LIGHT_MODE_LABEL`, `THEME_DARK_MODE_LABEL`; use `THEME_CONFIG = { LABELS: { LIGHT_MODE, DARK_MODE } }`)
- ❌ Label/text enums (e.g., `ECommonLabels`, `EFormLabels`); these should be constants instead

**Implementation:**

- **File organization:** Constants and types by domain (navigation, theme, generation, ingestion, evaluation, etc.)
  - `types/evaluation.types.ts` → discriminator enums like `EAttemptStatus`, `EDifficulty`
  - `constants/evaluation.constants.ts` → grouped constants like `EVALUATION_CONFIG`, `RESULT_TIER_CONFIGS`, `STAT_CARD_LABELS`
- **Naming conventions:**
  - Enums: Prefix `E` (e.g., `EAttemptStatus`), SCREAMING_SNAKE_CASE values
  - Constants: SCREAMING_SNAKE_CASE names, organized in logical groupings
  - Objects: Use nested structure for related items (e.g., `{ LABELS: {...}, VALUES: {...} }`)
- **Backward compatibility:** When refactoring existing patterns, maintain backward-compatible exports pointing to the grouped constant (e.g., `export const THEME_LIGHT_MODE_LABEL = THEME_CONFIG.LABELS.LIGHT_MODE`)

**Trade-offs:**

- Slightly more nesting when accessing deeply grouped constants; mitigated by auto-complete and clear naming.
- Requires discipline to follow conventions; documented in Cursor rules and enforced during code review.

---

## When to Update This Document

Add new entries when:

- Introducing a new technology, framework, or library.
- Making a significant architectural pivot (e.g., switching from heuristics to classifier).
- Choosing between alternatives with non-obvious trade-offs.
- Addressing reliability/scalability issues with a new pattern.

Keep entries concise (1–3 paragraphs); reference migrations, code files, or work-items for details.
