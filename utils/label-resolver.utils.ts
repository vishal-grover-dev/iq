import { ENABLE_DYNAMIC_LABEL_RESOLUTION, LABEL_RESOLVER_MIN_CONFIDENCE } from "@/constants/app.constants";
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

const inMemoryCache = new Map<string, IResolvedLabels>();
const metrics = {
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

export function getLabelResolverMetrics() {
  return { ...metrics };
}

export function resetLabelResolverMetrics() {
  metrics.llmHits = 0;
  metrics.rejects = 0;
}

export async function resolveLabels(args: IResolveLabelsArgs): Promise<IResolvedLabels> {
  const key = cacheKey(args);
  const cached = inMemoryCache.get(key);
  if (cached) return cached;

  const minConfidence = Math.max(0, Math.min(1, LABEL_RESOLVER_MIN_CONFIDENCE));

  const finalize = (base: IResolvedLabels): IResolvedLabels => {
    const topic = args.topicHint ?? base.topic;
    const subtopic = args.subtopicHint ?? base.subtopic;
    const version = args.versionHint ?? base.version ?? null;
    const out = { ...base, topic, subtopic, version };
    inMemoryCache.set(key, out);
    return out;
  };

  // If dynamic disabled, honor hints only and avoid guessing
  if (!ENABLE_DYNAMIC_LABEL_RESOLUTION) {
    const base: IResolvedLabels = {
      topic: args.topicHint || "Unknown",
      subtopic: args.subtopicHint ?? null,
      version: args.versionHint ?? null,
      confidence: 0,
      source: args.topicHint || args.subtopicHint ? "hint" : "llm",
    };
    return finalize(base);
  }

  try {
    const { topics, subsByTopic } = getAllowedTopicsAndSubtopics();
    const siteOrRepo =
      args.source === "web" && args.url ? new URL(args.url).hostname : `${args.repoOwner || ""}/${args.repoName || ""}`;
    const urlOrPath = args.source === "web" ? args.url || "" : args.path || "";

    const llm = await classifyLabels({
      urlOrPath,
      siteOrRepo,
      title: args.title ?? undefined,
      allowedTopics: topics,
      allowedSubtopicsByTopic: subsByTopic,
      topicHint: args.topicHint ?? undefined,
    });

    const acceptedSubtopic = llm.confidence >= minConfidence ? llm.subtopic : null;
    const base: IResolvedLabels = {
      topic: llm.topic,
      subtopic: acceptedSubtopic,
      version: llm.version,
      confidence: llm.confidence,
      source: "llm",
    };
    metrics.llmHits += 1;
    if (acceptedSubtopic === null) metrics.rejects += 1;
    return finalize(base);
  } catch {
    const base: IResolvedLabels = {
      topic: args.topicHint || "Unknown",
      subtopic: args.subtopicHint ?? null,
      version: args.versionHint ?? null,
      confidence: 0,
      source: args.topicHint || args.subtopicHint ? "hint" : "llm",
    };
    return finalize(base);
  }
}
