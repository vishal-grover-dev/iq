import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, OPENAI_PROMPTS, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { createOpenAIClient, getErrorStatus, getErrorMessage } from "@/config/openai.config";

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
  const client = createOpenAIClient();

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
  const client = createOpenAIClient();
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

  const parsed = parseJsonObject(content, { items: [] });
  const scores: number[] = Array(texts.length).fill(0);
  const items: Array<{ index: number; score: number }> = Array.isArray(parsed.items) ? parsed.items : [];
  for (const it of items) {
    if (typeof it?.index === "number" && typeof it?.score === "number" && it.index >= 0 && it.index < texts.length) {
      scores[it.index] = it.score;
    }
  }
  return scores;
}
