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

### components/common

- `header.component.tsx`: Application header with brand link and theme toggle.
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

### components/upload

- `uploadForm.component.tsx`: Upload form component using shadcn/ui inputs and validation.
- `interviewSection.component.tsx`: Subcomponent rendering Interview Streams rows and modal. Depth selector supports 0-4 for web crawls.
  - `completionModal.component.tsx`: Reusable modal displayed after indexing completes with coverage summary (no generation action).

### hooks

- `useTheme.hook.ts`: Custom hook for accessing theme context and state management.
 - `useInterviewIngestion.hook.ts`: Hook to create, process, and poll repo/web ingestions and return coverage.

### public

- `logo.svg`: Vector logo asset.
- `logo.png`: Raster logo asset.
 - `animations/girl-with-book.json`: Lottie animation used by the loader component.
 - `diagrams/iq-ingestion-architecture.mmd`: Mermaid architecture diagram for Interview Ingestion & Retrieval v1.

### store/providers

- `theme.provider.tsx`: Theme context/provider; persists to localStorage with dark mode as default.
- `query.provider.tsx`: React Query provider with sensible defaults.

### types

- `app.types.ts`: Application-wide TypeScript types including `ETheme`, `TResolvedTheme`, `IThemeContextValue`.
- `upload.types.ts`: Types for the upload flow. Includes Interview Streams types and `TUploadState`. Academic types removed. `IInterviewIngestItem.depth` supports 0-4.
- `ingest.types.ts`: Ingestion request/response, embedding types, and chunk types.
- `mcq.types.ts`: MCQ view models, difficulty enum, Bloom enum, and revision interfaces including TReviserBuildArgs.
- `interview-streams.types.ts`: Interfaces for catalog items, catalog map, run results, and logger.

### schema

- `upload.schema.ts`: Zod schema and validation for the upload flow.
- `ingest.schema.ts`: Zod schema for ingestion API request/response.
- `mcqRetrieval.schema.ts`: Combined schemas for retrieval requests/responses and enhancement.

### utils

- `tailwind.utils.ts`: `cn` helper combining `clsx` with `tailwind-merge`.
- `supabase.utils.ts`: Supabase client helpers (browser anon + server service role).
- `upload.utils.ts`: Upload helpers (slugify, timestamped filenames). Academic path builder deprecated.
- `langchain.utils.ts`: Combined PDF extraction and text chunking (LangChain-based).
 - `ingest.utils.ts`: Chapter extraction helpers from filenames and document text.
 - `repo.utils.ts`: GitHub repo Markdown fetch/list helpers for doc ingestion.
 - `web-crawler.utils.ts`: Simple crawler respecting robots.txt with domain/prefix limits.
 - `intelligent-web-adapter.utils.ts`: Universal intelligent web crawling helpers for label derivation and content extraction across any documentation site.
 - `intelligent-web-adapter.utils.ts`: Universal intelligent web crawling helpers for content extraction and quality checks (URL heuristics for labels removed; classifier-only).
 - `interview-streams.utils.ts`: Interview Streams catalog runner (`runCatalogIngestion`) with concurrency and logging.
 - `label-resolver.utils.ts`: Pluggable label resolver applying rules, heuristics, and OpenAI fallback with caching and metrics.
 - `label-resolver.utils.ts`: Classifier-only resolver using OpenAI with whitelist ontology, URL/path caching, hints precedence, and metrics.
 
 - `json.utils.ts`: Safe JSON parsing helper for strict LLM JSON responses.
 - `mcq-prompt.utils.ts`: Prompt builders for MCQ Generator, Judge, and Reviser (few-shot and chain-of-thought ready) with curated examples.
 - `mcq.utils.ts`: Helpers for MCQ embeddings text build and content-key hashing.

### services

- `ai.services.ts`: Server-only AI utilities exposing vendor-agnostic `getEmbeddings`, `rerank`, `generateMcqFromContext`, `reviseMcqWithContext`, and `judgeMcqQuality`.
- `ingest.services.ts`: Client helper to call ingestion API.
- `http.services.ts`: Axios clients with interceptors (API only).
- `mcq.services.ts`: MCQ API client functions, retrieval client functions, and hooks.
 - Label classification (fallback) added into `ai.services.ts` as `classifyLabels`.

### constants

- `app.constants.ts`: Application constants from environment variables.
- `interview-streams.constants.ts`: Shared interview streams constants (topics/subtopics/options) used by utils and client.
 - `app.constants.ts`: Feature flags for label resolver and confidence threshold.

### data

- `interview-ingest-catalog.json`: Catalog of topics → subtopic ingestion entries (ingestType, url, embedded flag) used to automate seeding and ingestion.
 - `label-rules.json`: Config-driven rules mapping for per-source regex/prefix → labels used by dynamic label resolver.

### scripts

- `scripts/run-catalog.ts`: CLI to run catalog-driven ingestion with structured logs. Usage: `pnpm run:catalog [--topic=React] [--concurrency=4]`.

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

### app/api

### tests (Playwright)

- `tests/visual.spec.ts`: Visual regression tests for `/` and `/upload` across desktop/mobile.
- `tests/a11y.spec.ts`: Non-blocking axe-core accessibility smoke checks for key routes.

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
 
