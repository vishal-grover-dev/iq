# React Interview Topics Expansion

## Goal

Expand the ingestion coverage to include critical React ecosystem topics frequently asked in interviews: state management (Redux), routing, bundling/build tools, rendering strategies, environment variables, deployment basics, and advanced React patterns.

## Context

Current ingestion (verified from DB):

- ✅ JavaScript (93 docs, 535 chunks)
- ✅ TypeScript (5 docs, 70 chunks)
- ✅ React (49 docs, 522 chunks)
- ✅ HTML (23 docs, 207 chunks)
- ✅ CSS (58 docs, 386 chunks)
- ✅ Accessibility (22 docs, 143 chunks)
- ✅ Testing (10 docs, 58 chunks)
- ✅ PWA (4 docs, 23 chunks)

**Gaps identified**: Redux state management, React Router, Next.js routing/rendering/env vars, bundling tools (Webpack/Vite), deployment concepts, and verification that React custom hooks and error boundaries are covered.

## Scope (now)

Ingest authoritative documentation for:

1. State Management (Redux Toolkit)
2. Routing (React Router + Next.js)
3. Rendering Strategies (SSR/SSG/ISR/CSR with Next.js)
4. Environment Variables & Secrets (Next.js patterns)
5. Bundling & Build Tools (Vite priority, Webpack optional)
6. Code Splitting & Lazy Loading (React.lazy/Suspense)
7. Deployment Basics (Vercel/Netlify conceptual docs)
8. Verify coverage: Custom Hooks patterns and Error Boundaries

## Non-Goals (now)

- GraphQL integration patterns (defer to later)
- Deep backend/API route patterns beyond Next.js basics
- Testing frameworks beyond what's already ingested (RTL/Jest)
- CSS-in-JS libraries (styled-components, emotion)

---

## Resources & Ingestion Plan

### Priority 1: Core Interview Topics (High Impact)

#### 1.1 State Management (Redux Toolkit)

**Primary Source**: Redux Toolkit Official Docs

- **Repo**: `https://github.com/reduxjs/redux-toolkit`
- **Path**: `/docs` folder
- **Web**: `https://redux-toolkit.js.org/introduction/getting-started`
- **Topic**: Redux (new)
- **Subtopics**: Store & Configuration, Reducers & Slices, RTK Query, Middleware, Best Practices
- **Key Content**: Modern Redux patterns, immutability, createSlice, createAsyncThunk, selectors, RTK Query for data fetching
- **Ingestion Type**: Repo (preferred) — Markdown files under `/docs`
- **Estimated**: ~30-50 docs

**Supplementary** (optional):

- Core Redux concepts: `https://github.com/reduxjs/redux` → `/docs` (if Redux Toolkit docs don't cover fundamentals sufficiently)

---

#### 1.2 Routing (React Router)

**Primary Source**: React Router v6+ Docs

- **Repo**: `https://github.com/remix-run/react-router`
- **Path**: `/docs` folder
- **Web**: `https://reactrouter.com/en/main`
- **Topic**: Routing (new)
- **Subtopics**: Declarative Routing, Nested Routes, Data Loading (Loaders), Navigation & Hooks, Dynamic Routes
- **Key Content**: Routes, Route, Link, NavLink, Outlet, useNavigate, useParams, useLocation, useSearchParams, loader/action patterns
- **Ingestion Type**: Repo (preferred) — Markdown/MDX files
- **Estimated**: ~20-30 docs

---

#### 1.3 Next.js (Routing, Rendering, Environment Variables)

**Primary Source**: Next.js Official Docs

- **Repo**: `https://github.com/vercel/next.js`
- **Path**: `/docs` folder (filter specific sections)
- **Web**: `https://nextjs.org/docs`
- **Topic**: Next.js (new) or expand React topic
- **Subtopics**:
  - **Routing**: File-based routing, dynamic routes, route groups, parallel routes, intercepting routes, App Router vs Pages Router
  - **Rendering**: Server Components vs Client Components, Static Rendering (SSG), Dynamic Rendering (SSR), Streaming, Suspense, Edge/Node.js runtimes
  - **Environment Variables**: `NEXT_PUBLIC_` prefix, build-time vs runtime, `.env.local`, secrets handling
  - **Data Fetching**: fetch API in Server Components, caching strategies, revalidation
- **Key Content**: App Router architecture, React Server Components, hydration, rendering trade-offs, security best practices
- **Ingestion Type**: Repo (preferred) — target specific sections:
  - `/docs/app/building-your-application/routing/*`
  - `/docs/app/building-your-application/rendering/*`
  - `/docs/app/building-your-application/configuring/environment-variables.mdx`
  - `/docs/app/building-your-application/data-fetching/*`
- **Estimated**: ~40-60 docs (focused sections)

---

### Priority 2: Build Tools & Performance (Medium Impact)

#### 2.1 Vite (Modern Build Tool)

**Primary Source**: Vite Official Docs

- **Repo**: `https://github.com/vitejs/vite`
- **Path**: `/docs` folder
- **Web**: `https://vitejs.dev/guide/`
- **Topic**: Bundling & Build Tools (new)
- **Subtopics**: Vite Concepts, Dev Server & HMR, Build Optimizations, Plugins, Dep Pre-bundling
- **Key Content**: Why Vite (ESM-based dev), features, build process, code splitting, plugin system
- **Ingestion Type**: Repo (preferred) or web crawl (limit to Guide + Config sections)
- **Estimated**: ~15-25 docs

---

#### 2.2 Webpack (Legacy/CRA Build Tool)

**Primary Source**: Webpack Official Docs

- **Web**: `https://webpack.js.org/concepts/`
- **Topic**: Bundling & Build Tools
- **Subtopics**: Webpack Concepts, Loaders, Plugins, Code Splitting, Tree Shaking, HMR
- **Key Content**: Entry/output, loaders, plugins, optimization, configuration patterns
- **Ingestion Type**: Web crawl (limit to Concepts, Guides, Configuration sections; use sitemap and maxPages=50)
- **Estimated**: ~20-30 docs
- **Note**: Lower priority; many projects moving to Vite/Next.js built-in bundling

---

### Priority 3: Deployment & Advanced Patterns (Nice-to-Have)

#### 3.1 Deployment Basics (Vercel)

**Primary Source**: Vercel Docs (Conceptual)

- **Web**: `https://vercel.com/docs/concepts/deployments/overview`
- **Topic**: Deployment (new)
- **Subtopics**: CI/CD, Preview Deployments, Environment Config, Build Configuration, Edge Network
- **Key Content**: Git integration, deploy contexts, environment variable hierarchy, edge functions
- **Ingestion Type**: Web crawl (limit to Concepts section; exclude marketing/product-specific content)
- **Estimated**: ~10-15 docs
- **Note**: Focus on concepts, not step-by-step tutorials

---

#### 3.2 Deployment Basics (Netlify)

**Primary Source**: Netlify Docs (Conceptual)

- **Web**: `https://docs.netlify.com/site-deploys/overview/`
- **Topic**: Deployment
- **Subtopics**: Deploy Contexts, Build Plugins, Continuous Deployment, Deploy Previews
- **Key Content**: Build configuration, deploy contexts (production/branch/deploy-preview), environment variables
- **Ingestion Type**: Web crawl (limit to Site Deploys + Build concepts; maxPages=30)
- **Estimated**: ~10-15 docs
- **Note**: Complement to Vercel; covers similar patterns

---

### Verification Tasks (Already Ingested?)

#### 4.1 React Custom Hooks Patterns

**Check existing ingestion**: You already have 49 React docs ingested. Verify if this section is covered:

- **Expected Source**: `reactjs/react.dev` → `/src/content/learn/reusing-logic-with-custom-hooks.md`
- **Web**: `https://react.dev/learn/reusing-logic-with-custom-hooks`
- **Subtopic**: Custom Hooks
- **Key Content**: Extracting logic, naming conventions (`use` prefix), composition patterns, when to create custom hooks

**Action**: Query DB for React docs with "custom hooks" or "reusing logic" in title/content; if missing, re-ingest targeted section.

---

#### 4.2 React Error Boundaries

**Check existing ingestion**: Verify if this section is covered:

- **Expected Source**: `reactjs/react.dev` → `/src/content/reference/react/Component.md` (error boundary section)
- **Web**: `https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary`
- **Subtopic**: Error Boundaries
- **Key Content**: `componentDidCatch`, `static getDerivedStateFromError`, fallback UI, limitations (async, event handlers)

**Action**: Query DB for React docs with "error boundary" in title/content; if missing, re-ingest targeted section.

---

#### 4.3 React Code Splitting & Lazy Loading

**Check existing ingestion**: Verify coverage:

- **Expected Source**: `reactjs/react.dev` → `/src/content/reference/react/lazy.md` and `/src/content/reference/react/Suspense.md`
- **Web**:
  - `https://react.dev/reference/react/lazy`
  - `https://react.dev/reference/react/Suspense`
- **Subtopics**: Code Splitting, Suspense
- **Key Content**: `React.lazy()`, dynamic imports, Suspense boundaries, fallback UI

**Action**: Query DB for React docs with "lazy" or "Suspense" in title; if missing, re-ingest.

---

## Ingestion Strategy

### Approach

1. **Verification Phase**: Check existing React ingestion for custom hooks, error boundaries, lazy/Suspense coverage
2. **Repo-First**: Use repo mode for Redux Toolkit, React Router, Next.js (clean Markdown, license clarity)
3. **Selective Web Crawl**: Use web mode with sitemap limits for Webpack, Vite (if repo structure is complex), Vercel, Netlify
4. **Batching**: Process high-priority topics first (Redux, React Router, Next.js); build tools and deployment can follow

### Ingestion Parameters

**Repo Mode**:

- `maxFiles`: 200 per batch (use cursor-based batching if needed)
- `paths`: Target specific doc folders (e.g., `/docs`, `/docs/app/building-your-application/routing`)

**Web Mode**:

- `maxPages`: 50 (Webpack/Vite/Vercel/Netlify)
- `depth`: 2-3 (conceptual docs are typically shallow)
- `crawlDelayMs`: 300 (polite crawling)
- `includePatterns`: `["/docs/*", "/guide/*", "/concepts/*"]` (adjust per site)
- `excludePatterns`: `["/blog/*", "/showcase/*", "/api/*"]` (avoid marketing/API references)

### Labels

**New Topics**:

- `Redux` (State Management)
- `Routing` (React Router + Next.js routing)
- `Next.js` (or expand React topic with Next.js subtopics)
- `Bundling & Build Tools` (Webpack, Vite)
- `Deployment` (Vercel, Netlify)

**Subtopics**: Derived from path/section headings via classifier

---

## Success Criteria

- [ ] Redux Toolkit docs ingested (≥30 docs, covering slices, RTK Query, middleware)
- [ ] React Router v6+ docs ingested (≥20 docs, covering loaders, hooks, nested routes)
- [ ] Next.js routing and rendering docs ingested (≥40 docs, covering App Router, Server Components, SSR/SSG/ISR)
- [ ] Next.js environment variables section ingested (1-3 docs)
- [ ] Vite docs ingested (≥15 docs, covering concepts, HMR, build optimizations)
- [ ] Webpack concepts ingested (optional; ≥20 docs if pursued)
- [ ] Vercel + Netlify deployment concepts ingested (≥20 docs combined)
- [ ] Verified React custom hooks, error boundaries, lazy/Suspense are covered (re-ingest if missing)
- [ ] All topics labeled correctly with classifier; low-confidence rate < 10%
- [ ] Total new chunks: ~800-1200 (estimated)

---

## Risks & Mitigations

- **Overlap with existing React docs**: Verify before re-ingesting; upsert on `(bucket, path)` prevents duplicates
- **Classifier uncertainty for new topics**: Pre-seed ontology in `constants/interview-streams.constants.ts` with new topic/subtopic values; run preflight plan to validate labels
- **Web crawl scope creep**: Strictly enforce `maxPages` and `includePatterns`; review plan output before full ingestion
- **Next.js docs size**: Large repo; use targeted `paths` to limit scope (routing + rendering folders only)

---

## Tasks

- [ ] **Verification**: Query DB to confirm React custom hooks, error boundaries, lazy/Suspense coverage
  - SQL: `SELECT title, (labels->>'subtopic') FROM documents WHERE (labels->>'topic') = 'React' AND (title ILIKE '%custom%' OR title ILIKE '%hook%' OR title ILIKE '%error%' OR title ILIKE '%lazy%' OR title ILIKE '%suspense%');`
  - If missing, note specific sections to re-ingest
- [ ] **Ontology Update**: Add new topics/subtopics to `constants/interview-streams.constants.ts`:
  - Topics: `Redux`, `Routing`, `Next.js` (or subtopics under React), `Bundling & Build Tools`, `Deployment`
  - Subtopics: list derived from resource outlines above
- [ ] **Catalog Entries**: Add entries to `data/interview-ingest-catalog.json` for:
  - Redux Toolkit (repo: `reduxjs/redux-toolkit`, path: `/docs`)
  - React Router (repo: `remix-run/react-router`, path: `/docs`)
  - Next.js (repo: `vercel/next.js`, paths: routing + rendering + env vars)
  - Vite (repo or web)
  - Webpack (web, sitemap-limited)
  - Vercel/Netlify (web, conceptual sections only)
- [ ] **Preflight Plans**: Run plan endpoints for each source to validate:
  - Label distribution aligns with ontology
  - Low-confidence rate < 10%
  - Document counts match estimates
- [ ] **Ingestion Execution**: Use Interview Streams UI or catalog CLI to enqueue:
  - Priority 1: Redux Toolkit, React Router, Next.js (routing/rendering/env vars)
  - Priority 2: Vite, Webpack (optional)
  - Priority 3: Vercel, Netlify
- [ ] **Post-Ingestion Verification**: Query DB for new topics:
  - Document counts by topic/subtopic
  - Chunk counts and embedding coverage (no null embeddings)
  - Spot-check 3-5 docs per topic for label accuracy
- [ ] **Update `resources-for-frontend.md`**: Add Redux, Routing, Next.js, Bundling, Deployment sections with ingestion notes
- [ ] **Update `existing-files.md`**: Note this work-item and any new catalog entries

---

## Estimated Timeline

- **Verification Phase**: 30 mins (SQL queries + review)
- **Ontology & Catalog Prep**: 1 hour (constants update + catalog entries)
- **Preflight & Review**: 1 hour (run plans, review distributions)
- **Ingestion Execution**:
  - Priority 1 (Redux, React Router, Next.js): 2-3 hours (repo mode, batching)
  - Priority 2 (Vite, Webpack): 1-2 hours (web crawl with limits)
  - Priority 3 (Vercel, Netlify): 1 hour (web crawl, conceptual only)
- **Verification & Docs Update**: 30 mins

**Total**: ~6-8 hours (can be split across sessions; ingestion runs async after enqueue)

---

## Notes

- Follow existing reliability patterns: seed normalization, preflight skip, classifier-only labeling, cursor-based batching for repos
- Use `specs/blueprints/resources-for-frontend.md` as the canonical reference; expand it as needed
- Keep deployment ingestion lightweight (concepts only); avoid provider-specific marketing content
- If Webpack proves too noisy/large, deprioritize in favor of Vite (modern build tool focus)

---

## References

- Existing work-items: `interview-ingestion-and-retrieval.md`, `generation-of-questions.md`
- Architecture decisions: `specs/blueprints/architecture-decisions.md` (classifier-only labeling, hybrid retrieval)
- Tech stack: `specs/blueprints/tech-stack.md` (Next.js App Router, TanStack Query, Supabase)
- Resources catalog: `specs/blueprints/resources-for-frontend.md` (authoritative sources, license notes)
