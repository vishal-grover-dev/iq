import type { IMcqItemView } from "@/types/mcq.types";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { buildJudgeMessages } from "@/utils/mcq-prompts/judge-prompt.utils";
import { createOpenAIClient } from "./openai.services";

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
  const client = createOpenAIClient();
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
