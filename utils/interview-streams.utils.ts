import { EInterviewIngestType, EInterviewStream, EInterviewTopic } from "@/types/upload.types";
import { ingestRepoOrWeb } from "@/services/ingest.services";
import { getIngestionStatus, processIngestion } from "@/services/ingest.services";
import { IIngestCatalogItem, IIngestRunResult, ILogger, TIngestCatalog } from "@/types/interview-streams.types";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";

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

function persistEmbeddedFlags(completedUrls: Set<string>, logger: ILogger, alsoMarkEmbedded?: Set<string>) {
  const catalogPath = getCatalogPath();
  try {
    const current = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as TIngestCatalog;
    let updates = 0;
    // Local normalizer for comparison
    const norm = (raw: string) => {
      try {
        const u = new URL(raw);
        u.hostname = u.hostname.toLowerCase();
        u.hash = "";
        const tracking = new Set([
          "utm_source",
          "utm_medium",
          "utm_campaign",
          "utm_term",
          "utm_content",
          "gclid",
          "fbclid",
          "igshid",
          "mc_cid",
          "mc_eid",
          "ref",
          "ref_src",
          "ref_url",
        ]);
        const kept: Array<[string, string]> = [];
        u.searchParams.forEach((v, k) => {
          if (!tracking.has(k.toLowerCase())) kept.push([k, v]);
        });
        kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
        u.search = kept.length
          ? "?" + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
          : "";
        if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) u.port = "";
        let pathname = u.pathname.replace(/\/+/g, "/");
        if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
        u.pathname = pathname;
        return u.toString();
      } catch {
        return raw;
      }
    };
    const completedNorm = new Set<string>(Array.from(completedUrls).map(norm));
    const alsoNorm = new Set<string>(Array.from(alsoMarkEmbedded ?? new Set<string>()).map(norm));
    for (const topicKey of Object.keys(current)) {
      const arr = current[topicKey] ?? [];
      for (const item of arr) {
        const itemNorm = norm(item.url);
        if (!item.embedded && (completedNorm.has(itemNorm) || alsoNorm.has(itemNorm))) {
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

  // URL normalization for dedupe and host grouping
  function normalizeUrl(raw: string): string {
    try {
      const u = new URL(raw);
      u.hostname = u.hostname.toLowerCase();
      u.hash = "";
      // drop common tracking params; sort deterministically
      const tracking = new Set([
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "gclid",
        "fbclid",
        "igshid",
        "mc_cid",
        "mc_eid",
        "ref",
        "ref_src",
        "ref_url",
      ]);
      const kept: Array<[string, string]> = [];
      u.searchParams.forEach((v, k) => {
        if (!tracking.has(k.toLowerCase())) kept.push([k, v]);
      });
      kept.sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])));
      u.search = kept.length
        ? "?" + kept.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&")
        : "";
      if ((u.protocol === "http:" && u.port === "80") || (u.protocol === "https:" && u.port === "443")) u.port = "";
      let pathname = u.pathname.replace(/\/+/g, "/");
      if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
      u.pathname = pathname;
      return u.toString();
    } catch {
      return raw;
    }
  }

  const seenNormalized = new Set<string>();
  const rawToNormalized = new Map<string, string>();
  const normalizedToRaw = new Map<string, string>();
  const normalizedToRaws = new Map<string, Set<string>>();
  const duplicateRawUrls: string[] = [];

  // Build candidate list with normalization and local dedupe
  type TQueueItem = { topic: string; item: IIngestCatalogItem; normalizedUrl: string; host?: string };
  const preliminaryQueue: TQueueItem[] = [];
  for (const topic of topicKeys) {
    const items = catalog[topic] ?? [];
    for (const item of items) {
      if (item.embedded) {
        logger.debug?.("[ingest] skip: already embedded", { topic, url: item.url, subtopic: item.subtopic });
        continue;
      }
      if (!item.url) continue;
      if (item.ingestType === "web") {
        const norm = normalizeUrl(item.url);
        rawToNormalized.set(item.url, norm);
        // Track all raw URLs mapping to the same normalized URL (for later flag propagation)
        const bucket = normalizedToRaws.get(norm) ?? new Set<string>();
        bucket.add(item.url);
        normalizedToRaws.set(norm, bucket);
        if (seenNormalized.has(norm)) {
          duplicateRawUrls.push(item.url);
          logger.debug?.("[ingest] skip: duplicate after normalization", { topic, url: item.url, normalized: norm });
          continue;
        }
        seenNormalized.add(norm);
        normalizedToRaw.set(norm, item.url);
        const host = (() => {
          try {
            return new URL(norm).hostname;
          } catch {
            return undefined;
          }
        })();
        preliminaryQueue.push({ topic, item, normalizedUrl: norm, host });
      } else {
        // Repo mode: keep as-is
        preliminaryQueue.push({ topic, item, normalizedUrl: item.url });
      }
    }
  }

  // Preflight skip for existing web documents (bucket='web', path=normalized)
  const supabase = getSupabaseServiceRoleClient();
  const webCandidates = preliminaryQueue.filter((q) => q.item.ingestType === "web");
  const preflightEmbedded = new Set<string>();
  if (webCandidates.length > 0) {
    const paths = webCandidates.map((q) => q.normalizedUrl);
    const { data: existingDocs, error: existingErr } = await supabase
      .from("documents")
      .select("path")
      .eq("bucket", "web")
      .in("path", paths);
    if (existingErr) {
      logger.warn("[ingest] preflight check failed", { error: existingErr.message });
    }
    const existingSet = new Set<string>((existingDocs ?? []).map((d: any) => d.path as string));
    for (const q of webCandidates) {
      if (existingSet.has(q.normalizedUrl)) {
        preflightEmbedded.add(q.item.url);
        logger.info("[ingest] preflight-skip: already ingested", { url: q.item.url, normalized: q.normalizedUrl });
      }
    }

    // Persist preflight embedded flags immediately to avoid re-enqueue on reruns
    if (preflightEmbedded.size > 0) {
      try {
        persistEmbeddedFlags(new Set<string>(), logger, preflightEmbedded);
      } catch (e: any) {
        logger.warn("[ingest] preflight catalog persist failed", { error: e?.message });
      }
    }
  }

  // Final queue: exclude preflight-skipped
  const queue: Array<TQueueItem & { host?: string }> = preliminaryQueue.filter(
    (q) => !(q.item.ingestType === "web" && preflightEmbedded.has(q.item.url))
  );

  function sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Track in-flight items to allow workers to exit when all work is done
  let inFlightCount = 0;

  async function pollUntilDone(mode: "repo" | "web", id: string) {
    const start = Date.now();
    while (true) {
      const st = await getIngestionStatus(id);
      const step = (st as any)?.inflight?.step ?? st?.status;
      const processed = (st as any)?.inflight?.processed ?? 0;
      const total = (st as any)?.inflight?.totalPlanned ?? undefined;
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
  const hostBusy = new Map<string, boolean>();

  async function worker(workerId: number) {
    logger.debug?.("[ingest] worker ready", { workerId });
    while (true) {
      // pick next item whose host is not busy (for web); repos have no host limit
      let nextIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const cand = queue[i];
        if (cand.item.ingestType !== "web") {
          nextIndex = i;
          break;
        }
        const h = cand.host ?? "";
        if (!hostBusy.get(h)) {
          nextIndex = i;
          hostBusy.set(h, true);
          break;
        }
      }
      if (nextIndex === -1) {
        // No available item right now. If no queued items remain and none are in-flight, exit the worker.
        if (queue.length === 0 && inFlightCount === 0) {
          logger.debug?.("[ingest] worker exit: no pending or in-flight items", { workerId });
          return;
        }
        // Otherwise, wait briefly and retry.
        await sleep(50);
        continue;
      }
      const next = queue.splice(nextIndex, 1)[0]!;
      const { topic, item } = next;
      try {
        inFlightCount++;
        const mode = item.ingestType === "repo" ? "repo" : "web";
        logger.info("[ingest] starting item", {
          workerId,
          mode,
          topic,
          subtopic: item.subtopic,
          url: item.url,
          normalized: next.normalizedUrl,
          baseURL: mode === "web" ? new URL(next.normalizedUrl).origin : undefined,
        });
        const result = await ingestRepoOrWeb(
          mode === "web"
            ? ({
                mode: "web",
                seeds: [next.normalizedUrl],
                domain: new URL(next.normalizedUrl).hostname,
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
          // Completion verification: ensure some documents/chunks were stored for this ingestion
          try {
            const supabase = getSupabaseServiceRoleClient();
            const { data: docs } = await supabase.from("documents").select("id").eq("ingestion_id", id).limit(1);
            let hasCoverage = !!(docs && docs.length > 0);
            if (!hasCoverage) {
              // Retry once with longer crawl delay for web
              if (mode === "web") {
                logger.warn("[ingest] zero coverage; retrying with longer delay", { url: next.normalizedUrl });
                const retry = await ingestRepoOrWeb({
                  mode: "web",
                  seeds: [next.normalizedUrl],
                  domain: new URL(next.normalizedUrl).hostname,
                  prefix: undefined,
                  topic: topic as EInterviewTopic,
                  subtopic: item.subtopic,
                  depth: 1,
                  maxPages: 10,
                  crawlDelayMs: 1000,
                  includePatterns: [],
                  excludePatterns: [],
                  autoPlan: true,
                } as any);
                await processIngestion("web", retry.ingestionId);
                await pollUntilDone("web", retry.ingestionId);
                const { data: docs2 } = await supabase
                  .from("documents")
                  .select("id")
                  .eq("ingestion_id", retry.ingestionId)
                  .limit(1);
                hasCoverage = !!(docs2 && docs2.length > 0);
              }
            }
            // Final existence check by normalized path in case of race with another run
            if (!hasCoverage) {
              const { data: existsByPath } = await supabase
                .from("documents")
                .select("id")
                .eq("bucket", "web")
                .eq("path", next.normalizedUrl)
                .limit(1);
              if (existsByPath && existsByPath.length > 0) {
                hasCoverage = true;
              }
            }
            if (hasCoverage) {
              completedUrls.add(item.url);
              logger.info("[ingest] completed item", { workerId, id });
              // Persist this item's embedded flag immediately to avoid re-enqueue on reruns
              try {
                const also = normalizedToRaws.get(next.normalizedUrl) ?? new Set<string>();
                persistEmbeddedFlags(new Set<string>([item.url]), logger, also);
              } catch (e: any) {
                logger.warn("[ingest] catalog persist failed", { error: e?.message, url: item.url });
              }
            } else {
              logger.warn("[ingest] completed but no coverage", { workerId, id });
            }
          } catch (verr: any) {
            logger.warn("[ingest] verification failed", { error: verr?.message });
          }
        }
        started++;
      } catch (e: any) {
        const errMsg = e?.message ?? String(e);
        logger.error("[ingest] failed", { workerId, topic, url: item.url, error: errMsg });
        errors.push({ topic, subtopic: item.subtopic, url: item.url, error: errMsg });
      } finally {
        if (next.item.ingestType === "web") {
          const h = next.host ?? "";
          if (h) hostBusy.set(h, false);
        }
        inFlightCount--;
      }
    }
  }

  const workers = Array.from({ length: maxConcurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  // Persist embedded=true for completed URLs and any preflight-skipped ones
  persistEmbeddedFlags(completedUrls, logger, preflightEmbedded);

  logger.info("[ingest] completed", {
    attempted: preliminaryQueue.length - preflightEmbedded.size,
    started,
    errors: errors.length,
    ids: ids.length,
  });
  return {
    attempted: preliminaryQueue.length - preflightEmbedded.size,
    started,
    skippedDuplicateUrl: duplicateRawUrls.length,
    errors,
    ids,
  };
}
