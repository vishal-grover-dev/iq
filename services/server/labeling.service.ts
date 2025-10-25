import {
  ENABLE_DYNAMIC_LABEL_RESOLUTION,
  LABEL_RESOLVER_MIN_CONFIDENCE,
  OPENAI_API_KEY,
} from "@/constants/app.constants";
import { INTERVIEW_SUBTOPICS, INTERVIEW_TOPIC_OPTIONS } from "@/constants/interview-streams.constants";
import { AI_SERVICE_ERRORS, OPENAI_CONFIG, OPENAI_PROMPTS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { getStaticSubtopicMap } from "@/utils/static-ontology.utils";
import { createOpenAIClient } from "@/config/openai.config";
import { EIngestionMode } from "@/types/ingestion.types";

interface IClassifyResponse extends Record<string, unknown> {
  topic?: string;
  subtopic?: string;
  version?: string;
  confidence?: number;
}

type TLabelSource = "hint" | "rules" | "heuristic" | "llm";

interface IResolvedLabels {
  topic: string;
  subtopic: string | null;
  version: string | null;
  confidence: number;
  source: TLabelSource;
}

interface IResolveLabelsArgs {
  source: EIngestionMode;
  url?: string;
  path?: string;
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
  if (args.source === EIngestionMode.WEB && args.url) {
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
    const typedKey = key as keyof typeof INTERVIEW_SUBTOPICS;
    subsByTopic[key] = [...INTERVIEW_SUBTOPICS[typedKey]] as string[];
  }
  return { topics, subsByTopic };
}

export async function classifyLabels(args: {
  urlOrPath: string;
  siteOrRepo: string;
  title?: string;
  allowedTopics: string[];
  allowedSubtopicsByTopic: Record<string, string[]>;
  topicHint?: string;
}): Promise<{ topic: string; subtopic: string | null; version: string | null; confidence: number }> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = createOpenAIClient();
  const sys = [
    OPENAI_PROMPTS.LABELER_SYSTEM,
    "Return STRICT JSON only: { topic: string, subtopic: string|null, version: string|null, confidence: number }",
    "Topic MUST be from allowed topics. Subtopic SHOULD be from the allowed list when a close match exists; otherwise, propose a concise, sensible subtopic.",
    "Prefer the topic hint when plausible.",
  ].join(" ");

  const topicsJson = JSON.stringify(args.allowedTopics);
  let allowedSubs = args.allowedSubtopicsByTopic;
  if (!allowedSubs || Object.keys(allowedSubs).length === 0) {
    allowedSubs = getStaticSubtopicMap();
  }
  const subsJson = JSON.stringify(allowedSubs);
  const hint = args.topicHint ? `Topic hint: ${args.topicHint}` : "";

  const user = [
    `Resource: ${args.urlOrPath}`,
    `Site/Repo: ${args.siteOrRepo}`,
    args.title ? `Title: ${args.title}` : "",
    `Allowed topics: ${topicsJson}`,
    `Allowed subtopics by topic: ${subsJson}`,
    hint,
    "Respond with JSON only.",
  ]
    .filter(Boolean)
    .join("\n");

  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message?.content ?? "{}";

  const parsed = parseJsonObject<IClassifyResponse>(content, {});
  const topic: string = typeof parsed.topic === "string" ? parsed.topic : args.topicHint || "Unknown";
  const subtopic: string | null = typeof parsed.subtopic === "string" ? parsed.subtopic : null;
  const version: string | null = typeof parsed.version === "string" ? parsed.version : null;
  const confidenceNum: number =
    typeof parsed.confidence === "number" ? parsed.confidence : LABEL_RESOLVER_MIN_CONFIDENCE - 0.1;
  return { topic, subtopic, version, confidence: Math.max(0, Math.min(1, confidenceNum)) };
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
      args.source === EIngestionMode.WEB && args.url
        ? new URL(args.url).hostname
        : `${args.repoOwner || ""}/${args.repoName || ""}`;
    const urlOrPath = args.source === EIngestionMode.WEB ? args.url || "" : args.path || "";

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
