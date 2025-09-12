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

### hooks

- `useTheme.hook.ts`: Custom hook for accessing theme context and state management.

### public

- `logo.svg`: Vector logo asset.
- `logo.png`: Raster logo asset.
 - `animations/girl-with-book.json`: Lottie animation used by the loader component.

### store/providers

- `theme.provider.tsx`: Theme context/provider; persists to localStorage with dark mode as default.
- `query.provider.tsx`: React Query provider with sensible defaults.

### types

- `app.types.ts`: Application-wide TypeScript types including `ETheme`, `TResolvedTheme`, `IThemeContextValue`.
- `upload.types.ts`: Types for the upload flow. Includes `E*` enums, `IAcademicUploadFormValues`, `TUploadState`, and `IAcademicPathContext`.
- `ingest.types.ts`: Ingestion request/response, embedding types, and chunk types.
 - `retrieval.types.ts`: Retrieval contracts including filters, requests, responses, and Bloom enums.

### schema

- `upload.schema.ts`: Zod schema and validation for the upload flow.
- `ingest.schema.ts`: Zod schema for ingestion API request/response.
 - `retrieval.schema.ts`: Zod schemas for retrieval requests/responses and query enhancement.

### utils

- `tailwind.utils.ts`: `cn` helper combining `clsx` with `tailwind-merge`.
- `supabase.utils.ts`: Supabase client helpers (browser anon + server service role).
- `upload.utils.ts`: Upload helpers (slugify, path builder, timestamped filenames).
- `langchain.utils.ts`: Combined PDF extraction and text chunking (LangChain-based).
 - `ingest.utils.ts`: Chapter extraction helpers from filenames and document text.

### services

- `upload.services.ts`: Supabase Storage uploads for academic content with directory helpers.
- `openai.services.ts`: OpenAI server-only client for embeddings and reranking.
- `ingest.services.ts`: Client helper to call ingestion API.
- `http.services.ts`: Axios clients with interceptors (API only).
 - `retrieval.services.ts`: Retrieval API client functions and hooks.

### constants

- `app.constants.ts`: Application constants from environment variables.

### specs/work-items

- `upload-flow.md`: Work items and flow notes for the upload feature.
 - `api-for-upload.md`: API spec for ingestion endpoint and embeddings pipeline using OpenRouter and pgvector.
 - `retrieval-phase.md`: Plan for retrieval UI and backend (hybrid search, contracts, endpoints).
 - `upload-interview-questions.md`: Upload/indexing/embeddings plan for interview MCQs (repo-first ingestion).
 - `openai-only-migration.md`: Plan to switch to OpenAI embeddings + LLM reranker and remove HF code.

### migrations

- `001-Storage-Academics-RLS-02-Sep-25.sql`: Creates `academics` bucket if missing; adds RLS policies (public read, authenticated insert/update/delete).
 - `002-Ingestions-And-Embeddings.sql`: Creates ingestion, documents, and document_chunks tables with RLS and pgvector.
 - `003-Embeddings-1536-And-Hybrid.sql`: Switches to 1536-d embeddings and adds hybrid retrieval RPC and FTS index.

### app/api

- `api/ingest/academic/route.ts`: Ingestion API route (POST) for academic documents.
 - `api/retrieval/query/route.ts`: Retrieval API route (POST) performing hybrid search.
 - `api/retrieval/enhance-query/route.ts`: Query enhancement API route (POST) stub.
 
