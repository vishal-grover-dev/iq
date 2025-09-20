import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { parseJsonObject } from "@/utils/json.utils";
import type { IMcqItemView, EBloomLevel, EDifficulty } from "@/types/mcq.types";
import { EPromptMode } from "@/types/mcq.types";
import { buildGeneratorMessages, buildJudgeMessages, buildReviserMessages } from "@/utils/mcq-prompt.utils";

/**
 * getEmbeddings
 * Server-only: Returns 1536-d embeddings for the provided texts using OpenAI `text-embedding-3-small`.
 */
export async function getEmbeddings(
  texts: string[],
  options?: { batchSize?: number; truncateCharsPerItem?: number; maxRetries?: number }
): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
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
        const res = await client.embeddings.create({ model: "text-embedding-3-small", input: slice });
        const data = res.data;
        if (!Array.isArray(data) || data.length !== slice.length) {
          throw new Error("OpenAI embeddings count mismatch for batch");
        }
        for (const d of data) out.push(d.embedding as number[]);
        break;
      } catch (err: any) {
        const status = err?.status ?? err?.response?.status;
        const retriable = status === 429 || (typeof status === "number" && status >= 500);
        if (!retriable || attempt >= maxRetries) {
          throw new Error(err?.message ?? "OpenAI embeddings failed");
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
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const system =
    "You are a reranking engine. Given a query and a list of passages, return strict JSON { items: [{ index, score }] } where index refers to the passage index and score is higher for more relevant passages. Do not include any other keys.";
  const prompt = [
    `Query: ${query}`,
    "Passages:",
    ...texts.map((t, i) => `${i}. ${t.slice(0, 700)}`),
    'Return JSON only: { "items": [ { "index": number, "score": number } ] }',
  ].join("\n");
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
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
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
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
    model: "gpt-4o-mini",
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
}): Promise<IMcqItemView> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
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
  });

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
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

  // Normalize code into a dedicated field; keep question prose-only
  const codeFromRaw: string | undefined = typeof raw.code === "string" ? raw.code : undefined;
  const normalizedCode: string | undefined = (() => {
    if (!codeFromRaw || !codeFromRaw.trim()) return undefined;
    const t = codeFromRaw.trim();
    return t.startsWith("```") ? t : ["```tsx", t, "```"].join("\n");
  })();
  const finalQuestion: string = question;

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
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { system, user } = buildReviserMessages({
    currentMcq: args.currentMcq,
    instruction: args.instruction,
    contextItems: args.contextItems,
  });

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
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
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const { system, user } = buildJudgeMessages({
    mcq: args.mcq,
    contextItems: args.contextItems,
    neighbors: args.neighbors,
    codingMode: args.codingMode,
  });
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
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
