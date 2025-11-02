# Repository Guidelines

## Spec-First Orientation
Start every task by reviewing the relevant documents under `specs/`. Blueprint files capture enduring architecture and naming rules (`specs/blueprints/directory-structure.md`, `tech-stack.md`, `architecture-decisions.md`, `existing-files.md`), while work items describe in-flight feature scope (Evaluate page, MCQ generation, ingestion pipeline, Playwright coverage). Treat those specs as the source of truth; update the matching work-item checklist when you move a task forward.

## Project Structure & Ownership
The codebase uses the Next.js App Router. UI routes live in `app/`, shared UI primitives in `components/common/`, and shadcn imports under `components/ui/`. Business logic is split between `services/client/` (browser + TanStack Query hooks) and `services/server/` (Supabase/OpenAI access). Helpers belong in `utils/`, constants in `constants/`, and typed contracts in `types/`. Follow the dot-suffix naming scheme from the directory blueprint (`header.component.tsx`, `useAttempts.hook.ts`, `mcq-orchestration.service.ts`, etc.) and keep components ≲200 lines unless a work item exempts them. Co-locate feature assets alongside their domain folders and mirror any movement back into `specs/blueprints/existing-files.md`.

## Build & Operational Commands
- `pnpm install` — refresh dependencies after pulling schema or script changes.
- `pnpm dev` — run the app on `http://localhost:3050` with RSC + hot reload.
- `pnpm build && pnpm start` — validate production output before shipping.
- `pnpm lint` (`--fix` optional) — enforce ESLint 9 + TypeScript rules.
- `pnpm test:e2e` — execute the Playwright suite (desktop + mobile profiles); JSON/HTML reports land in `test-results.json` and `playwright-report/`.
- `pnpm run:catalog` — launch the ingestion catalog runner defined in `specs/work-items/interview-ingestion-and-retrieval.md`.
- `pnpm generate:ontology` — optional warm-up for the lazy ontology cache described in the ingestion work item.

## Coding Standards & Patterns
Use TypeScript with strict mode and 2-space indentation. Directories stay camelCase; filenames use camelCase with the prescribed suffixes. Prefix interfaces with `I`, union aliases with `T`, and enums with `E`. Centralize strings in grouped constants (no label enums) as documented in `architecture-decisions.md`. Client components must declare `"use client"`; server code that touches secrets lives in `services/server/` or API routes. Tailwind v4 powers styling—favor utility classes and respect the motion guidance in `tech-stack.md` (transform/opacity only, reduced-motion handling). When adding services, include ≥2-line JSDoc and keep API-facing logic separate from helpers. Avoid `any`; isolate third-party weak typing with comments when unavoidable.

## Testing Strategy
Playwright provides the primary safety net (see `specs/work-items/evaluate-page-testing.md`). Place specs under `tests/evaluate/` using the agreed subfolders (`integrity/`, `distribution/`, `a11y/`, etc.) and suffix files with `.spec.ts`. Reuse shared fixtures/utilities from `tests/evaluate/fixtures/` and `tests/evaluate/utils/` instead of duplicating logic. Update snapshots with `pnpm test:e2e:update`, and include `@axe-core/playwright` assertions when editing flows tied to accessibility or cognitive load. For UI-affecting work, capture before/after artifacts or note why visual diffs don’t apply. When introducing new behavior, outline the planned test additions in the relevant work item before submitting code.

## Data, AI & Ingestion Guardrails
The ingestion/generation pipeline enforces classifier-only labeling (no heuristics) and hybrid retrieval (vector + keyword). When touching ingestion, align with `specs/work-items/interview-ingestion-and-retrieval.md`: normalize seeds, respect batch cursors, and keep migrations immutable. AI services rely on structured outputs, neighbor-aware judging, and aggressive deduplication (see `architecture-decisions.md` and the MCQ work item). Maintain the exact five-dimension matching strategy during evaluation question selection and preserve similarity thresholds defined in `constants/evaluate.constants.ts`. Any change to ontology, selection, or dedupe rules must be cross-linked with the associated spec and logged in its task checklist.

## Git & Collaboration
Commits follow short, imperative summaries (recent history shows patterns like `Update evaluation attempt structure`). Scope each commit narrowly, reference issues or work items when available, and avoid mixing unrelated changes. Pull requests should: summarize the intent, list commands/tests executed, and attach screenshots or recordings for UI edits. Highlight migrations, environment changes, or spec updates so reviewers can verify them. When closing a spec checklist item, mention the PR link within the work item.

## Environment & Secrets
Copy `.env.local` from the template and populate `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `SUPABASE_SERVICE_ROLE_KEY`. The factories in `config/supabase.config.ts` throw early if values are missing—check env setup before running `pnpm dev`. Keep API keys out of version control; rotate temporary keys after using ingestion (`scripts/run-catalog.ts`) or ontology (`scripts/generate-ontology.ts`) scripts. Persist schema changes via new SQL files under `migrations/` and never edit historical migrations.
