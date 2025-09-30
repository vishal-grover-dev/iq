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
  - **web.dev/learn/html** (23 docs ingested; comprehensive HTML fundamentals)
  - MDN HTML Guide/Reference (mdn/content repo; CC‑BY‑SA)
  - WHATWG HTML Living Standard (for definitions; cite sparingly)
- Ingestion approach: 
  - Primary: web crawl `web.dev/learn/html` (already ingested)
  - Supplementary: pull Markdown from `mdn/content` (filter `/files/en-us/web/html/`).

### CSS

- Subtopics: selectors, box model, layout (Flexbox/Grid), positioning, cascade/specificity, responsive, animations, design principles.
- Primary sources:
  - **web.dev/learn/css** (40 docs ingested; modern CSS with practical examples)
  - **web.dev/learn/design** (18 docs ingested; design fundamentals and UX)
  - MDN CSS Guide/Reference (mdn/content)
  - CSSWG drafts (reference only for precise definitions)
- Ingestion approach:
  - Primary: web crawl `web.dev/learn/css` and `web.dev/learn/design` (already ingested)
  - Supplementary: `mdn/content` (filter `/files/en-us/web/css/`).

### JavaScript (ES6+)

- Subtopics: types/coercion, scope/closures, prototype/prototypal inheritance, this/bind/call/apply, modules, promises/async, iterators/generators, collections, error handling, forms, images, performance, privacy.
- Primary sources:
  - **web.dev/learn/javascript** (27 docs ingested; modern JS patterns)
  - **web.dev/learn/forms** (25 docs ingested; form validation and UX)
  - **web.dev/learn/images** (18 docs ingested; image optimization and lazy loading)
  - **web.dev/learn/performance** (15 docs ingested; performance optimization techniques)
  - **web.dev/learn/privacy** (7 docs ingested; privacy-first development)
  - MDN JavaScript Guide/Reference (93 docs from mdn/content)
  - JavaScript.info (secondary for examples; attribution per site policy)
- Ingestion approach:
  - Primary: MDN `mdn/content` (filter `/files/en-us/web/javascript/`) — 93 docs already ingested
  - Supplementary: web.dev sections above (already ingested for practical patterns and performance)

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

- Subtopics: RTL queries, act, user-event, Jest matchers, mocking, async tests, web testing fundamentals.
- Primary sources:
  - **web.dev/learn/testing** (10 docs ingested; web testing fundamentals and best practices)
  - Testing Library docs (testing-library website repo)
  - Jest docs (jestjs/jest website repo)
- Ingestion approach:
  - Primary: web crawl `web.dev/learn/testing` (already ingested — 10 foundational docs)
  - Supplementary: pull from Testing Library and Jest repos for framework-specific APIs

### Performance & Web Vitals

- Subtopics: memoization, virtualization, bundle splitting, code splitting, network optimizations.
- Primary sources:
  - React docs (performance sections)
  - web.dev (Google) performance guides (license: check and cite)
- Ingestion: use repo sources; for web.dev, prefer sitemap-limited fetch.

### PWA

- Subtopics: app manifest, service workers, caching strategies, offline & resilience, installability (A2HS), background sync & push notifications, web app capabilities (storage/files/media), Lighthouse PWA checks.
- Primary sources:
  - **web.dev/learn/pwa** (4 docs ingested; authoritative and task-focused)
  - MDN Progressive Web Apps guide (concepts and APIs like `ServiceWorker`, Cache Storage, Notifications)
- Ingestion approach:
  - Primary: web crawl `web.dev/learn/pwa` (already ingested — 4 foundational docs)
  - Supplementary: MDN API/reference pages for Service Workers, Cache, and related APIs
  - Note: Respect robots.txt and enforce conservative `maxPages` for future expansions

### Accessibility (a11y)

- Subtopics: ARIA roles, keyboard nav, color contrast, semantic HTML, focus management, forms accessibility, images accessibility, video/audio accessibility, testing (manual/automated/assistive tech).
- Primary sources:
  - **web.dev/learn/accessibility** (22 docs ingested; comprehensive practical guide)
  - MDN Accessibility (concepts and APIs)
  - WAI/WCAG (reference; summarize, cite)
- Ingestion approach:
  - Primary: web crawl `web.dev/learn/accessibility` (already ingested — 22 comprehensive docs)
  - Supplementary: `mdn/content` accessibility paths for API references

## Ingestion Notes

- **web.dev/learn**: Comprehensive coverage across 12 sections (210 docs total):
  - **Accessibility** (22 docs): Complete practical guide to web accessibility
  - **CSS** (40 docs): Modern CSS patterns, layouts, and best practices
  - **Design** (18 docs): Design fundamentals and UX principles
  - **Forms** (25 docs): Form validation, UX, and accessibility
  - **HTML** (23 docs): HTML fundamentals and semantic markup
  - **Images** (18 docs): Image optimization, lazy loading, and performance
  - **JavaScript** (27 docs): Modern JS patterns and best practices
  - **Performance** (15 docs): Performance optimization techniques
  - **Privacy** (7 docs): Privacy-first development patterns
  - **PWA** (4 docs): Progressive Web App fundamentals
  - **Testing** (10 docs): Web testing best practices
  - Ingestion: web crawl with sitemap-limited fetch; already ingested
- **MDN**: GitHub `mdn/content` (CC‑BY‑SA). Derive topics from path segments; map to {topic, area, subtopic}.
  - JavaScript: 93 docs from `/files/en-us/web/javascript/`
  - CSS: 58 docs from `/files/en-us/web/css/`
  - HTML: 23 docs from `/files/en-us/web/html/`
- **React**: `reactjs/react.dev` MDX (49 docs); preserve headings and code blocks; include version tag (18/19).
- **TypeScript**: `microsoft/TypeScript-Website` handbook Markdown (5 docs); tag `TS 5.x`.
- **Redux**: `reduxjs/redux-toolkit` (87 docs); RTK Query, patterns, selectors/memoization.
- **React Router**: `remix-run/react-router` (200 docs); declarative routes, data loading, hooks.
- **Testing Library/Jest**: prefer official docs repos; if not clean, use sitemap with path whitelist (10 docs).

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
