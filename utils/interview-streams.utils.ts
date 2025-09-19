import { EInterviewIngestType, EInterviewStream, EInterviewTopic } from "@/types/upload.types";
import { ingestRepoOrWeb } from "@/services/ingest.services";
import { IIngestCatalogItem, IIngestRunResult, TIngestCatalog } from "@/types/interview-streams.types";

export const INTERVIEW_DEFAULT_STREAM: EInterviewStream = EInterviewStream.FRONTEND_REACT;

export const INTERVIEW_TOPIC_OPTIONS = [
  { label: EInterviewTopic.REACT, value: EInterviewTopic.REACT },
  { label: EInterviewTopic.JAVASCRIPT, value: EInterviewTopic.JAVASCRIPT },
  { label: EInterviewTopic.TYPESCRIPT, value: EInterviewTopic.TYPESCRIPT },
  { label: EInterviewTopic.HTML, value: EInterviewTopic.HTML },
  { label: EInterviewTopic.CSS, value: EInterviewTopic.CSS },
  { label: EInterviewTopic.STATE_MANAGEMENT, value: EInterviewTopic.STATE_MANAGEMENT },
  { label: EInterviewTopic.ROUTING, value: EInterviewTopic.ROUTING },
  { label: EInterviewTopic.TESTING, value: EInterviewTopic.TESTING },
  { label: EInterviewTopic.PERFORMANCE, value: EInterviewTopic.PERFORMANCE },
  { label: EInterviewTopic.ACCESSIBILITY, value: EInterviewTopic.ACCESSIBILITY },
] as const;

// Load catalog once and provide helpers
export function loadIngestCatalog(): TIngestCatalog {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const catalog = require("@/data/interview-ingest-catalog.json") as TIngestCatalog;
  return catalog;
}

export function getSubtopicsFromCatalog(topic: EInterviewTopic): readonly string[] {
  const catalog = loadIngestCatalog();
  const items = catalog[topic] ?? [];
  if (items.length > 0) return items.map((i) => i.subtopic);
  return INTERVIEW_SUBTOPICS[topic] ?? [];
}

// Predefined subtopics per topic; UI will also allow "Other" which opens a modal
export const INTERVIEW_SUBTOPICS: Record<EInterviewTopic, readonly string[]> = {
  [EInterviewTopic.REACT]: [
    "Components & Props",
    "JSX & Rendering",
    "State & Lifecycle",
    "Events & Forms (Controlled)",
    "Lists & Keys (Reconciliation)",
    "Context API",
    "Hooks: useState",
    "Hooks: useEffect",
    "Hooks: useLayoutEffect",
    "Hooks: useMemo",
    "Hooks: useCallback",
    "Hooks: useRef",
    "Hooks: useImperativeHandle",
    "Hooks: useId",
    "Hooks: useSyncExternalStore",
    "Hooks: useContext",
    "Hooks: useReducer",
    "Custom Hooks",
    "Refs & DOM: Referencing Values",
    "Refs & DOM: Manipulating the DOM",
    "Forwarding Refs",
    "Performance Optimization",
    "Memoization (React.memo/useMemo/useCallback)",
    "Error Boundaries",
    "Portals",
    "Fragments",
    "Strict Mode",
    "Concurrent Rendering (Basics)",
    "Suspense (Intro)",
    "Effects: Dependencies & Cleanup",
    "Controlled vs Uncontrolled Forms",
    "Data Fetching Patterns (High-level)",
    "useTransition & useDeferredValue (Basics)",
    "Error Handling Patterns",
  ],
  [EInterviewTopic.JAVASCRIPT]: [
    "Types & Coercion",
    "let/const/var & Scope",
    "Scope & Closures",
    "this, call/apply/bind",
    "Objects & Prototypes",
    "Prototypal Inheritance",
    "Classes",
    "Arrays & Iteration",
    "Functions & Higher-Order Functions",
    "Promises",
    "Async/Await",
    "Event Loop & Task/Microtask Queue",
    "Modules (ESM/CommonJS)",
    "Iterators & Generators",
    "Collections (Map/Set/WeakMap/WeakSet)",
    "Error Handling (try/catch)",
  ],
  [EInterviewTopic.TYPESCRIPT]: [
    "Basic & Literal Types",
    "Interfaces vs Types",
    "Generics",
    "Type Narrowing",
    "Utility Types",
    "Modules & Namespaces",
    "Declaration Merging",
    "JSX & React Types",
    "Strictness & Config",
    "Discriminated Unions",
    "Template Literal Types",
    "keyof/typeof/satisfies",
    "unknown & never",
    "Mapped & Conditional Types",
  ],
  [EInterviewTopic.HTML]: [
    "Semantics",
    "Forms",
    "Media",
    "Accessibility Basics",
    "SEO‑relevant Tags",
    "Document Structure & Meta",
    "Forms Validation",
  ],
  [EInterviewTopic.CSS]: [
    "Selectors",
    "Box Model",
    "Flexbox",
    "Grid",
    "Positioning",
    "Cascade & Specificity",
    "Responsive Design",
    "Animations & Transitions",
    "Custom Properties (CSS Variables)",
    "Container Queries",
    "CSS Layers",
  ],
  [EInterviewTopic.STATE_MANAGEMENT]: [
    "Redux Toolkit Patterns",
    "Immutability",
    "Selectors & Memoization",
    "Context vs Redux",
    "RTK Query Basics",
  ],
  [EInterviewTopic.ROUTING]: [
    "Declarative Routes",
    "Nested Routes",
    "Data Loading Basics",
    "Next.js File‑based Routing",
    "Server vs Client Components (Next.js)",
    "Dynamic Routes & Layouts",
  ],
  [EInterviewTopic.TESTING]: [
    "RTL Queries",
    "act & user‑event",
    "Jest Matchers",
    "Mocking",
    "Async Tests",
    "MSW & Network Mocking",
    "Accessibility Testing",
  ],
  [EInterviewTopic.PERFORMANCE]: [
    "Memoization",
    "Virtualization",
    "Bundle Splitting",
    "Code Splitting",
    "Network Optimizations",
    "Web Vitals (LCP/CLS/INP)",
    "Prefetching",
  ],
  [EInterviewTopic.ACCESSIBILITY]: [
    "ARIA Roles",
    "Keyboard Navigation",
    "Color Contrast",
    "Semantic HTML",
    "Focus Management",
    "Landmarks",
    "Accessible Names & Labels",
  ],
};

export const INTERVIEW_INGEST_TYPE_OPTIONS = [
  { label: EInterviewIngestType.REPO, value: EInterviewIngestType.REPO },
  { label: EInterviewIngestType.WEB, value: EInterviewIngestType.WEB },
] as const;

// Ingestion catalog processing
export async function runCatalogIngestion(params?: {
  topic?: string;
  maxConcurrency?: number;
}): Promise<IIngestRunResult> {
  const catalog = loadIngestCatalog();
  const topicKeys = params?.topic ? [params.topic] : Object.keys(catalog);
  const maxConcurrency = Math.max(1, Math.min(params?.maxConcurrency ?? 4, 8));

  const seenUrls = new Set<string>();
  const queue: { topic: string; item: IIngestCatalogItem }[] = [];

  for (const topic of topicKeys) {
    const items = catalog[topic] ?? [];
    for (const item of items) {
      if (!item.embedded && item.url && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        queue.push({ topic, item });
      }
    }
  }

  let started = 0;
  const ids: string[] = [];
  const errors: IIngestRunResult["errors"] = [];

  async function worker() {
    while (true) {
      const next = queue.shift();
      if (!next) return;
      const { topic, item } = next;
      try {
        const mode = item.ingestType === "repo" ? "repo" : "web";
        if (mode === "web") {
          const domain = new URL(item.url).hostname;
          const result = await ingestRepoOrWeb({
            mode: "web",
            seeds: [item.url],
            domain,
            prefix: undefined,
            topic: topic as EInterviewTopic,
            subtopic: item.subtopic,
            depth: 1,
            maxPages: 10,
            crawlDelayMs: 500,
            includePatterns: [],
            excludePatterns: [],
            autoPlan: true,
          } as any);
          ids.push(result.ingestionId);
        } else {
          const result = await ingestRepoOrWeb({
            mode: "repo",
            repoUrl: item.url,
            paths: [],
            topic: topic as EInterviewTopic,
            subtopic: item.subtopic,
            maxFiles: 200,
          } as any);
          ids.push(result.ingestionId);
        }
        started++;
      } catch (e: any) {
        errors.push({ topic, subtopic: item.subtopic, url: item.url, error: e?.message ?? String(e) });
      }
    }
  }

  const workers = Array.from({ length: maxConcurrency }, () => worker());
  await Promise.all(workers);

  return {
    attempted: queue.length + started,
    started,
    skippedDuplicateUrl: 0,
    errors,
    ids,
  };
}
