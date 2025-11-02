# React Knowledgebase Expansion

## Goal

- Expand the React- and JavaScript-focused knowledgebase to cover fundamental and intermediate topics that are currently missing from the Supabase-backed corpus.
- Prioritize sources with permissive licenses (MIT, Apache-2.0, CC-BY) and version-controlled documentation suitable for repeatable ingestion.
- Strengthen coverage for React core APIs, applied patterns, data fetching, testing, and React-specific JavaScript skills used throughout the project.

## Current Coverage (2025-11-01)

- Indexed documents: 551 total (`repo`: 287, `web`: 264).
- React-labeled items: 49 documents, primarily from `react.dev` Learn/Reference sections focused on introductory topics (components, state, lists, effects).
- Non-React React-adjacent coverage:
  - `Routing/Declarative Routes`: ~110 docs from `react-router` repo ingestion.
  - `State Management/Redux Toolkit` + `RTK Query`: ~83 docs from `redux-toolkit` ingestion.
  - JavaScript fundamentals mostly sourced from `web.dev`; TypeScript + React integration appears only once.
- No meaningful coverage for React component testing, advanced hooks, Suspense/concurrent features, or form libraries.

## Gaps & Needs

- **Patterns & architecture**: composition techniques (render props, compound components), state colocation, controlled vs uncontrolled patterns, project structure conventions.
- **Forms & validation**: React Hook Form, Formik, schema validation (Zod/Yup) integrations.
- **Testing fundamentals**: React Testing Library, Jest DOM, async test patterns, component contract testing.
- **TypeScript in React**: typing props, hooks, context, discriminated unions, component overloads.

## Target Sources (Priority Order)

1. `reacttips/reactpatterns` (MIT) — component patterns, hooks composition, performance tips.
2. `testing-library/docs` (MIT) — React Testing Library and testing philosophy.
3. `react-hook-form/documentation` (MIT) and `jaredpalmer/formik` (MIT) — controlled forms, validation flows.
4. `gaearon/overreacted.io` (MIT) — conceptual essays on effects, scheduling, hooks, concurrent rendering.
5. `uidotdev/ui-dev` (MIT) — state management primers, suspense readiness, component composition.
6. Selected MDN React + JS integration articles (`mdn/content`, CC-BY-SA 2.5) — closures, async, DOM APIs relevant to React.
7. `kentcdodds/kentcdodds.com` (MIT) — articles on hooks best practices, dependency arrays, testing heuristics.

_All sources require license verification per repo/section before ingestion; prioritize repo mode (`/api/ingest/repo`) for deterministic runs._

## Work Plan

1. Update `data/interview-ingest-catalog.json` with new entries tagged to precise ontology subtopics (e.g., `React/Hooks: useTransition`, `React/Concurrent Rendering`, `Testing/RTL Queries`).
2. Queue repo ingestion plans via `/api/ingest/repo/plan` for each target; validate batch sizes (<200) and establish canary URLs.
3. Execute ingestions in waves:
   - Wave A: React patterns + forms (`reactpatterns`, `react-hook-form`, `formik`).
   - Wave B: Testing (`testing-library/docs`).
   - Wave C: Conceptual essays (Overreacted, Kent C. Dodds), ui.dev guides, and supplemental MDN JS content.
4. After each wave, rerun coverage aggregation (`labels->>'topic'`) to confirm distribution shifts and prevent over-weighting a single subtopic.
5. Add canary checks per source to ingestion monitoring (e.g., ensure `testing-library.com/docs/react-testing-library/intro` lands with labels `Testing/RTL Queries`).
6. Document ingestion outcomes and update this work-item with counts, anomalies, and follow-up actions.

## Risks & Mitigations

- **License compliance**: Cross-check each repo’s license before ingestion; skip pages with restrictive terms. Track license attribution requirements for CC-BY sources.
- **Ontology drift**: Ensure new subtopics exist in `constants/mvp-ontology.constants.ts`; add missing ones before ingestion.
- **Source overlap**: Deduplicate content across overlapping guides by using content hashes in ingestion pipeline.
- **Quality variance**: Implement canary URLs and post-ingestion sampling to guard against low-signal blog posts or outdated guidance.

## Open Questions

- Are there internal preferences for covering React Server Components vs client-only patterns first?
- Should we expand beyond textual docs (e.g., include code samples or interactive tutorials) if licensing permits?
- Do we need to prioritize React Native content, or stay web-only for this phase?

---

_Next actions:_ review this outline, adjust prioritization/order, and confirm any additional sources before catalog updates.
