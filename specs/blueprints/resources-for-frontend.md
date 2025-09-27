# Frontend Resources (React-focused)

Purpose: Define topics, subtopics, and preferred authoritative sources for ingestion (favor GitHub doc repos first, crawling as fallback). Use this as the canonical scope for v1–v1.1 content.

## Principles

- Prefer GitHub documentation repositories (Markdown/MDX) over HTML crawling.
- Respect licenses; attribute MDN (CC‑BY‑SA). Store derived chunks with citations, avoid large verbatim copies.
- Version-tag content (e.g., React 18/19, TS 5.x).

## Topics and Sources

### HTML

- Subtopics: semantics, forms, media, accessibility basics, SEO‑relevant tags.
- Primary sources:
  - MDN HTML Guide/Reference (mdn/content repo; CC‑BY‑SA)
  - WHATWG HTML Living Standard (for definitions; cite sparingly)
- Ingestion approach: pull Markdown from `mdn/content` (filter `/files/en-us/web/html/`).

### CSS

- Subtopics: selectors, box model, layout (Flexbox/Grid), positioning, cascade/specificity, responsive, animations.
- Primary sources:
  - MDN CSS Guide/Reference (mdn/content)
  - CSSWG drafts (reference only for precise definitions)
- Ingestion: `mdn/content` (filter `/files/en-us/web/css/`).

### JavaScript (ES6+)

- Subtopics: types/coercion, scope/closures, prototype/prototypal inheritance, this/bind/call/apply, modules, promises/async, iterators/generators, collections, error handling.
- Primary sources:
  - MDN JavaScript Guide/Reference (mdn/content)
  - JavaScript.info (secondary for examples; attribution per site policy)
- Ingestion: `mdn/content` (filter `/files/en-us/web/javascript/`).

### TypeScript

- Subtopics: types, interfaces vs types, generics, narrowing, utility types, modules, declaration merging, JSX types, strictness.
- Primary sources:
  - TypeScript Handbook (microsoft/TypeScript-Website repo)
  - TypeScript docs (same repo)
- Ingestion: pull Markdown from `microsoft/TypeScript-Website/packages/documentation/copy/en` (handbook paths).

### React

- Subtopics: components, props/state, rendering lifecycle, hooks (useState/useEffect/useMemo/useCallback/useRef/useContext/useReducer), keys/reconciliation, context, performance, concurrency basics, suspense (intro).
- Primary sources:
  - React docs (reactjs/react.dev repo; MDX)
- Ingestion: clone `reactjs/react.dev` and parse MDX under `src/content/learn` and `src/content/reference`.

### State Management

- Subtopics: Redux Toolkit patterns, immutability, selectors/memoization, context vs redux, RTK Query basics.
- Primary sources:
  - Redux docs (reduxjs/redux repo docs or reduxjs/redux-toolkit site repo)
- Ingestion: prefer Redux Toolkit site repo (markdown) if accessible; otherwise sitemap list and selective fetch.

### Routing (React Router / Next.js)

- Subtopics: declarative routes, nested routes, data loading basics; for Next.js: file-based routing, server/client components basics.
- Primary sources:
  - React Router docs (remix-run/react-router repo/docs)
  - Next.js docs (vercel/next.js repo docs)
- Ingestion: prefer docs repos; otherwise sitemap-limited fetch.

### Rendering Strategies

- Subtopics: client-side rendering (CSR), server-side rendering (SSR), static site generation (SSG), ISR (optional), hydration basics, trade-offs.
- Primary sources:
  - Next.js docs (rendering fundamentals)
- Ingestion: concept-level sections from Next.js docs that define strategies and trade-offs.

### Environment Variables (.env)

- Subtopics: configuration separation, client vs server exposure, build-time vs runtime, secrets handling basics.
- Primary sources:
  - Next.js docs (environment variables)
- Ingestion: concept-level pages only; avoid provider/tool-specific marketing content.

### Bundling & Build Tools

- Subtopics: Webpack (loaders, plugins, code splitting, tree shaking), Vite (dev server, HMR, build, plugins).
- Primary sources:
  - Webpack official docs
  - Vite official docs
- Ingestion: limit to terminology and core conceptual docs; skip exhaustive API references to reduce noise.

### Deployment

- Subtopics: Netlify/Vercel deploy basics, CI/CD overview, preview deployments, environment configuration, basic monitoring.
- Primary sources:
  - Netlify docs
  - Vercel docs
- Ingestion: platform docs at a conceptual level; exclude provider-specific tutorials that are not authoritative references.

### Testing

- Subtopics: RTL queries, act, user-event, Jest matchers, mocking, async tests.
- Primary sources:
  - Testing Library docs (testing-library website repo)
  - Jest docs (jestjs/jest website repo)
- Ingestion: pull from respective repos.

### Performance & Web Vitals

- Subtopics: memoization, virtualization, bundle splitting, code splitting, network optimizations.
- Primary sources:
  - React docs (performance sections)
  - web.dev (Google) performance guides (license: check and cite)
- Ingestion: use repo sources; for web.dev, prefer sitemap-limited fetch.

### PWA

- Subtopics: app manifest, service workers, caching strategies, offline & resilience, installability (A2HS), background sync & push notifications, web app capabilities (storage/files/media), Lighthouse PWA checks.
- Primary sources:
  - web.dev PWA guides (`web.dev/learn/pwa/` and related) — authoritative and task-focused
  - MDN Progressive Web Apps guide (concepts and APIs like `ServiceWorker`, Cache Storage, Notifications)
- Ingestion: prefer sitemap-limited fetch from web.dev for the PWA section; supplement with MDN API/reference pages for Service Workers, Cache, and related APIs. Respect robots.txt and enforce conservative `maxPages`.

### Accessibility (a11y)

- Subtopics: ARIA roles, keyboard nav, color contrast, semantic HTML.
- Primary sources:
  - MDN Accessibility
  - WAI/WCAG (reference; summarize, cite)
- Ingestion: `mdn/content` accessibility paths.

## Ingestion Notes

- MDN: GitHub `mdn/content` (CC‑BY‑SA). Derive topics from path segments; map to {topic, area, subtopic}.
- React: `reactjs/react.dev` MDX; preserve headings and code blocks; include version tag (18/19).
- TypeScript: `microsoft/TypeScript-Website` handbook Markdown; tag `TS 5.x`.
- Redux/React Router/Next.js/Testing: prefer official docs repos; if not clean, use sitemap with path whitelist.

## Supplementary Resources (non-ingestion)

- UI/UX Design (for study only): inspiration (Dribbble, Behance), reading ("Don't Make Me Think", "The Design of Everyday Things"), design systems (Material Design), component libraries (Bootstrap). Not ingested.
- Workflow & Tools (for study only): Git basics, task runners (Gulp) overview. Not ingested.
- Extra Reading (for study only): Smashing Magazine, CSS‑Tricks. Not ingested.
- Backend Resources (out of scope): Node.js official docs, database docs (PostgreSQL, MongoDB). Not ingested.
- Version Control (for study only): GitHub/Bitbucket platform docs. Not ingested.
- Style Guides (for study only): Airbnb JavaScript Style Guide, Google HTML/CSS Style Guide. Not ingested.

## Gaps and Future

- Advanced React (concurrency deeper, Suspense data fetching) → later.
- Tooling (deeper API coverage for Vite/Webpack/Babel) → later; current scope includes concept-level docs only.
- GraphQL, CSS‑in‑JS specifics → optional.
