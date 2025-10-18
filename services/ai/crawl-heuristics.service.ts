import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { createOpenAIClient } from "./openai.services";

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
  const client = createOpenAIClient();

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
