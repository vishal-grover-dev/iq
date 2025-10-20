import type { IMcqItemView, EDifficulty, EBloomLevel } from "@/types/mcq.types";
import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { parseJsonObject } from "@/utils/json.utils";
import { buildReviserMessages } from "@/utils/mcq-prompts/reviser-prompt.utils";
import { buildJudgeMessages } from "@/utils/mcq-prompts/judge-prompt.utils";
import { createOpenAIClient } from "@/services/openai.services";

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
  const client = createOpenAIClient();

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
