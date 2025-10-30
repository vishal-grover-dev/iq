# Tech Stack & Architecture - Intelliqent Questions (IQ)

> **Note:** For the "why" behind these technology choices, see [`architecture-decisions.md`](./architecture-decisions.md).

## Frontend Technology Stack

### Core Framework

- **Next.js 15+** - React framework with App Router for server-side rendering and static generation
  - *Why:* Unified frontend/backend codebase with serverless API routes, RSC support, and file-based routing for rapid iteration. See [architecture-decisions.md](./architecture-decisions.md#nextjs-app-router).
- **TypeScript** - Type-safe JavaScript for better development experience and code quality
- **React 19** - UI library with concurrent features and hooks

### Styling & UI Components

- **Tailwind CSS v4** - Utility-first CSS framework for rapid UI development
- **shadcn/ui** - High-quality, accessible component library built on Radix UI
  - *Why:* Source-owned components (not packages) enable full customization; Radix provides WAI-ARIA accessibility out of the box. See [architecture-decisions.md](./architecture-decisions.md#shadcnui-not-material-uichakra).
- **Radix UI** - Unstyled, accessible UI primitives
- **Phosphor Icons** - Consistent icon set for React.
  - Note: Import components with the `Icon` suffix (e.g., `SunDimIcon`, `MoonIcon`, `LinkedinLogoIcon`).
  - Guideline: Do not use `duotone` icons; prefer `regular`, `bold`, or `fill` weights.

### Motion & Animations

- Purpose: keep interactions feeling responsive, clean, and fluid while respecting accessibility and performance.
- What to animate: prefer opacity and transform (translate/scale) only; avoid layout-affecting properties (width/height/top/left) to prevent jank.
- Durations: micro-interactions 120–200 ms; menus/dialogs 180–280 ms; overlays/pages 250–400 ms. Orchestrations may chain up to ~600 ms total.
- Easing: use gentle ease-out or ease-in-out curves that avoid bouncy/overshoot by default. Reserve spring-like motion for subtle, playful contexts only.
- Consistency: apply consistent timings/easings across similar components (buttons, lists, modals). Keep distances small (5–12 px) and avoid excessive movement.
- Accessibility: honor reduced motion preferences by disabling or simplifying animations. Ensure focus states remain visible and do not rely solely on motion.
- Libraries: use built-in shadcn/Radix transitions for simple states; for entrance/exit, presence, and shared layout transitions prefer a dedicated motion library (e.g., Framer Motion). Lazy-load advanced motion features when possible.
- Performance: limit simultaneous animated elements, prefer GPU-friendly transforms, and avoid animating large backgrounds or heavy shadows.
- Testing: keep animation timings stable; disable long-running animations during visual tests to reduce snapshot flakiness.
- Installed: `framer-motion` is added to the project for smooth, accessible animations.

### State Management

- **Jotai** - Atomic state management for client-side state
- **React Query/TanStack Query** - Server state management and caching
  - *Why:* Automatic caching, deduplication, and stale-while-revalidate pattern reduce boilerplate. See [architecture-decisions.md](./architecture-decisions.md#tanstack-query--axios-not-fetch).
- **React Hook Form** - Performant forms with validation

### Development Tools

- **ESLint** - Code linting and quality enforcement
- **Prettier** - Code formatting

### HTTP Client (Frontend Guideline)

- Prefer Axios for all HTTP requests in the frontend. Centralize configuration and interceptors in `services/http.services.ts` and consume the exported clients in hooks/services. Avoid using `fetch` directly in the UI code so headers, errors, and credentials are consistently handled.
  - *Why:* Centralized interceptors, built-in retry/backoff, and timeout config. See [architecture-decisions.md](./architecture-decisions.md#tanstack-query--axios-not-fetch).

## Backend Technology Stack

### API Framework

- **Next.js API Routes** - Serverless API endpoints within Next.js

### Database & Storage

- **Supabase** - Primary database, authentication, and file storage platform
  - *Why:* Unified platform for Postgres, auth, storage, and RLS; reduces operational complexity. See [architecture-decisions.md](./architecture-decisions.md#supabase--postgresql--pgvector).
- **PostgreSQL** - Relational database (via Supabase)
- **pgvector** Extension – Vector embeddings storage for semantic search
- **Postgres Full-Text Search (FTS)** – Keyword search
- **Hybrid Search** – Combines vector and keyword search for improved accuracy
  - *Why:* Semantic (vector) + exact (keyword) matching complement each other for better retrieval coverage. See [architecture-decisions.md](./architecture-decisions.md#hybrid-search-vector--keyword).
- **Supabase MCP Server** – Model Context Protocol integration for AI agent database interactions
  - *Why:* Enables direct agent access to database operations (migrations, queries, table management) through standardized MCP tools instead of shell scripts. Application code continues using `@supabase/supabase-js` clients via `config/supabase.config.ts`.
  - *Usage:* Agent uses MCP tools (`list_tables`, `execute_sql`, `apply_migration`, `list_migrations`, etc.) for all database operations. Configuration is stored in `.cursor/mcp.json` and scoped to project `xxhsdefivkjtvpmbtokj`.

### AI/ML Services

- **Langchain.js** - Framework for building AI applications and agents
- **OpenAI SDK** - Official OpenAI API client for JavaScript
- **LangSmith** - Observability and monitoring platform for AI agents
- **OpenAI Embeddings** - `text-embedding-3-small` (1536‑d) for indexing and queries
  - *Why:* Single embedding space (same model for indexing/queries) ensures consistency; 1536-d offers cost-performance balance. See [architecture-decisions.md](./architecture-decisions.md#openai-text-embedding-3-small-1536-d).
- **Reranker** – LLM-as-reranker using `gpt-4o-mini` returning list-wise JSON
  - *Why:* Cross-encoder quality improves ranking; optional with timeout/fallback. See [architecture-decisions.md](./architecture-decisions.md#llm-as-reranker-optional).
- **Label Classifier (strict)** – Classifier‑only labeling of `{ topic, subtopic, version }` with whitelist ontology and confidence gating (default 0.8); never overrides explicit hints; caches by URL/path.
  - *Why:* Replaced brittle heuristics after zero-result ingestion failures; LLM generalizes across documentation sites. See [architecture-decisions.md](./architecture-decisions.md#classifier-only-labeling-no-heuristicsrules).

### File Processing

- **PDF.js** - PDF parsing and text extraction
- **Mammoth.js** - DOCX file processing
- **Multer** - File upload handling
- **Sharp** - Image processing and optimization

## Infrastructure & Deployment

### Hosting & Platform

- **Netlify** - Primary hosting platform for Next.js deployment

### Environment & Configuration

- **Environment Variables** - Secure configuration management

### Monitoring & Analytics

- **LangSmith** - AI agent observability and monitoring
- **Ingestion Events Metrics** - Classifier metrics snapshots (hits, low‑confidence/nulls) emitted during ingestion; preflight sampler in plan endpoints surfaces label distribution and low‑confidence rate.

## Development Workflow

### Version Control

- **Git** - Source code version control
- **GitHub** - Repository hosting and collaboration

### CI/CD Pipeline

- **GitHub Actions** - Automated deployment
- **Netlify** - Automatic deployments on push to main branch

### Testing Strategy

- **No testing framework** - Focus on rapid development and iteration

### Local Development

- Dev server default port: 3050 (`pnpm dev` runs Next.js on `http://localhost:3050`; see `package.json` scripts).

## Security & Performance

### Security Measures

- **Supabase Auth** - Authentication and authorization
- **Row-Level Security (RLS)** – Fine-grained data protection in Postgres
- **JWT Verification** – For securing API routes
- **CORS** - Cross-origin resource sharing protection
- **Rate Limiting** - API request throttling
- **Input Validation** - Sanitization and validation

### Performance Optimization

- **Next.js Image Optimization** - Automatic image optimization
- **Code Splitting** - Dynamic imports for better loading

## Third-Party Integrations

### External Services

- **Supabase Storage** - File storage for documents and assets

### HTTP Client (Backend Guideline)

- Prefer Axios for server-side HTTP as well (e.g., calling external documentation sites, GitHub APIs). Use a dedicated external Axios instance without baseURL/credentials for cross-origin requests (see `services/http.services.ts`). Avoid using `fetch` in server routes to keep retry/backoff and timeouts consistent across the app.

