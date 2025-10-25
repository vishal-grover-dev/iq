> Note: After creating any new file (or moving/deleting one), update this document to keep the index current.

### Root

- `package.json`: Project metadata, scripts, and dependencies.
- `pnpm-lock.yaml`: Exact dependency lockfile for reproducible installs.
- `next.config.ts`: Next.js configuration.
- `tsconfig.json`: TypeScript config with path alias `@/*`.
- `eslint.config.mjs`: ESLint flat config (Next + TypeScript rules).
- `postcss.config.mjs`: PostCSS config loading Tailwind plugin.
- `components.json`: shadcn/ui generator config and path aliases.
- `next-env.d.ts`: Next.js type references (auto-generated; do not edit).
- `README.md`: Starter documentation for running and deploying the app.
- `.cursorrules`: Cursor rules to always consult `specs/` docs before answering/implementing tasks.
- `playwright.config.ts`: Playwright configuration (webServer runs Next dev; Chromium + mobile profiles).
- `scripts/db.sh`: Helper to run psql queries/files against Supabase pooler URL in `supabase/.temp/pooler-url`.

### specs/blueprints

- `directory-structure.md`: Enforced directory and naming conventions.
- `tech-stack.md`: Tech stack and architecture overview.
- `prd.md`: Product requirements document.
- `architecture-decisions.md`: "Why" behind key technical decisions, trade-offs, and constraints.
- `existing-files.md`: This index of current files.
- `env-examples.md`: Example environment variables and configuration.
- `resources-for-frontend.md`: Topics, subtopics, and ingestion sources for React-focused frontend content.

### app

- `globals.css`: Global styles and Tailwind layers.
- `layout.tsx`: Root HTML layout; initializes theme and wraps `ThemeProvider` + `Header`.
- `page.tsx`: Home page route rendering a simple placeholder.
- `not-found.tsx`: 404 error page with return home link.
- `upload/page.tsx`: Upload page route rendering the upload form flow.
- `evaluate/page.tsx`: Evaluate landing page with start/resume flow, progress display, and past attempts summary.
- `evaluate/[attemptId]/page.tsx`: In-progress evaluation page with question display, answer submission, and pause/resume.
- `evaluate/[attemptId]/results/page.tsx`: Post-attempt results page with summary, performance breakdowns, weak areas, and complete question review with feedback.

### components/common

- `header.component.tsx`: Application header with brand link, navigation menu (Upload, Generate, Evaluate), and theme toggle. Includes active state detection using `usePathname` hook.
- `logo.component.tsx`: Logo component using `next/image` for `/logo.svg`.
- `themeToggle.component.tsx`: Theme toggle with sun/moon icons using Switch component.
- `loader.component.tsx`: Full-page Lottie loader used for async/processing states.
- `footer.component.tsx`: Application footer with brand and navigation links.

### components/ui

- `button.tsx`: shadcn/ui `Button` component.
- `dropdown-menu.tsx`: shadcn/ui `DropdownMenu` primitives and styling.
- `form.tsx`: shadcn/ui `Form` helpers (wrappers for `react-hook-form`).
- `input.tsx`: shadcn/ui `Input` component.
- `label.tsx`: shadcn/ui `Label` component.
- `select.tsx`: shadcn/ui `Select` primitives and styling.
- `switch.tsx`: Radix-based `Switch` component styled to shadcn/ui conventions.
- `command.tsx`: shadcn/ui `Command` (command palette) primitives and styling.
- `dialog.tsx`: shadcn/ui `Dialog` primitives and styling.
- `navigation-menu.tsx`: shadcn/ui `NavigationMenu` primitives and styling.
- `popover.tsx`: shadcn/ui `Popover` primitives and styling.
- `combobox.tsx`: Reusable combobox built with `Popover` + `Command` and Phosphor icons.
- `sonner.tsx`: shadcn/ui `Toaster` wrapper integrating theme-aware Sonner notifications.
- `error-message.tsx`: Reusable error message component for forms and UI states.
- `file-dropzone.tsx`: Reusable dropzone wrapper for file uploads built on react-dropzone.
- `form-label.tsx`: Reusable label component that displays red asterisk for required form fields.
- `toggle-group.tsx`: Radix Toggle Group primitives styled as pill segmented controls.

### components/upload

- `uploadForm.component.tsx`: Upload form component using shadcn/ui inputs and validation.
- `interviewSection.component.tsx`: Subcomponent rendering Interview Streams rows and modal. Depth selector supports 0-4 for web crawls and leverages `useInterviewPlanner`, `InterviewRow`, and shared modals.
- `interviewRow.component.tsx`: Single row form (topic, subtopic, ingest type, depth, URL).
- `interviewModals.component.tsx`: Consolidated modal subcomponents (PlanModal for planning summary, CustomSubtopicModal for custom subtopic input).
  - `completionModal.component.tsx`: Reusable modal displayed after indexing completes with coverage summary (no generation action).

### components/evaluate

- `questionCard.component.tsx`: MCQ question card with syntax highlighting, option selection, and keyboard shortcuts. Supports evaluation mode (interactive) and review mode (read-only with feedback). ~190 lines.
- `codeBlock.component.tsx`: Reusable code block component with syntax highlighting via Prism. Handles markdown rendering with fenced code blocks. ~75 lines.
- `optionButton.component.tsx`: Single MCQ option button with evaluation/review mode styling, correctness indicators, and keyboard accessibility. ~95 lines.
- `resultsChart.component.tsx`: Performance breakdown visualization as table/list showing category, correct/total, and accuracy. Reusable for topic/subtopic/Bloom breakdowns. ~30 lines. (Replaced by PerformanceBarChart for main results display)
- `scoreGauge.component.tsx`: Radial gauge chart showing overall score (0-100%) with color-coded tiers using Recharts RadialBarChart. Mobile-responsive with centered score display. ~55 lines.
- `performanceBarChart.component.tsx`: Animated horizontal bar chart for topic/Bloom/difficulty breakdowns using Recharts with motion-aware container.
- `resultsHero.component.tsx`: Animated hero section for the results page using `useResultsTier`, `ConfettiOverlay`, and `ResultStatCard` components.
- `confettiOverlay.component.tsx`: Reusable confetti animation subcomponent with reduced-motion support.
- `resultStatCard.component.tsx`: Individual stat card for results with tone-based styling (positive, neutral, attention).
- `weakAreasPanel.component.tsx`: Animated card grid highlighting prioritized weak areas with tone badges, accuracy metrics, and deep-dive links.
- `questionReviewList.component.tsx`: Enhanced review list with search, grouping, sorting toggles, and animated question cards using `useQuestionReviewFiltering` and `ReviewFilterBar`.
- `reviewFilterBar.component.tsx`: Consolidated filter UI component with search, topic select, incorrect-only toggle, sort, and group controls.

### hooks

- `useTheme.hook.ts`: Custom hook for accessing theme context and state management.
- `useInterviewIngestion.hook.ts`: Hook to create, process, and poll repo/web ingestions and return coverage.
- `useInterviewPlanner.hook.ts`: Hook consolidating interview planning state (planning, modals, async handlers).
- `useResultsTier.hook.ts`: Hook extracting tier detection logic for results hero (getTierFromScore, tierConfig, showConfetti).
- `useQuestionReviewFiltering.hook.ts`: Hook consolidating question review filtering state (filter, sort, group, lazy-load).

### public

- `logo.svg`: Vector logo asset.
- `logo.png`: Raster logo asset.
- `animations/girl-with-book.json`: Lottie animation used by the loader component.
- `diagrams/iq-ingestion-architecture.mmd`: Mermaid architecture diagram for Interview Ingestion & Retrieval v1.

### store/providers

- `theme.provider.tsx`: Theme context/provider; persists to localStorage with dark mode as default.
- `query.provider.tsx`: React Query provider with sensible defaults.

### types

- `app.types.ts`: Application-wide TypeScript types including `ETheme`, `TResolvedTheme`, `IThemeContextValue`, animation enums, and **Phase 1 additions: `IApiResponse<T>`, `IPaginated<T>`, `TResult<T, E>`, `TDomainError`** for standardized API responses and error handling across services.
- `upload.types.ts`: Types for the upload flow. Includes Interview Streams types and `TUploadState`. Academic types removed. `IInterviewIngestItem.depth` supports 0-4. **Phase 3: Added `TPlanData` and `TWebPlanData` types for planning.**
- `ingest.types.ts`: Ingestion request/response, embedding types, and chunk types.
- `mcq.types.ts`: MCQ view models, difficulty enum, Bloom enum, and revision interfaces including TReviserBuildArgs.
- `interview-streams.types.ts`: Interfaces for catalog items, catalog map, run results, and logger.
- `evaluate.types.ts`: Types for evaluation feature including attempt status, questions, results, analytics, and LLM selector interfaces. **Phase 4: Enhanced with T-prefixed types (`TDistributions`, `TCandidateWithSimilarity`, `TSimilarityMetrics`, `TSelectionCriteria`, `TQuestionAssignmentResult`, `TScoredCandidate`) and E-prefixed enums (`ESelectionMethod`, `ESimilarityGate`).**

### schema

- `upload.schema.ts`: Zod schema and validation for the upload flow.
- `ingest.schema.ts`: Zod schema for ingestion API request/response.
- `mcqRetrieval.schema.ts`: Combined schemas for retrieval requests/responses and enhancement.

### utils

- `tailwind.utils.ts`: `cn` helper combining `clsx` with `tailwind-merge`.
- `upload.utils.ts`: Upload helpers (slugify, timestamped filenames). Academic path builder deprecated.
- `langchain.utils.ts`: Combined PDF extraction and text chunking (LangChain-based).
- `ingest.utils.ts`: Chapter extraction helpers from filenames and document text.
- `repo.utils.ts`: GitHub repo Markdown fetch/list helpers for doc ingestion.
- `web-crawler.utils.ts`: Simple crawler respecting robots.txt with domain/prefix limits.
- `intelligent-web-adapter.utils.ts`: Universal intelligent web crawling helpers for content extraction and quality checks (URL heuristics for labels removed; classifier-only).
- `interview-streams.utils.ts`: Interview Streams catalog runner (`runCatalogIngestion`) with concurrency and logging. Phase 4: In-place delegation to existing utilities (uses `utils/url.utils.ts` for normalization; removed local normalizer helper).
- `label-resolver.utils.ts`: Classifier-only resolver using OpenAI with whitelist ontology, URL/path caching, hints precedence, and metrics.
- `vector.utils.ts`: Vector utilities for converting embeddings and computing cosine similarity (`toNumericVector`, `cosineSimilarity`). **Phase 1 modularization.**
- `catalog.utils.ts`: Catalog management helpers for loading ingestion catalog and deriving subtopics (`loadIngestCatalog`, `getSubtopicsFromCatalog`). **Phase 1 modularization.**
- `ingest-preflight.utils.ts`: Preflight validation utilities for marking completed ingestions and preventing duplicates (`persistEmbeddedFlags`). **Phase 1 modularization.**
- `mcq-retrieval.utils.ts`: MCQ retrieval helpers for context, neighbors, and recent questions (`retrieveContextByLabels`, `retrieveNeighbors`, `getRecentQuestions`). **Phase 1 modularization.**

- `evaluate-attempt-guard.utils.ts`: Attempt validation and fetching utilities (`fetchAttemptOrFail`, `checkCompletionStatus`, `findExistingPendingQuestion`, `validateAttemptQuestions`). Handles auth, completion checks, and race condition detection. **Phase 4: Evaluate route modularization.**
- `evaluate-context-builder.utils.ts`: Distribution and context building utilities (`calculateDistributions`, `buildSelectionContext`, `identifyOverrepresentedTopics`, `fetchRecentAttemptQuestions`). Stage-aware topic balancing and cross-attempt freshness tracking. **Phase 4: Evaluate route modularization.**
- `evaluate-candidate-scorer.utils.ts`: Candidate similarity checking and scoring utilities (`applyNeighborSimilarityChecks`, `scoreCandidate`, `selectTopKWithWeights`). Parallel embedding checks with preference-based scoring and stochastic selection. **Phase 4: Evaluate route modularization.**
- `evaluate-assignment-executor.utils.ts`: Question assignment and generation utilities (`assignQuestionWithRetry`, `persistGeneratedMcq`, `ensureQuestionAssigned`, `generateMcqFallback`). Exponential backoff retry, MCQ persistence with duplicate handling, and fallback generation with 3 retry attempts. **Phase 4: Evaluate route modularization.**

- `json.utils.ts`: Safe JSON parsing helper for strict LLM JSON responses.
- `mcq-prompt.utils.ts`: Prompt builders for MCQ Generator, Judge, and Reviser (few-shot and chain-of-thought ready) with curated examples.
- `mcq.utils.ts`: Helpers for MCQ embeddings text build and content-key hashing.
- `animation.utils.ts`: Imports and re-exports animation enums from `app.types.ts`, provides `usePrefersReducedMotion` hook, and pre-built Framer Motion variants for question transitions, stagger lists, and results orchestration with reduced-motion fallbacks.
- `static-ontology.utils.ts`: Loads statically defined topics, subtopics, and weights from JSON.
- `selection.utils.ts`: Weighted random utilities for selection (`weightedRandomIndex`, `weightedRandomSelect`, `calculateCoverageWeights`).
- `url.utils.ts`: URL manipulation utilities (normalize, extract domain).
- `ingest-planner.utils.ts`: Interview Streams planner helpers for depth + type combinations and path derivation.
- `ingest-web-process.utils.ts`: Web ingestion processing helpers (filtering, assessment, chunking, embedding).

#### Nested: utils/mcq-prompts

- `index.ts`: Re-export barrel for all prompt builders (optional).
- `shared.utils.ts`: Shared prompt formatting helpers (context lines, negative examples, neighbors formatting).
- `generator-prompt.utils.ts`: MCQ generation prompt builder with few-shot and chain-of-thought support.
- `reviser-prompt.utils.ts`: MCQ revision workflow prompt builder.
- `judge-prompt.utils.ts`: MCQ quality judgment prompt builder.
- `selector-prompt.utils.ts`: LLM-driven question selection prompt builder.

### config

- `supabase.config.ts`: Supabase client configuration and factory functions. Exports: `getSupabaseBrowserClient()`, `getSupabaseServiceRoleClient()`, `createSupabaseClientWithKey()`. Used by both client and server contexts. **Phase 1: Moved from services/supabase.services.ts.**
- `openai.config.ts`: OpenAI client configuration and error utilities. Exports: `createOpenAIClient()`, `getErrorStatus()`, `getErrorMessage()`. Server-only configuration used by AI services. **Phase 1: Moved from services/openai.services.ts.**

### services

#### Core Services & Shared Utilities

- `supabase.services.ts`: **DEPRECATED** - Moved to `config/supabase.config.ts` in Phase 1.
- `openai.services.ts`: **DEPRECATED** - Moved to `config/openai.config.ts` in Phase 1.
- `ingest.services.ts`: Client helper to call ingestion API.
- `http.services.ts`: Axios clients with interceptors (API only).
- `mcq.services.ts`: MCQ API client functions, retrieval client functions, and hooks.
- `evaluate.services.ts`: Evaluation API client functions and TanStack Query hooks for attempts, questions, answers, and results.

#### Server Services (Phase 2 Migration)

- `server/embedding.service.ts`: **Consolidated** embeddings + reranking operations (~110 lines). Exports: `getEmbeddings()` (1536-d text-embedding-3-small with batching), `rerank()` (LLM-as-reranker). **Phase 2: Moved from services/ai/.**
- `server/mcq-generation.service.ts`: MCQ generation from context with schema validation and repair passes. Exports: `generateMcqFromContext()`. (~380 lines) **Phase 2: Moved from services/ai/.**
- `server/mcq-refinement.service.ts`: **Consolidated** post-generation refinement pipeline (~160 lines). Exports: `reviseMcqWithContext()` (user-guided revision), `judgeMcqQuality()` (quality verdict with suggestions). **Phase 2: Moved from services/ai/.**
- `server/labeling.service.ts`: Label classification using OpenAI with whitelist ontology. Exports: `classifyLabels()`. (~70 lines) **Phase 2: Moved from services/ai/.**
- `server/question-selector.service.ts`: LLM-driven question selection for evaluations. Exports: `selectNextQuestion()`. (~130 lines) **Phase 2: Moved from services/ai/.**
- `server/crawl-heuristics.service.ts`: Web crawl heuristics and utilities. **Phase 2: Moved from services/ai/.**
- `server/source-fetcher.service.ts`: GitHub repo utilities and web crawling functions. **Phase 2: Moved from services/root.**
- `server/source-intelligence.service.ts`: Content extraction and quality assessment utilities. **Phase 2: Moved from services/root.**

#### Evaluate Selection (Phase 4 Refactor)

- `evaluate-selection.service.ts`: Orchestrator service for question selection pipeline. Exports: `selectNextQuestionForAttempt()` with comprehensive JSDoc and 5-stage pipeline (Guard → Context → Bank Query → Scoring → Assignment) handling race conditions, generation fallback, and emergency fallback assignment. (~445 lines)

### constants

- `app.constants.ts`: Application constants from environment variables.
- `interview-streams.constants.ts`: Shared interview streams constants (topics/subtopics/options) used by utils and client.
- `ui.constants.ts`: Consolidated UI-related constants including theme labels/config (THEME_CONFIG), footer content (FOOTER_CONFIG), and common UI labels (COMMON_LABELS, FORM_LABELS, STATUS_LABELS, ACCESSIBILITY_LABELS). Replaces separate theme.constants.ts and footer.constants.ts.
- `api.constants.ts`: Centralized API infrastructure constants including HTTP_STATUS_CODES, API_ERROR_MESSAGES, API_RESPONSE_KEYS, CONTENT_TYPES, and VALIDATION_ERRORS. Shared across all API routes and services.
- `evaluate.constants.ts`: Question selection configuration with similarity thresholds, penalties, topic balance limits, candidate scoring boosts, generation retry config, and assignment retry settings.

### data

- `interview-ingest-catalog.json`: Catalog of topics → subtopic ingestion entries.
- `label-rules.json`: Config-driven rules mapping.
- `static-ontology.json`: Hard-coded topics, subtopics, and topic weightings for the evaluation feature.

### scripts

- `scripts/run-catalog.ts`: CLI to run catalog-driven ingestion with structured logs. Usage: `pnpm run:catalog [--topic=React] [--concurrency=4]`.
- `scripts/generate-ontology.ts`: **Optional** pre-warming script to generate `data/ontology-cache.json` before deployment. Usage: `pnpm generate:ontology`. Not required for runtime—system auto-generates on first request if cache is missing.

### specs/work-items

- `interview-ingestion-and-retrieval.md`: Consolidated work-item for Interview Streams ingestion (repo/web), indexing, status, and retrieval. Includes complete coverage expansion history: initial ingestion (264 docs, 8 topics) → React expansion (551 docs, 10 topics). Documents State Management (Redux Toolkit: 87 docs, 676 chunks) and Routing (React Router: 200 docs, 744 chunks) additions from 2025-09-30. Generation is removed and will be redesigned separately.
- `generation-of-questions.md`: Work-item for the MCQ Generation page, personas, streaming, revision chat, and save flow to `mcq_items`.
- `evaluate-page.md`: Requirements for the Frontend Skills Assessment page featuring 60-question structured evaluations with adaptive selection, multi-session attempts, real-time feedback, and comprehensive post-attempt analytics with weak-area identification.

### migrations

- `001-Storage-Academics-RLS-02-Sep-25.sql`: Creates `academics` bucket if missing; adds RLS policies (public read, authenticated insert/update/delete).
- `002-Ingestions-And-Embeddings.sql`: Creates ingestion, documents, and document_chunks tables with RLS and pgvector.
- `003-Embeddings-1536-And-Hybrid.sql`: Switches to 1536-d embeddings and adds hybrid retrieval RPC and FTS index.
- `004-MCQ-And-Label-Retrieval.sql`: Creates MCQ tables and adds label-based retrieval RPC `retrieval_hybrid_by_labels`.
- `005-Ingestion-Events.sql`: Adds `ingestion_events` table with RLS and indexes for step-level observability.
- `006-Documents-Unique-Bucket-Path.sql`: Adds unique index on `documents(bucket, path)` to prevent duplicate URLs.
- `007-MCQ-Embeddings-And-Dedupe.sql`: Adds MCQ embeddings + content_key, ANN index, and `retrieval_mcq_neighbors` RPC for near-duplicate detection.
- `008-MCQ-Code-Column.sql`: Adds nullable `code` column to `mcq_items` for dedicated code snippets.
- `009-WebDev-Topics-Fix.sql`: Backfill to correct `documents` and `document_chunks` topics for web.dev/learn to HTML/CSS/PWA.
- `010-WebDev-Accessibility-Topics.sql`: Backfill to correct web.dev/learn accessibility topics.
- `011-Fix-React-Hook-Labels.sql`: Corrects useMemo and useCallback docs mislabeled as "Hooks: useState" (2 docs, 33 chunks).
- `012-User-Attempts-And-Questions.sql`: Creates `user_attempts` and `attempt_questions` tables with RLS for evaluation feature.

### app/api

- `api/ingest/repo/route.ts`: Ingestion API route (POST) for repo-based docs (React/JS/TS/HTML/CSS).
- `api/ingest/web/route.ts`: Ingestion API route (POST) for web crawling (sitemap-limited, small scale).
- `api/ingest/web/plan/route.ts`: Dry-run planning endpoint to preview crawl scope.
- `api/ingest/repo/plan/route.ts`: Planning endpoint to count repo files and propose batch slices (repo mode).
- `api/ingest/[id]/route.ts`: Ingestion status route (GET) by id.
- `api/retrieval/query/route.ts`: Retrieval API route (POST) computing 1536-d query embeddings, calling hybrid RPC, with optional rerank.
- `api/retrieval/enhance-query/route.ts`: Query enhancement API route (POST) stub.
- `api/generate/mcq/route.ts`: Placeholder route for MCQ generation (SSE scaffold).
- `api/generate/mcq/revise/route.ts`: MCQ revision API route (POST) that applies user instructions to revise existing MCQs with AI-powered context-aware revisions.
- `api/generate/mcq/save/route.ts`: Placeholder route for saving finalized MCQs.
- `api/evaluate/attempts/route.ts`: Evaluation attempts routes (GET lists attempts, POST creates new attempt).
- `api/evaluate/attempts/[id]/route.ts`: Single attempt routes (GET fetches details with LLM-selected next question, PATCH pauses attempt).
- `api/evaluate/attempts/[id]/answer/route.ts`: Answer submission route (POST) records answer silently without revealing correctness.
- `api/evaluate/attempts/[id]/results/route.ts`: Results route (GET) provides post-attempt analytics, breakdowns, weak areas, and complete question review with feedback.
- `api/ontology/status/route.ts`: Admin endpoint returning ontology cache source, age, staleness, and topic/subtopic counts.
- `api/ontology/route.ts`: Provides ontology cache payload (topics, subtopics, chunk counts, optional archetypes, target weights) with cache metadata.

### tests (Playwright)

- `tests/visual.spec.ts`: Visual regression tests for `/` and `/upload` across desktop/mobile.
- `tests/a11y.spec.ts`: Non-blocking axe-core accessibility smoke checks for key routes.
- `components/generate/mcqCard.component.tsx`: MCQ card component (question, options, citations, metadata chips).
- `components/generate/personaPanel.component.tsx`: Persona progress panel component.
- `components/generate/revisionBox.component.tsx`: Revision chat input component with loading states and revision history integration.
- `components/generate/automationModal.component.tsx`: Modal for automation controls and coverage placeholder.
- `services/mcq.services.ts`: MCQ API client functions and SSE opener.

Updates:

- `api/ingest/web/plan/route.ts`: Added `returnAllPages` and `applyQuotas` flags; response includes `aiUsed`. MDN-specific sections removed; source-agnostic.
- `api/ingest/web/process/route.ts`: Simplified selection to source-agnostic cap by `maxPages`; removed MDN-specific quotas.
- `specs/work-items`: Merged `ingestion-reliability-hardening.md` into `interview-ingestion-and-retrieval.md`; removed the former.
- `api/generate/mcq/revise/route.ts`: Implemented full revision functionality with AI-powered MCQ revision, context retrieval, and change feedback.
- `services/ai.services.ts`: Added `reviseMcqWithContext` function for AI-powered MCQ revisions with fallback mechanisms.
- `utils/mcq-prompt.utils.ts`: Added `buildReviserMessages` function for constructing revision prompts.
- `types/mcq.types.ts`: Added `TReviserBuildArgs` interface for revision functionality.
- `app/generate/mcq/page.tsx`: Enhanced with revision history tracking, TanStack Query integration, and revision feedback system.
- `components/generate/revisionBox.component.tsx`: Updated with loading states and revision history integration.
- **2025-10-03 - Lazy-Loading Ontology System**:
  - `utils/ontology.utils.ts`: Replaced manual script-based generation with automatic LLM-powered lazy-loading. Multi-tier caching (memory → file → auto-generate). Mutex-protected generation prevents duplicate LLM calls. Background refresh for stale cache.
  - `utils/interview-weights.utils.ts`: Converted to async functions calling `getTargetWeights()` from ontology system. Target weights now LLM-generated on demand instead of hardcoded.
  - Deleted `data/interview-target-weights.json` (replaced by LLM generation in ontology cache).
  - `README.md`: Added ontology system documentation.
  - `scripts/generate-ontology.ts`: Now optional pre-warming script; not required for runtime.
- **2025-10-XX - Phase 4: Evaluate Route Refactoring (COMPLETED)**:
  - Created `constants/evaluate.constants.ts`: Consolidated similarity thresholds, penalties, topic balance, generation config, and assignment retry settings.
  - Enhanced `types/evaluate.types.ts`: Added 7 new types/enums (T/E prefixes) for distributions, candidates, similarity metrics, and selection criteria.
  - Created 4 utility modules in `utils/`: `evaluate-attempt-guard.utils.ts`, `evaluate-context-builder.utils.ts`, `evaluate-candidate-scorer.utils.ts`, `evaluate-assignment-executor.utils.ts` (85-345 lines each).
  - Created `services/evaluate-selection.service.ts`: Orchestrator service with 5-stage pipeline and comprehensive JSDoc (~445 lines).
  - Refactored `app/api/evaluate/attempts/[id]/route.ts`: Reduced from 1,395 to 90 lines; GET handler now 30 lines calling orchestrator.
  - Build status: ✓ Compiled in 4.1s; zero new linting errors; full backward compatibility.

#### services/ai (Phase 2 Refactor)

- `services/ai/openai.services.ts`: Shared OpenAI client instantiation and error utilities (`createOpenAIClient`, `getErrorStatus`, `getErrorMessage`)
- `services/ai/embeddings.service.ts`: `getEmbeddings()` for 1536-d embeddings with batching, retry, and truncation
- `services/ai/reranker.service.ts`: `rerank()` LLM-as-reranker using gpt-4o-mini
- `services/ai/labeling.service.ts`: `classifyLabels()` strict classifier with whitelist ontology
- `services/ai/mcq-generation.service.ts`: `generateMcqFromContext()` with schema validation and repair passes
- `services/ai/mcq-revision.service.ts`: `reviseMcqWithContext()` for user-requested MCQ changes
- `services/ai/mcq-judge.service.ts`: `judgeMcqQuality()` quality assessment with duplicate risk
- `services/ai/question-selector.service.ts`: `selectNextQuestion()` LLM-driven selector for evaluations

#### utils/mcq-prompts (Phase 2 Refactor)

- `utils/mcq-prompts/shared.utils.ts`: Common formatting helpers (contextLines, examples, labels, neighbors)
- `utils/mcq-prompts/generator-prompt.utils.ts`: `buildGeneratorMessages()` with few-shot/chain-of-thought modes
- `utils/mcq-prompts/reviser-prompt.utils.ts`: `buildReviserMessages()` for MCQ revision
- `utils/mcq-prompts/judge-prompt.utils.ts`: `buildJudgeMessages()` for quality judgment
- `utils/mcq-prompts/selector-prompt.utils.ts`: `generateQuestionPrompt()` for LLM-driven selection

#### MCQ Orchestration (Phase 4 API Route Modularization)

- `mcq-orchestration.service.ts`: **NEW** Orchestrator for SSE-based MCQ generation pipeline. Exports: `orchestrateMcqGenerationSSE()` implementing 6-stage pipeline (Initialize → Retrieve Context → Generate Draft → Fetch Neighbors → Judge Quality → Finalize). (~175 lines) Preserves identical SSE event order and payload shapes consumed by `app/generate/mcq/page.tsx`. **Phase 4: API route modularization.**
