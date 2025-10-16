import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { parseJsonObject } from "@/utils/json.utils";
import type { IMcqItemView } from "@/types/mcq.types";
import { EPromptMode, EBloomLevel, EDifficulty, EQuestionStyle } from "@/types/mcq.types";
import {
  buildGeneratorMessages,
  buildJudgeMessages,
  buildReviserMessages,
  generateQuestionPrompt,
} from "@/utils/mcq-prompt.utils";
import { extractFirstCodeFence, hasValidCodeBlock, questionRepeatsCodeBlock } from "@/utils/mcq.utils";
import { LABEL_RESOLVER_MIN_CONFIDENCE } from "@/constants/app.constants";
import {
  getStaticSubtopicMap,
  getStaticTopicList,
  getStaticTopicWeights,
  getStaticSubtopicsForTopic,
} from "@/utils/static-ontology.utils";
import { calculateCoverageWeights, weightedRandomIndex } from "@/utils/selection.utils";
import { AI_SERVICE_ERRORS, OPENAI_PROMPTS, OPENAI_CONFIG } from "@/constants/generation.constants";

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    const withStatus = error as { status?: number; response?: { status?: number } };
    if (typeof withStatus.status === "number") {
      return withStatus.status;
    }
    if (withStatus.response && typeof withStatus.response.status === "number") {
      return withStatus.response.status;
    }
  }
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch (jsonError) {
    return String(jsonError);
  }
}

/**
 * getEmbeddings
 * Server-only: Returns 1536-d embeddings for the provided texts using OpenAI `text-embedding-3-small`.
 */
export async function getEmbeddings(
  texts: string[],
  options?: { batchSize?: number; truncateCharsPerItem?: number; maxRetries?: number }
): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const batchSize = Math.max(1, Math.min(options?.batchSize ?? 64, 256));
  const truncateChars = Math.max(0, options?.truncateCharsPerItem ?? 8000); // ~2k tokens
  const maxRetries = Math.max(0, options?.maxRetries ?? 2);

  // Pre-truncate long items to avoid 413/400 from excessive tokens per item
  const prepared = texts.map((t) => (truncateChars > 0 && t.length > truncateChars ? t.slice(0, truncateChars) : t));

  const out: number[][] = [];
  for (let i = 0; i < prepared.length; i += batchSize) {
    const slice = prepared.slice(i, i + batchSize);
    let attempt = 0;
    // simple retry with exponential backoff for 429/5xx
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await client.embeddings.create({ model: OPENAI_CONFIG.EMBEDDING_MODEL, input: slice });
        const data = res.data;
        if (!Array.isArray(data) || data.length !== slice.length) {
          throw new Error(AI_SERVICE_ERRORS.EMBEDDINGS_COUNT_MISMATCH);
        }
        for (const d of data) out.push(d.embedding as number[]);
        break;
      } catch (err) {
        const status = getErrorStatus(err);
        const retriable = status === 429 || (typeof status === "number" && status >= 500);
        if (!retriable || attempt >= maxRetries) {
          throw new Error(getErrorMessage(err) ?? AI_SERVICE_ERRORS.EMBEDDINGS_FAILED);
        }
        const sleepMs = 500 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, sleepMs));
        attempt += 1;
      }
    }
  }
  return out;
}

/**
 * rerank
 * Server-only LLM-as-reranker using `gpt-4o-mini`. Returns one score per input text, same order.
 */
export async function rerank(query: string, texts: string[]): Promise<number[]> {
  if (!query || texts.length === 0) return [];
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const system = OPENAI_PROMPTS.RERANKER_SYSTEM;
  const prompt = [
    `Query: ${query}`,
    "Passages:",
    ...texts.map((t, i) => `${i}. ${t.slice(0, 700)}`),
    'Return JSON only: { "items": [ { "index": number, "score": number } ] }',
  ].join("\n");
  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  const parsed = parseJsonObject<any>(content, { items: [] });
  const scores: number[] = Array(texts.length).fill(0);
  const items: Array<{ index: number; score: number }> = Array.isArray(parsed.items) ? parsed.items : [];
  for (const it of items) {
    if (typeof it?.index === "number" && typeof it?.score === "number" && it.index >= 0 && it.index < texts.length) {
      scores[it.index] = it.score;
    }
  }
  return scores;
}

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
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
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

/**
 * suggestCrawlHeuristics
 * Server-only helper: Given a seed URL and its HTML content, ask the LLM to propose
 * generic crawl heuristics as strict JSON: includePatterns (regex strings anchored to pathname),
 * optional depthMap (pathname prefix -> depth number 0-5), and optional additional seeds
 * limited to the same domain.
 */
export async function suggestCrawlHeuristics(args: {
  url: string;
  htmlPreview: string;
  navigationPreview?: Array<{ path: string; title?: string | null }>; // optional sampled links
}): Promise<{
  includePatterns: string[];
  depthMap?: Record<string, number>;
  seeds?: string[];
}> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { url, htmlPreview, navigationPreview } = args;
  const sys = [
    "You design safe crawl heuristics for documentation sites.",
    "Rules:",
    "- Propose regexes that match pathname prefixes for docs sections only (e.g., ^/docs, ^/reference).",
    "- Prefer 1-3 concise includePatterns.",
    "- depthMap keys are pathname prefixes; values are integers 0-5.",
    "- seeds must be same-origin URLs, minimal in number (<=3), and representative sections.",
    'Return STRICT JSON: { "includePatterns": string[], "depthMap"?: Record<string, number>, "seeds"?: string[] }',
  ].join("\n");

  const doc = htmlPreview.slice(0, 5000);
  const nav = (navigationPreview ?? [])
    .slice(0, 20)
    .map((l, i) => `${i}. ${l.path}${l.title ? ` — ${l.title}` : ""}`)
    .join("\n");

  // Few-shot examples (domain-agnostic)
  const examples = [
    {
      seed: "https://example.dev/reference",
      preview: "<title>Reference – Example</title>",
      nav: ["/reference/api", "/reference/components", "/learn"],
      out: {
        includePatterns: ["^/reference"],
        depthMap: { "/reference": 3 },
        seeds: ["https://example.dev/reference"],
      },
    },
    {
      seed: "https://docs.site.org/guide/getting-started",
      preview: "<title>Guide – Getting started</title>",
      nav: ["/guide", "/api", "/blog"],
      out: { includePatterns: ["^/guide"], depthMap: { "/guide": 2 }, seeds: ["https://docs.site.org/guide"] },
    },
  ];

  const user = [
    `Seed URL: ${url}`,
    "HTML Preview:",
    doc,
    navigationPreview && navigationPreview.length ? "Navigation Preview (paths):\n" + nav : "",
    "Examples:",
    ...examples.map(
      (e, i) => `Ex${i + 1} Input: ${e.seed}\nNav: ${e.nav.join(", ")}\nEx${i + 1} Output: ${JSON.stringify(e.out)}`
    ),
    'Return JSON only: { "includePatterns": string[], "depthMap"?: {"/path": number}, "seeds"?: string[] }',
  ].join("\n\n");

  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  const parsed = parseJsonObject<any>(res.choices[0]?.message?.content ?? "{}", {});

  const includePatterns: string[] = Array.isArray(parsed.includePatterns)
    ? parsed.includePatterns.filter((s: any) => typeof s === "string" && s.length > 0).slice(0, 5)
    : [];
  const seeds: string[] | undefined = Array.isArray(parsed.seeds)
    ? parsed.seeds.filter((s: any) => typeof s === "string" && s.startsWith(new URL(url).origin)).slice(0, 3)
    : undefined;
  const depthMap: Record<string, number> | undefined = (() => {
    const obj = parsed.depthMap;
    if (!obj || typeof obj !== "object") return undefined;
    const out: Record<string, number> = {};
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof k === "string" && typeof v === "number") {
        const bounded = Math.max(0, Math.min(5, Math.floor(v)));
        out[k] = bounded;
      }
    }
    return Object.keys(out).length ? out : undefined;
  })();

  return { includePatterns, seeds, depthMap };
}

/**
 * generateMcqFromContext
 * Server-only: Generates one MCQ grounded in provided context using OpenAI chat with strict JSON output.
 */
export async function generateMcqFromContext(args: {
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  difficulty?: EDifficulty;
  bloomLevel?: EBloomLevel;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
  mode?: EPromptMode;
  codingMode?: boolean;
  negativeExamples?: string[];
  avoidTopics?: string[];
  avoidSubtopics?: string[];
  questionStyle?: EQuestionStyle;
}): Promise<IMcqItemView> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  // Fetch available subtopics for this topic (dynamic ontology) to guide generation
  const availableSubtopics = getStaticSubtopicsForTopic(args.topic);

  const styleInfo = buildQuestionStyleInstruction(args.questionStyle, !!args.codingMode, args.bloomLevel);

  const { system, user } = buildGeneratorMessages({
    topic: args.topic,
    subtopic: args.subtopic ?? undefined,
    version: args.version ?? undefined,
    difficulty: args.difficulty,
    bloomLevel: args.bloomLevel,
    contextItems: args.contextItems,
    mode: args.mode ?? EPromptMode.FEW_SHOT,
    examplesCount: 12,
    codingMode: args.codingMode,
    negativeExamples: args.negativeExamples,
    availableSubtopics,
    avoidTopics: args.avoidTopics,
    avoidSubtopics: args.avoidSubtopics,
    questionStyle: styleInfo?.style,
    extraInstructions: styleInfo?.instruction ?? null,
  });

  // Structured metrics: prompt context (avoid lists, negatives, ontology)
  try {
    console.log("generation_prompt_context", {
      topic: args.topic,
      subtopic: args.subtopic ?? null,
      coding_mode: !!args.codingMode,
      available_subtopics_count: (availableSubtopics ?? []).length,
      avoid_topics_count: (args.avoidTopics ?? []).length,
      avoid_subtopics_count: (args.avoidSubtopics ?? []).length,
      negative_examples_count: (args.negativeExamples ?? []).length,
      question_style_requested: args.questionStyle ?? null,
      question_style_applied: styleInfo?.style ?? null,
    });
  } catch (_) {
    // no-op
  }

  if (styleInfo?.style) {
    try {
      console.log("generation_style_target", {
        requested: args.questionStyle ?? null,
        applied: styleInfo.style,
        coding_mode: !!args.codingMode,
        bloom_level: args.bloomLevel ?? null,
      });
    } catch (_) {
      // ignore
    }
  }
  const buildSchema = () => ({
    name: "mcq_item",
    strict: true,
    schema: (() => {
      const citationsItem = {
        type: "object",
        additionalProperties: false,
        properties: { title: { type: ["string", "null"] }, url: { type: "string" } },
        required: ["title", "url"],
      } as const;

      const props: Record<string, any> = {
        topic: { type: "string" },
        subtopic: { type: "string" },
        version: { type: ["string", "null"] },
        difficulty: { type: "string" },
        bloomLevel: { type: "string" },
        question: { type: "string" },
        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
        correctIndex: { type: "number" },
        explanation: { type: ["string", "null"] },
        explanationBullets: { type: "array", items: { type: "string" } },
        citations: { type: "array", items: citationsItem },
      };

      if (args.codingMode) {
        props.code = { type: "string" };
      }

      return {
        type: "object",
        additionalProperties: false,
        properties: props,
        required: Object.keys(props),
      };
    })(),
  });

  const responseFormat: any = args.codingMode
    ? { type: "json_schema", json_schema: buildSchema() }
    : { type: "json_object" };

  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: responseFormat,
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  const raw = parseJsonObject<any>(content, {});

  // Coerce and validate minimal shape
  const topic: string = String(raw.topic || args.topic || "");
  const subtopic: string = String(raw.subtopic || args.subtopic || "");
  const version: string | null = typeof raw.version === "string" ? raw.version : args.version ?? null;
  const difficultyStr: string = String(raw.difficulty || args.difficulty || "Medium");
  const bloomStr: string = String(raw.bloomLevel || args.bloomLevel || "Understand");
  const question: string = String(raw.question || "");
  const optionsArr: string[] = Array.isArray(raw.options) ? raw.options.map((o: any) => String(o)).slice(0, 4) : [];
  const correctIndexNum: number = typeof raw.correctIndex === "number" ? raw.correctIndex : 0;
  const citationsArr: Array<{ title?: string; url: string }> = Array.isArray(raw.citations)
    ? raw.citations
        .map((c: any) => ({ title: typeof c?.title === "string" ? c.title : undefined, url: String(c?.url || "") }))
        .filter((c: any) => c.url)
        .slice(0, 3)
    : [];
  const explanation: string | undefined = typeof raw.explanation === "string" ? raw.explanation : undefined;
  const explanationBullets: string[] | undefined = Array.isArray(raw.explanationBullets)
    ? raw.explanationBullets.map((s: any) => String(s)).slice(0, 5)
    : undefined;

  // Normalize code into a dedicated field; also try extracting from question if missing
  const codeFromRaw: string | undefined = typeof raw.code === "string" ? raw.code : undefined;
  const codeFromQuestion: string | undefined = (() => {
    const hit = extractFirstCodeFence(question);
    if (!hit) return undefined;
    const lang = hit.lang && (hit.lang === "js" || hit.lang === "tsx") ? hit.lang : "tsx";
    return ["```" + lang, hit.content, "```"].join("\n");
  })();
  const normalizedCode: string | undefined = (() => {
    const source = codeFromRaw && codeFromRaw.trim() ? codeFromRaw : codeFromQuestion;
    if (!source || !source.trim()) return undefined;
    const t = source.trim();
    return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
  })();
  const finalQuestion: string = question;

  if (args.codingMode && normalizedCode) {
    if (questionRepeatsCodeBlock(finalQuestion, normalizedCode)) {
      throw new Error("Question must reference the code snippet instead of repeating it verbatim.");
    }
  }

  const enumDifficulty = ((): EDifficulty => {
    const s = difficultyStr.toLowerCase();
    if (s === "easy") return "Easy" as EDifficulty;
    if (s === "hard") return "Hard" as EDifficulty;
    return "Medium" as EDifficulty;
  })();
  const enumBloom = ((): EBloomLevel => {
    const s = bloomStr.toLowerCase();
    if (s.startsWith("remember")) return "Remember" as EBloomLevel;
    if (s.startsWith("understand")) return "Understand" as EBloomLevel;
    if (s.startsWith("apply")) return "Apply" as EBloomLevel;
    if (s.startsWith("analy")) return "Analyze" as EBloomLevel;
    if (s.startsWith("evalu")) return "Evaluate" as EBloomLevel;
    if (s.startsWith("create")) return "Create" as EBloomLevel;
    return "Understand" as EBloomLevel;
  })();

  const options = ((): [string, string, string, string] => {
    const filled = [...optionsArr];
    while (filled.length < 4) filled.push("");
    return [filled[0], filled[1], filled[2], filled[3]];
  })();

  const correctIndex = Math.max(0, Math.min(3, correctIndexNum | 0));

  let out: IMcqItemView = {
    topic: topic || args.topic,
    subtopic: subtopic || args.subtopic || "",
    version: version ?? undefined,
    difficulty: enumDifficulty,
    bloomLevel: enumBloom,
    question: finalQuestion,
    code: normalizedCode,
    options,
    correctIndex,
    explanation,
    explanationBullets,
    citations: citationsArr,
  };

  if (args.codingMode && out.code && questionRepeatsCodeBlock(out.question, out.code)) {
    const repairSystem = [
      "You output STRICT JSON only.",
      "Do not repeat the fenced code block inside the question text.",
      "Reference the snippet in prose (e.g., 'Given the code snippet below...') while keeping the standalone code field untouched.",
    ].join(" ");
    const repairUser = [
      "Rewrite the question so it references the provided code snippet without duplicating the fenced block.",
      "Preserve topic, subtopic, options, correctIndex, difficulty, bloomLevel, explanation, and citations.",
      JSON.stringify(out),
    ].join("\n\n");

    const repair = await client.chat.completions.create({
      model: OPENAI_CONFIG.CHAT_MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: repairSystem },
        { role: "user", content: repairUser },
      ],
      response_format: { type: "json_schema", json_schema: buildSchema() },
    });
    const repairedContent = repair.choices[0]?.message?.content ?? "{}";
    const repairedRaw = parseJsonObject<any>(repairedContent, {});
    if (repairedRaw && typeof repairedRaw.question === "string") {
      out = {
        ...out,
        question: repairedRaw.question,
        code: typeof repairedRaw.code === "string" && repairedRaw.code.trim() ? repairedRaw.code : out.code,
      };
    }

    if (questionRepeatsCodeBlock(out.question, out.code)) {
      throw new Error("Question must reference the code snippet instead of repeating it verbatim.");
    }
  }

  // Enforce coding-mode contract: ensure a valid 3–50 line fenced block exists in `code`.
  if (args.codingMode) {
    const codeText = out.code ?? "";
    if (!hasValidCodeBlock(codeText, { minLines: 3, maxLines: 50 })) {
      // Repair pass: ask the model to return the SAME object with a valid fenced code block.
      const repairSystem =
        "You output STRICT JSON only. The object must include a 'code' string that contains a fenced js/tsx code block (3-50 lines). Do not add extra keys.";
      const repairUser = [
        "Repair this MCQ object by adding a valid fenced code block in the 'code' field.",
        "Preserve topic, subtopic, difficulty, bloomLevel, options, correctIndex, citations.",
        "Return JSON only.",
        JSON.stringify({
          topic,
          subtopic,
          version,
          difficulty: enumDifficulty,
          bloomLevel: enumBloom,
          question: finalQuestion,
          options,
          correctIndex,
          explanation,
          explanationBullets,
          citations: citationsArr,
        }),
      ].join("\n\n");

      const repair = await client.chat.completions.create({
        model: OPENAI_CONFIG.CHAT_MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: repairSystem },
          { role: "user", content: repairUser },
        ],
        response_format: { type: "json_schema", json_schema: buildSchema() },
      });
      const repairedContent = repair.choices[0]?.message?.content ?? "{}";
      const repairedRaw = parseJsonObject<any>(repairedContent, {});
      const repairedCode = typeof repairedRaw.code === "string" ? repairedRaw.code : undefined;
      const fixed = (() => {
        const t = (repairedCode ?? "").trim();
        if (!t) return undefined;
        return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
      })();
      if (!fixed || !hasValidCodeBlock(fixed, { minLines: 3, maxLines: 50 })) {
        throw new Error("MissingCodeError: Model did not return required js/tsx fenced code block (3–50 lines)");
      }
      out = { ...out, code: fixed };
    }
  }

  // Structured metrics: response summary (no content bodies)
  try {
    console.log("generation_response_summary", {
      topic: out.topic,
      subtopic: out.subtopic,
      difficulty: out.difficulty,
      bloom: out.bloomLevel,
      has_code: !!out.code,
      citations_count: Array.isArray(out.citations) ? out.citations.length : 0,
    });
  } catch (_) {
    // no-op
  }

  if (styleInfo?.style) {
    out.questionStyle = styleInfo.style;
  }

  return out;
}

/**
 * reviseMcqWithContext
 * Server-only: Revises an existing MCQ based on user instruction while maintaining quality and citations.
 */
export async function reviseMcqWithContext(args: {
  currentMcq: IMcqItemView;
  instruction: string;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
}): Promise<IMcqItemView> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { system, user } = buildReviserMessages({
    currentMcq: args.currentMcq,
    instruction: args.instruction,
    contextItems: args.contextItems,
  });

  const completion = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.3, // Lower temperature for more focused revisions
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");

  const raw = parseJsonObject(content, null) as any;
  if (!raw) throw new Error("Invalid JSON response from OpenAI");

  const question = typeof raw.question === "string" ? raw.question : args.currentMcq.question;
  const optionsArr = Array.isArray(raw.options) ? raw.options.slice(0, 4) : args.currentMcq.options;
  const correctIndexNum = typeof raw.correctIndex === "number" ? raw.correctIndex : args.currentMcq.correctIndex;
  const difficultyStr = typeof raw.difficulty === "string" ? raw.difficulty : args.currentMcq.difficulty;
  const bloomStr = typeof raw.bloomLevel === "string" ? raw.bloomLevel : args.currentMcq.bloomLevel;
  const explanation = typeof raw.explanation === "string" ? raw.explanation : args.currentMcq.explanation;
  const explanationBullets = Array.isArray(raw.explanationBullets)
    ? raw.explanationBullets.map((s: any) => String(s)).slice(0, 5)
    : args.currentMcq.explanationBullets;
  const citationsArr = Array.isArray(raw.citations)
    ? raw.citations.map((c: any) => ({
        title: c.title ?? undefined,
        url: c.url,
      }))
    : args.currentMcq.citations;

  // Normalize code for revisions (keep prose-only question)
  const codeFromRawRev: string | undefined = typeof raw.code === "string" ? raw.code : undefined;
  const normalizedCodeRev: string | undefined = (() => {
    if (!codeFromRawRev || !codeFromRawRev.trim()) return undefined;
    const t = codeFromRawRev.trim();
    return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
  })();
  const finalQuestionRev: string = question;

  const enumDifficulty = ((): EDifficulty => {
    const s = difficultyStr.toLowerCase();
    if (s === "easy") return "Easy" as EDifficulty;
    if (s === "hard") return "Hard" as EDifficulty;
    return "Medium" as EDifficulty;
  })();
  const enumBloom = ((): EBloomLevel => {
    const s = bloomStr.toLowerCase();
    if (s.startsWith("remember")) return "Remember" as EBloomLevel;
    if (s.startsWith("understand")) return "Understand" as EBloomLevel;
    if (s.startsWith("apply")) return "Apply" as EBloomLevel;
    if (s.startsWith("analy")) return "Analyze" as EBloomLevel;
    if (s.startsWith("evalu")) return "Evaluate" as EBloomLevel;
    if (s.startsWith("create")) return "Create" as EBloomLevel;
    return "Understand" as EBloomLevel;
  })();

  const options = ((): [string, string, string, string] => {
    const filled = [...optionsArr];
    while (filled.length < 4) filled.push("");
    return [filled[0], filled[1], filled[2], filled[3]];
  })();

  const correctIndex = Math.max(0, Math.min(3, correctIndexNum | 0));

  const out: IMcqItemView = {
    topic: args.currentMcq.topic, // Keep original topic
    subtopic: args.currentMcq.subtopic, // Keep original subtopic
    version: args.currentMcq.version, // Keep original version
    difficulty: enumDifficulty,
    bloomLevel: enumBloom,
    question: finalQuestionRev,
    code: normalizedCodeRev ?? args.currentMcq.code,
    options,
    correctIndex,
    explanation,
    explanationBullets,
    citations: citationsArr,
  };
  return out;
}

/**
 * judgeMcqQuality
 * Server-only: Evaluates MCQ quality and returns a structured verdict for automation.
 */
export async function judgeMcqQuality(args: {
  mcq: IMcqItemView;
  contextItems: Array<{ title?: string | null; url: string; content: string }>;
  neighbors?: Array<{ question: string; options: [string, string, string, string] }>;
  codingMode?: boolean;
}): Promise<{ verdict: "approve" | "revise"; reasons: string[]; suggestions?: string[] }> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const { system, user } = buildJudgeMessages({
    mcq: args.mcq,
    contextItems: args.contextItems,
    neighbors: args.neighbors,
    codingMode: args.codingMode,
  });
  const res = await client.chat.completions.create({
    model: OPENAI_CONFIG.CHAT_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = res.choices[0]?.message?.content ?? "{}";
  const parsed = parseJsonObject<any>(content, { verdict: "approve", reasons: [] });
  const verdict = parsed.verdict === "revise" ? "revise" : "approve";
  const reasons: string[] = Array.isArray(parsed.reasons) ? parsed.reasons.map((r: any) => String(r)) : [];
  const suggestions: string[] | undefined = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((r: any) => String(r))
    : undefined;
  return { verdict, reasons, suggestions };
}

/**
 * selectNextQuestion
 * Server-only: LLM-driven selector that analyzes attempt context and determines optimal criteria
 * for the next question to ensure balanced, comprehensive evaluation coverage.
 *
 * Uses gpt-4o-mini with structured output to analyze:
 * - Distribution progress (Easy/Medium/Hard, coding threshold)
 * - Coverage gaps (topics, subtopics, Bloom levels)
 * - Recent patterns (avoid subtopic clustering)
 *
 * Returns target criteria for database query or generation.
 */
export async function selectNextQuestion(context: {
  attempt_id: string;
  questions_answered: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  coding_count: number;
  topic_distribution: Record<string, number>;
  subtopic_distribution: Record<string, number>;
  bloom_distribution: Record<string, number>;
}): Promise<{
  difficulty: EDifficulty;
  coding_mode: boolean;
  preferred_topic: string;
  preferred_subtopic: string;
  preferred_bloom_level: EBloomLevel;
  reasoning: string;
}> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const {
    questions_answered,
    easy_count,
    medium_count,
    hard_count,
    coding_count,
    topic_distribution,
    subtopic_distribution,
    bloom_distribution,
  } = context;

  const total_target = 60;
  const remaining = total_target - questions_answered;
  const easy_target = 30;
  const medium_target = 20;
  const hard_target = 10;
  const coding_target = Math.ceil(total_target * 0.35); // 21 minimum

  // Distribution status
  const easy_remaining = Math.max(0, easy_target - easy_count);
  const medium_remaining = Math.max(0, medium_target - medium_count);
  const hard_remaining = Math.max(0, hard_target - hard_count);
  const coding_needed = Math.max(0, coding_target - coding_count);

  // Comprehensive coverage info
  const topic_list = Object.entries(topic_distribution)
    .map(([topic, count]) => `${topic}: ${count}`)
    .join(", ");
  const bloom_list = Object.entries(bloom_distribution)
    .map(([level, count]) => `${level}: ${count}`)
    .join(", ");
  // Detailed coverage breakdown
  const subtopic_list = Object.entries(subtopic_distribution)
    .map(([subtopic, count]) => `${subtopic}: ${count}`)
    .join(", ");

  // Difficulty breakdown
  const difficulty_list = [`Easy: ${easy_count}`, `Medium: ${medium_count}`, `Hard: ${hard_count}`].join(", ");

  // Coding breakdown
  const coding_list = `Coding questions: ${coding_count}/${total_target} (${coding_needed} more needed)`;

  // Detailed Bloom level breakdown
  const bloom_count_list = Object.entries(bloom_distribution)
    .map(([level, count]) => `${level}: ${count}`)
    .join(", ");

  // Note: Topic/subtopic information is now dynamically generated within generateQuestionPrompt
  const { system, user } = generateQuestionPrompt({
    questions_answered,
    total_target,
    easy_count,
    medium_count,
    hard_count,
    coding_count,
    easy_target,
    medium_target,
    hard_target,
    coding_target,
    easy_remaining,
    medium_remaining,
    hard_remaining,
    coding_needed,
    topic_list,
    subtopic_list,
    bloom_list,
    difficulty_list,
    coding_list,
    bloom_count_list,
  });

  try {
    const res = await client.chat.completions.create({
      model: OPENAI_CONFIG.CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    const parsed = parseJsonObject<any>(content, {
      difficulty: "Easy",
      coding_mode: false,
      preferred_topic: "React",
      preferred_subtopic: "",
      preferred_bloom_level: "Understand",
      reasoning: "Default selection",
    });

    // Structured log for selector output (non-sensitive)
    try {
      console.log("llm_selector_decision", {
        attempt_id: context.attempt_id,
        answered: context.questions_answered,
        decision: {
          difficulty: parsed.difficulty,
          coding_mode: parsed.coding_mode,
          preferred_topic: parsed.preferred_topic || "React",
          preferred_subtopic: parsed.preferred_subtopic || "",
          preferred_bloom_level: parsed.preferred_bloom_level || "Understand",
        },
      });
    } catch (_) {
      // no-op
    }

    // Validate and normalize
    const difficulty = ((): EDifficulty => {
      const d = String(parsed.difficulty || "").toLowerCase();
      if (d === "easy") return EDifficulty.EASY;
      if (d === "medium") return EDifficulty.MEDIUM;
      if (d === "hard") return EDifficulty.HARD;
      return EDifficulty.EASY;
    })();
    const coding_mode = Boolean(parsed.coding_mode);
    const preferred_topic = String(parsed.preferred_topic || "React");
    const preferred_subtopic = String(parsed.preferred_subtopic || "");
    const preferred_bloom_level = ((): EBloomLevel => {
      const l = String(parsed.preferred_bloom_level || "").toLowerCase();
      if (l === "remember") return EBloomLevel.REMEMBER;
      if (l === "understand") return EBloomLevel.UNDERSTAND;
      if (l === "apply") return EBloomLevel.APPLY;
      if (l === "analyze") return EBloomLevel.ANALYZE;
      if (l === "evaluate") return EBloomLevel.EVALUATE;
      if (l === "create") return EBloomLevel.CREATE;
      return EBloomLevel.UNDERSTAND;
    })();
    const reasoning = String(parsed.reasoning || "Selected based on attempt context");

    return {
      difficulty,
      coding_mode,
      preferred_topic,
      preferred_subtopic,
      preferred_bloom_level,
      reasoning,
    };
  } catch (err) {
    console.error("LLM selector failed, using fallback:", getErrorMessage(err));

    // Enforce hard constraints with weighted randomization
    // Difficulty: pick by remaining quotas (weights proportional to deficit)
    const deficits: Array<{ d: EDifficulty; remaining: number }> = [
      { d: EDifficulty.EASY, remaining: easy_remaining },
      { d: EDifficulty.MEDIUM, remaining: medium_remaining },
      { d: EDifficulty.HARD, remaining: hard_remaining },
    ];
    const diffWeights = deficits.map((x) => Math.max(0, x.remaining));
    const diffIdx = weightedRandomIndex(diffWeights);
    const difficulty: EDifficulty = deficits[diffIdx]?.d ?? EDifficulty.EASY;

    // Force coding if behind pace (accelerate late if needed)
    const coding_mode = coding_needed > 0 && (questions_answered >= 30 ? true : questions_answered >= 40);

    // Topics: use dynamic ontology and weight by inverse coverage
    let topics: string[] = [];
    try {
      topics = getStaticTopicList();
    } catch (err) {
      console.error("ontology_refresh_failed", { error: getErrorMessage(err) });
      topics = [
        "React",
        "JavaScript",
        "TypeScript",
        "HTML",
        "CSS",
        "State Management",
        "Routing",
        "Testing",
        "Accessibility",
        "PWA",
      ];
    }
    const topicWeightsMap = calculateCoverageWeights(topic_distribution, topics, 1);
    const topicWeights = topics.map((t) => topicWeightsMap[t] || 1);
    const topicIdx = weightedRandomIndex(topicWeights);
    const topic = topics[topicIdx] || "React";

    const subtopicCandidates = getStaticSubtopicsForTopic(topic);
    const subtopic = subtopicCandidates.length
      ? subtopicCandidates[Math.floor(Math.random() * subtopicCandidates.length)]
      : null;

    // Subtopic: prefer dynamic ontology for chosen topic, pick 1 underrepresented
    let preferred_subtopic: string = "";
    try {
      const subtopicsByTopic = getStaticSubtopicMap();
      const subs = subtopicsByTopic[topic] || [];
      if (subs.length > 0) {
        // Build simple inverse-coverage weights using subtopic_distribution
        const subWeights = subs.map((s) => 1 / ((subtopic_distribution[s] || 0) + 1));
        const idx = weightedRandomIndex(subWeights);
        preferred_subtopic = subs[idx] || "";
      }
    } catch (err) {
      console.error("ontology_refresh_failed", { error: getErrorMessage(err) });
    }

    // Bloom level: prefer underrepresented globally
    const allBlooms: EBloomLevel[] = [
      EBloomLevel.REMEMBER,
      EBloomLevel.UNDERSTAND,
      EBloomLevel.APPLY,
      EBloomLevel.ANALYZE,
      EBloomLevel.EVALUATE,
      EBloomLevel.CREATE,
    ];
    const bloomWeights = allBlooms.map((b) => 1 / ((bloom_distribution[b] || 0) + 1));
    const preferred_bloom_level = allBlooms[weightedRandomIndex(bloomWeights)];

    return {
      difficulty,
      coding_mode,
      preferred_topic: topic,
      preferred_subtopic,
      preferred_bloom_level,
      reasoning: "Coverage-aware fallback after LLM error",
    };
  }
}

function buildQuestionStyleInstruction(
  userRequestedStyle: EQuestionStyle | undefined,
  codingMode: boolean | undefined,
  bloomLevel: EBloomLevel | undefined
): { style: EQuestionStyle; instruction: string } | null {
  if (userRequestedStyle) {
    return {
      style: userRequestedStyle,
      instruction: buildStyleInstruction(userRequestedStyle),
    };
  }

  const inferred = inferQuestionStyle(codingMode ?? false, bloomLevel);
  if (!inferred) {
    return null;
  }

  return {
    style: inferred,
    instruction: buildStyleInstruction(inferred),
  };
}

function inferQuestionStyle(codingMode: boolean, bloomLevel: EBloomLevel | undefined): EQuestionStyle | null {
  if (!codingMode) {
    if (bloomLevel === EBloomLevel.APPLY || bloomLevel === EBloomLevel.EVALUATE) {
      return EQuestionStyle.TRADEOFF;
    }
    return EQuestionStyle.THEORY;
  }

  const roll = Math.random();
  if (roll < 0.5) return EQuestionStyle.CODE_READING;
  if (roll < 0.7) return EQuestionStyle.DEBUG;
  if (roll < 0.85) return EQuestionStyle.REFACTOR;
  return EQuestionStyle.TRADEOFF;
}

function buildStyleInstruction(style: EQuestionStyle): string {
  const base = "Question style directive (experimental): ";
  switch (style) {
    case EQuestionStyle.THEORY:
      return (
        base +
        "Focus on conceptual understanding without code. Ask about definitions, principles, and when/why to use concepts."
      );
    case EQuestionStyle.CODE_READING:
      return (
        base +
        "Provide a code snippet (3–15 lines) and ask the learner to reason about its behavior or output. Emphasize accurate execution tracing."
      );
    case EQuestionStyle.DEBUG:
      return (
        base +
        "Show buggy code (5–20 lines) and ask the learner to identify the issue. Use realistic pitfalls such as missing dependencies or stale closures."
      );
    case EQuestionStyle.REFACTOR:
      return (
        base +
        "Present working but suboptimal code (8–25 lines) and ask for the best improvement strategy. Compare optimization or refactoring approaches."
      );
    case EQuestionStyle.TRADEOFF:
      return (
        base +
        "Describe a scenario and ask the learner to compare approaches (e.g., Context vs Redux). Highlight decision-making and tradeoffs."
      );
    default:
      return base + "Focus on delivering an interview-relevant perspective for this topic.";
  }
}
