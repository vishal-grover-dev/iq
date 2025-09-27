import { ENABLE_DYNAMIC_LABEL_RESOLUTION, LABEL_RESOLVER_MIN_CONFIDENCE } from "@/constants/app.constants";
import { deriveLabelsFromUrl } from "@/utils/intelligent-web-adapter.utils";
import { INTERVIEW_SUBTOPICS, INTERVIEW_TOPIC_OPTIONS } from "@/constants/interview-streams.constants";
import { classifyLabels } from "@/services/ai.services";

export type TLabelSource = "hint" | "rules" | "heuristic" | "llm";

export interface IResolvedLabels {
  topic: string;
  subtopic: string | null;
  version: string | null;
  confidence: number;
  source: TLabelSource;
}

export interface IResolveLabelsArgs {
  source: "web" | "repo";
  url?: string; // for web
  path?: string; // for repo
  title?: string | null;
  topicHint?: string | null;
  subtopicHint?: string | null;
  versionHint?: string | null;
  repoOwner?: string;
  repoName?: string;
}

// No rules file: resolver relies on heuristics + LLM fallback only

const inMemoryCache = new Map<string, IResolvedLabels>();
const metrics = {
  ruleHits: 0,
  heuristicHits: 0,
  llmHits: 0,
  rejects: 0,
};

function cacheKey(args: IResolveLabelsArgs): string {
  if (args.source === "web" && args.url) {
    try {
      const u = new URL(args.url);
      return `web|${u.origin.toLowerCase()}${u.pathname.toLowerCase()}`;
    } catch {
      return `web|${(args.url || "").toLowerCase()}`;
    }
  }
  const repo = `${(args.repoOwner || "").toLowerCase()}/${(args.repoName || "").toLowerCase()}`;
  return `repo|${repo}|${(args.path || "").toLowerCase()}`;
}

function getAllowedTopicsAndSubtopics(): { topics: string[]; subsByTopic: Record<string, string[]> } {
  const topics = INTERVIEW_TOPIC_OPTIONS.map((t) => t.value as string);
  const subsByTopic: Record<string, string[]> = {};
  for (const key of Object.keys(INTERVIEW_SUBTOPICS)) {
    const k = key as keyof typeof INTERVIEW_SUBTOPICS;
    subsByTopic[key] = [...INTERVIEW_SUBTOPICS[k]] as string[];
  }
  return { topics, subsByTopic };
}

// (rules removed)

function deriveMdnSubtopicFromPath(p: string, topic: string | null | undefined): string | null {
  function toTitleCase(input: string): string {
    return input
      .replace(/[-_]+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
  function topicToMdnSlug(t: string | null | undefined): string | null {
    if (!t) return null;
    const lower = String(t).trim().toLowerCase();
    if (lower === "javascript") return "javascript";
    if (lower === "html") return "html";
    if (lower === "css") return "css";
    return null;
  }
  const slug = topicToMdnSlug(topic);
  if (!slug) return null;
  const base = `files/en-us/web/${slug}/`;
  if (!p.startsWith(base)) return null;
  const rest = p.slice(base.length);
  const segs = rest.split("/").filter(Boolean);
  if (segs.length === 0) return null;
  const first = segs[0]?.toLowerCase();
  if (first === "guide" || first === "guides") {
    const leaf = segs[1] ?? "guide";
    return `Guide/${toTitleCase(leaf)}`;
  }
  if (first === "how_to" || first === "howto") {
    const leaf = segs[1] ?? "how-to";
    return `How-to/${toTitleCase(leaf)}`;
  }
  if (first === "reference") {
    const cat = (segs[1] ?? "reference").toLowerCase();
    if (cat === "global_objects") return "Reference/Global Objects";
    if (cat === "operators") return "Reference/Operators";
    if (cat === "elements") return "Reference/Elements";
    if (cat === "global_attributes") return "Reference/Global Attributes";
    return `Reference/${toTitleCase(cat)}`;
  }
  if (first === "index.md") return "Overview";
  return toTitleCase(segs[0]!);
}

// (rules removed)

export function getLabelResolverMetrics() {
  return { ...metrics };
}

export function resetLabelResolverMetrics() {
  metrics.ruleHits = 0;
  metrics.heuristicHits = 0;
  metrics.llmHits = 0;
  metrics.rejects = 0;
}

export async function resolveLabels(args: IResolveLabelsArgs): Promise<IResolvedLabels> {
  const key = cacheKey(args);
  const cached = inMemoryCache.get(key);
  if (cached) return cached;

  const minConfidence = Math.max(0, Math.min(1, LABEL_RESOLVER_MIN_CONFIDENCE));

  const fillAndCache = (base: IResolvedLabels): IResolvedLabels => {
    // Never override explicit hints
    const topic = args.topicHint ?? base.topic;
    const subtopic = args.subtopicHint ?? base.subtopic;
    const version = base.version ?? args.versionHint ?? null;
    const out = { ...base, topic, subtopic, version };
    inMemoryCache.set(key, out);
    return out;
  };

  // 1) Rules disabled: skip directly to heuristics

  // 2) Heuristics
  if (args.source === "web" && args.url) {
    const h = deriveLabelsFromUrl(args.url, args.topicHint ?? undefined);
    metrics.heuristicHits += 1;
    const base: IResolvedLabels = {
      topic: h.topic,
      subtopic: h.subtopic,
      version: h.version,
      confidence: 0.6,
      source: "heuristic",
    };
    const out = fillAndCache(base);
    // If confidence low and dynamic enabled, try LLM fallback
    if (ENABLE_DYNAMIC_LABEL_RESOLUTION && (!out.subtopic || out.topic === "Unknown")) {
      const { topics, subsByTopic } = getAllowedTopicsAndSubtopics();
      try {
        const llm = await classifyLabels({
          urlOrPath: args.url,
          siteOrRepo: new URL(args.url).hostname,
          title: args.title ?? undefined,
          allowedTopics: topics,
          allowedSubtopicsByTopic: subsByTopic,
          topicHint: args.topicHint ?? undefined,
        });
        if (llm.confidence >= minConfidence) {
          metrics.llmHits += 1;
          return fillAndCache({
            topic: llm.topic,
            subtopic: llm.subtopic,
            version: llm.version,
            confidence: llm.confidence,
            source: "llm",
          });
        }
        metrics.rejects += 1;
      } catch {
        // ignore LLM errors; keep heuristic
      }
    }
    return out;
  }

  // repo heuristics
  const topic = args.topicHint || "Unknown";
  const sub = args.path ? deriveMdnSubtopicFromPath(args.path, topic) : null;
  metrics.heuristicHits += 1;
  const baseRepo: IResolvedLabels = {
    topic,
    subtopic: sub,
    version: args.versionHint ?? null,
    confidence: 0.6,
    source: "heuristic",
  };
  const outRepo = fillAndCache(baseRepo);
  if (ENABLE_DYNAMIC_LABEL_RESOLUTION && (!outRepo.subtopic || outRepo.topic === "Unknown")) {
    try {
      const { topics, subsByTopic } = getAllowedTopicsAndSubtopics();
      const llm = await classifyLabels({
        urlOrPath: args.path || "",
        siteOrRepo: `${args.repoOwner || ""}/${args.repoName || ""}`,
        title: args.title ?? undefined,
        allowedTopics: topics,
        allowedSubtopicsByTopic: subsByTopic,
        topicHint: args.topicHint ?? undefined,
      });
      if (llm.confidence >= minConfidence) {
        metrics.llmHits += 1;
        return fillAndCache({
          topic: llm.topic,
          subtopic: llm.subtopic,
          version: llm.version,
          confidence: llm.confidence,
          source: "llm",
        });
      }
      metrics.rejects += 1;
    } catch {
      // ignore LLM errors
    }
  }
  return outRepo;
}
