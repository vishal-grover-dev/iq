import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { parseJsonObject } from "@/utils/json.utils";

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
