You are my coding assistant for a Next.js project using shadcn/ui and Tailwind CSS.

> **Note:** For the "why" behind these conventions, see [`architecture-decisions.md`](./architecture-decisions.md#directory-structure--conventions).

### Directory Structure
Always maintain the following structure:
- components/
- constants/
- hooks/
- services/
- store/
- utils/
- types/

### File Naming Rules
When creating files:
- React components: <fileName>.component.tsx
- Hooks: <name>.hook.ts
- Services: <name>.services.ts
- Utilities: <name>.utils.ts
- Constants: <name>.constants.ts
- Types: <fileName>.types.ts

### Naming Conventions
- Use camelCase for all folder names.
- Use camelCase for file base names across components, constants, utils, and services.
- Hooks use their base name only (camelCase).
- Domain subfolders must be consistent across `components/`.

### Types & Interfaces Naming
- Prefix interfaces with `I` (e.g., `IAcademicPathContext`).
- Prefix types with `T` and enums with `E`.

### TypeScript Guidelines
- Avoid using `any` unless absolutely necessary and temporary. Prefer explicit types, generics, `unknown`, or `never`, and narrow with type guards.
- Do not export public APIs that use `any`. If a boundary forces `any` (e.g., poorly typed third‑party code), isolate it locally and add a brief comment explaining why.

### Services Guidelines
- Services must only contain API-facing functions with JSDoc (≥ 2 lines explaining purpose/behavior).
- Move helpers to `utils/` and shared types/interfaces to `types/`.
- Server-only vs Client usage:
  - Keep secrets on the server. Functions that require secrets (e.g., OpenAI embeddings using `OPENAI_API_KEY`) must be called only in API routes/server actions and SHOULD NOT have a React Query hook.
  - Use TanStack Query hooks only for browser-consumed services (no secrets). Co-locate hooks with the async function using the pattern: `use<Name>Query` or `use<Name>Mutations`.
  - Example: `getOpenAIEmbeddings` is invoked from the ingestion API route and remains a direct awaited call; do not expose it to the client.
  - Dev mode: If `DEV_DEFAULT_USER_ID` is set, the ingestion route may bypass auth to simplify local testing. Remove/disable for production.

### Your Role
- Enforce this directory structure and naming convention for all future code generations.
- Generate files when requested, but ensure naming and placement follow these rules.
- Remind me if I attempt to break these rules.

### Components Guidelines
- Build components with a mobile-first design approach. Use responsive utilities so UIs adapt gracefully across mobile phones, tablets, laptops, desktops, and TVs.
- Keep React components around 200 lines. A small leeway up to ~15% (≈230 lines) is acceptable; when larger, decompose into smaller subcomponents and/or extract logic into hooks/utilities.
