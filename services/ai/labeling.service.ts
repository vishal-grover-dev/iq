import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, OPENAI_PROMPTS, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { LABEL_RESOLVER_MIN_CONFIDENCE } from "@/constants/app.constants";
import { getStaticSubtopicMap } from "@/utils/static-ontology.utils";
import { createOpenAIClient } from "./openai.services";

/**
 * classifyLabels
 * Server-only: Compact classifier that maps a URL/path and optional title to { topic, subtopic, version, confidence }.
 * Accepts a whitelist of topics and per-topic subtopics; returns JSON strictly from the model.
 */
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
  // If caller didn't provide allowed subtopics or provided an empty mapping, fall back to dynamic ontology
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
  const parsed = parseJsonObject<any>(content, {});
  const topic: string = typeof parsed.topic === "string" ? parsed.topic : args.topicHint || "Unknown";
  const subtopic: string | null = typeof parsed.subtopic === "string" ? parsed.subtopic : null;
  const version: string | null = typeof parsed.version === "string" ? parsed.version : null;
  const confidenceNum: number =
    typeof parsed.confidence === "number" ? parsed.confidence : LABEL_RESOLVER_MIN_CONFIDENCE - 0.1;
  return { topic, subtopic, version, confidence: Math.max(0, Math.min(1, confidenceNum)) };
}
