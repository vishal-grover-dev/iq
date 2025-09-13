import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";

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
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { items: [] };
  }
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
 * generateMcqsFromContexts
 * Server-only helper: Given a query and a list of contextual passages, ask the LLM to propose
 * MCQs (question, 4 options, correctIndex, explanation) with citations by context index.
 * Returns up to `count` well-formed items. Post-processing/validation happens in the route.
 */
export async function generateMcqsFromContexts(args: {
  query: string;
  contexts: Array<{ content: string; title?: string | null }>;
  count: number;
  difficulty?: string;
  bloomLevels?: string[];
  topic: string;
  subtopic?: string | null;
  version?: string | null;
}): Promise<
  Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citationIndices: number[];
  }>
> {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });

  const { query, contexts, count, difficulty, bloomLevels, topic, subtopic, version } = args;
  const sys = [
    "You create multiple-choice questions grounded STRICTLY in the provided contexts.",
    "Rules:",
    "- Always produce exactly 4 options.",
    "- Choose the single best correctIndex (0-3).",
    "- Keep questions concise and unambiguous.",
    "- Cite at least 1 relevant context by its index in citationIndices.",
    "- Return STRICT JSON: { items: [{ question, options, correctIndex, explanation, citationIndices: number[] }] }.",
  ].join("\n");

  const ctxPreview = contexts
    .slice(0, Math.max(4, Math.min(contexts.length, 12)))
    .map((c, i) => `${i}. ${(c.title ? `[${c.title}] ` : "")}${c.content.slice(0, 600)}`)
    .join("\n\n");

  const user = [
    `Topic: ${topic}${subtopic ? ` / ${subtopic}` : ""}${version ? ` (v${version})` : ""}`,
    `Query: ${query || topic}`,
    `Target count: ${count}`,
    difficulty ? `Difficulty: ${difficulty}` : "",
    bloomLevels && bloomLevels.length ? `Bloom: ${bloomLevels.join(", ")}` : "",
    "Contexts (index: text):",
    ctxPreview,
    'Return JSON only: { "items": [ { "question": string, "options": string[4], "correctIndex": 0-3, "explanation": string, "citationIndices": number[] } ] }',
  ]
    .filter(Boolean)
    .join("\n\n");

  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });

  let parsed: any = {};
  try {
    parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
  } catch {
    parsed = {};
  }
  const items: any[] = Array.isArray(parsed.items) ? parsed.items : [];
  const out: Array<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    citationIndices: number[];
  }> = [];
  for (const it of items) {
    if (
      typeof it?.question === "string" &&
      Array.isArray(it?.options) &&
      it.options.length === 4 &&
      typeof it?.correctIndex === "number" &&
      it.correctIndex >= 0 &&
      it.correctIndex <= 3 &&
      typeof it?.explanation === "string"
    ) {
      const cits = Array.isArray(it.citationIndices)
        ? it.citationIndices.filter((n: any) => Number.isInteger(n) && n >= 0 && n < contexts.length)
        : [];
      out.push({
        question: it.question,
        options: it.options.slice(0, 4).map((s: any) => String(s)),
        correctIndex: it.correctIndex,
        explanation: it.explanation,
        citationIndices: cits.length ? cits : [0],
      });
    }
    if (out.length >= count) break;
  }
  return out.slice(0, count);
}
