import { EInterviewIngestType, EInterviewStream, EInterviewTopic } from "@/types/upload.types";
import { ingestRepoOrWeb } from "@/services/ingest.services";
import { getIngestionStatus, processIngestion } from "@/services/ingest.services";
import { IIngestCatalogItem, IIngestRunResult, ILogger, TIngestCatalog } from "@/types/interview-streams.types";
import fs from "fs";
import path from "path";

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

function getCatalogPath(): string {
  return path.join(process.cwd(), "data", "interview-ingest-catalog.json");
}

// Load catalog once and provide helpers
export function loadIngestCatalog(): TIngestCatalog {
  const file = fs.readFileSync(getCatalogPath(), "utf-8");
  return JSON.parse(file) as TIngestCatalog;
}

export function getSubtopicsFromCatalog(topic: EInterviewTopic): readonly string[] {
  const catalog = loadIngestCatalog();
  const items = catalog[topic] ?? [];
  if (items.length > 0) return items.map((i) => i.subtopic);
  return INTERVIEW_SUBTOPICS[topic] ?? [];
}

function persistEmbeddedFlags(completedUrls: Set<string>, logger: ILogger) {
  const catalogPath = getCatalogPath();
  try {
    const current = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as TIngestCatalog;
    let updates = 0;
    for (const topicKey of Object.keys(current)) {
      const arr = current[topicKey] ?? [];
      for (const item of arr) {
        if (!item.embedded && completedUrls.has(item.url)) {
          (item as IIngestCatalogItem).embedded = true;
          updates++;
        }
      }
    }
    if (updates > 0) {
      fs.writeFileSync(catalogPath, JSON.stringify(current, null, 2) + "\n", "utf-8");
      logger.info("[ingest] catalog updated", { updates, path: catalogPath });
    } else {
      logger.info("[ingest] catalog up-to-date", { path: catalogPath });
    }
  } catch (e: any) {
    logger.error("[ingest] failed to update catalog", { error: e?.message });
  }
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
  logger?: ILogger;
  waitUntilComplete?: boolean;
  pollMs?: number;
  timeoutMs?: number;
}): Promise<IIngestRunResult> {
  const logger: ILogger = params?.logger ?? console;
  const catalog = loadIngestCatalog();
  const topicKeys = params?.topic ? [params.topic] : Object.keys(catalog);
  const maxConcurrency = Math.max(1, Math.min(params?.maxConcurrency ?? 4, 8));
  const waitUntilComplete = params?.waitUntilComplete ?? true;
  const pollMs = Math.max(500, params?.pollMs ?? 1500);
  const timeoutMs = Math.max(5_000, params?.timeoutMs ?? 30 * 60 * 1000); // default 30 minutes

  logger.info("[ingest] starting", { topicKeys, maxConcurrency, waitUntilComplete });

  const seenUrls = new Set<string>();
  const queue: { topic: string; item: IIngestCatalogItem }[] = [];

  for (const topic of topicKeys) {
    const items = catalog[topic] ?? [];
    for (const item of items) {
      if (!item.embedded && item.url && !seenUrls.has(item.url)) {
        seenUrls.add(item.url);
        queue.push({ topic, item });
      } else if (item.embedded) {
        logger.debug?.("[ingest] skip: already embedded", { topic, url: item.url, subtopic: item.subtopic });
      } else if (seenUrls.has(item.url)) {
        logger.debug?.("[ingest] skip: duplicate url in batch", { topic, url: item.url });
      }
    }
  }

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function pollUntilDone(mode: "repo" | "web", id: string) {
    const start = Date.now();
    while (true) {
      const st = await getIngestionStatus(id);
      const step = (st?.progress as any)?.step ?? st?.status;
      const processed = (st?.progress as any)?.processed ?? 0;
      const total = (st?.progress as any)?.totalPlanned ?? undefined;
      logger.debug?.("[ingest] poll", { id, step, processed, total });
      if (st?.status === "completed" || step === "completed") return;
      if (st?.status === "failed") throw new Error(st?.error ?? "ingestion failed");
      if (Date.now() - start > timeoutMs) throw new Error("timeout waiting for ingestion completion");
      await sleep(pollMs);
    }
  }

  let started = 0;
  const ids: string[] = [];
  const errors: IIngestRunResult["errors"] = [];
  const completedUrls = new Set<string>();

  async function worker(workerId: number) {
    logger.debug?.("[ingest] worker ready", { workerId });
    while (true) {
      const next = queue.shift();
      if (!next) return;
      const { topic, item } = next;
      try {
        const mode = item.ingestType === "repo" ? "repo" : "web";
        logger.info("[ingest] starting item", { workerId, mode, topic, subtopic: item.subtopic, url: item.url });
        const result = await ingestRepoOrWeb(
          mode === "web"
            ? ({
                mode: "web",
                seeds: [item.url],
                domain: new URL(item.url).hostname,
                prefix: undefined,
                topic: topic as EInterviewTopic,
                subtopic: item.subtopic,
                depth: 1,
                maxPages: 10,
                crawlDelayMs: 500,
                includePatterns: [],
                excludePatterns: [],
                autoPlan: true,
              } as any)
            : ({
                mode: "repo",
                repoUrl: item.url,
                paths: [],
                topic: topic as EInterviewTopic,
                subtopic: item.subtopic,
                maxFiles: 200,
              } as any)
        );
        const id = result.ingestionId;
        logger.info("[ingest] enqueued", { workerId, mode, id });
        ids.push(id);

        // Trigger processing explicitly and optionally wait until completion
        await processIngestion(mode, id);
        logger.debug?.("[ingest] process triggered", { workerId, id });
        if (waitUntilComplete) {
          await pollUntilDone(mode, id);
          completedUrls.add(item.url);
          logger.info("[ingest] completed item", { workerId, id });
        }
        started++;
      } catch (e: any) {
        const errMsg = e?.message ?? String(e);
        logger.error("[ingest] failed", { workerId, topic, url: item.url, error: errMsg });
        errors.push({ topic, subtopic: item.subtopic, url: item.url, error: errMsg });
      }
    }
  }

  const workers = Array.from({ length: maxConcurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  // Persist embedded=true for completed URLs
  persistEmbeddedFlags(completedUrls, logger);

  logger.info("[ingest] completed", {
    attempted: queue.length + started,
    started,
    errors: errors.length,
    ids: ids.length,
  });
  return {
    attempted: queue.length + started,
    started,
    skippedDuplicateUrl: 0,
    errors,
    ids,
  };
}
