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
 - `interviewSection.component.tsx`: Subcomponent rendering Interview Streams rows and modal.
  - `completionModal.component.tsx`: Reusable modal displayed after indexing completes with coverage summary (no generation action).

### hooks

- `useTheme.hook.ts`: Custom hook for accessing theme context and state management.
 - `useInterviewIngestion.hook.ts`: Hook to create, process, and poll repo/web ingestions and return coverage.

### public

- `logo.svg`: Vector logo asset.
- `logo.png`: Raster logo asset.
 - `animations/girl-with-book.json`: Lottie animation used by the loader component.

### store/providers

- `theme.provider.tsx`: Theme context/provider; persists to localStorage with dark mode as default.
- `query.provider.tsx`: React Query provider with sensible defaults.

### types

- `app.types.ts`: Application-wide TypeScript types including `ETheme`, `TResolvedTheme`, `IThemeContextValue`.
- `upload.types.ts`: Types for the upload flow. Includes Interview Streams types and `TUploadState`. Academic types removed.
- `ingest.types.ts`: Ingestion request/response, embedding types, and chunk types.
- `mcq.types.ts`: MCQ view models, difficulty enum, and Bloom enum.
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
 - `interview-streams.utils.ts`: Interview Streams catalog runner (`runCatalogIngestion`) with concurrency and logging.
 
 - `json.utils.ts`: Safe JSON parsing helper for strict LLM JSON responses.

### services

- `ai.services.ts`: Server-only AI utilities exposing vendor-agnostic `getEmbeddings` and `rerank`.
- `ingest.services.ts`: Client helper to call ingestion API.
- `http.services.ts`: Axios clients with interceptors (API only).
- `mcq.services.ts`: MCQ API client functions, retrieval client functions, and hooks.

### constants

- `app.constants.ts`: Application constants from environment variables.
- `interview-streams.constants.ts`: Shared interview streams constants (topics/subtopics/options) used by utils and client.

### data

- `interview-ingest-catalog.json`: Catalog of topics → subtopic ingestion entries (ingestType, url, embedded flag) used to automate seeding and ingestion.

### scripts

- `scripts/run-catalog.ts`: CLI to run catalog-driven ingestion with structured logs. Usage: `pnpm run:catalog [--topic=React] [--concurrency=4]`.

### specs/work-items

- `interview-ingestion-and-retrieval.md`: Consolidated work-item for Interview Streams ingestion (repo/web), indexing, status, and retrieval. Generation is removed and will be redesigned separately.
 - `generation-of-questions.md`: Work-item for the MCQ Generation page, personas, streaming, revision chat, and save flow to `mcq_items`.

### migrations

- `001-Storage-Academics-RLS-02-Sep-25.sql`: Creates `academics` bucket if missing; adds RLS policies (public read, authenticated insert/update/delete).
- `002-Ingestions-And-Embeddings.sql`: Creates ingestion, documents, and document_chunks tables with RLS and pgvector.
- `003-Embeddings-1536-And-Hybrid.sql`: Switches to 1536-d embeddings and adds hybrid retrieval RPC and FTS index.
- `004-MCQ-And-Label-Retrieval.sql`: Creates MCQ tables and adds label-based retrieval RPC `retrieval_hybrid_by_labels`.
 - `005-Ingestion-Events.sql`: Adds `ingestion_events` table with RLS and indexes for step-level observability.
 - `006-Documents-Unique-Bucket-Path.sql`: Adds unique index on `documents(bucket, path)` to prevent duplicate URLs.

### app/api

### tests (Playwright)

- `tests/visual.spec.ts`: Visual regression tests for `/` and `/upload` across desktop/mobile.
- `tests/a11y.spec.ts`: Non-blocking axe-core accessibility smoke checks for key routes.

 - `api/ingest/repo/route.ts`: Ingestion API route (POST) for repo-based docs (React/JS/TS/HTML/CSS).
 - `api/ingest/web/route.ts`: Ingestion API route (POST) for web crawling (sitemap-limited, small scale).
- `api/ingest/web/plan/route.ts`: Dry-run planning endpoint to preview crawl scope.
 - `api/ingest/[id]/route.ts`: Ingestion status route (GET) by id.
 - `api/retrieval/query/route.ts`: Retrieval API route (POST) computing 1536-d query embeddings, calling hybrid RPC, with optional rerank.
 - `api/retrieval/enhance-query/route.ts`: Query enhancement API route (POST) stub.
 - `api/generate/mcq/route.ts`: Placeholder route for MCQ generation (SSE scaffold).
  - `api/generate/mcq/revise/route.ts`: Placeholder route for MCQ revision requests.
  - `api/generate/mcq/save/route.ts`: Placeholder route for saving finalized MCQs.
 - `components/generate/mcqCard.component.tsx`: MCQ card component (question, options, citations, metadata chips).
 - `components/generate/personaPanel.component.tsx`: Persona progress panel component.
 - `components/generate/revisionBox.component.tsx`: Revision chat input component.
 - `components/generate/automationModal.component.tsx`: Modal for automation controls and coverage placeholder.
 - `services/mcq.services.ts`: MCQ API client functions and SSE opener.
 
Updates:
- `api/ingest/web/plan/route.ts`: Added `returnAllPages` and `applyQuotas` flags; response includes `aiUsed`. MDN-specific sections removed; source-agnostic.
- `api/ingest/web/process/route.ts`: Simplified selection to source-agnostic cap by `maxPages`; removed MDN-specific quotas.
 - `specs/work-items`: Merged `ingestion-reliability-hardening.md` into `interview-ingestion-and-retrieval.md`; removed the former.
 - `app/generate/mcq/page.tsx`: MCQ Generation page skeleton with MCQ card, persona panel, and revision box.
 - `types/mcq.types.ts`: Types for MCQ view model.
 
