import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";

/**
 * getEmbeddings
 * Server-only: Returns 1536-d embeddings for the provided texts using OpenAI `text-embedding-3-small`.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  const client = new OpenAI({ apiKey: OPENAI_API_KEY });
  const res = await client.embeddings.create({ model: "text-embedding-3-small", input: texts });
  const data = res.data;
  if (!Array.isArray(data) || data.length !== texts.length) {
    throw new Error("OpenAI embeddings count mismatch");
  }
  return data.map((d) => d.embedding as number[]);
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
