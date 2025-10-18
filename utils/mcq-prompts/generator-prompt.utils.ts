import type { TGeneratorBuildArgs, EBloomLevel } from "@/types/mcq.types";
import { EPromptMode } from "@/types/mcq.types";
import { MCQ_PROMPTS } from "@/constants/generation.constants";
import { pickExamples } from "../../data/mcq-examples";
import { formatContextLines, formatExamplesBlock, formatNegativeExamplesBlock, formatLabels, formatAvailableSubtopicsHint } from "./shared.utils";

/**
 * Builds system and user prompts for MCQ generation.
 */
export function buildGeneratorMessages(args: TGeneratorBuildArgs): { system: string; user: string } {
  const mode = args.mode ?? EPromptMode.FEW_SHOT;
  const examples = pickExamples(args.examplesCount ?? 10, args.topic);
  const system = [
    MCQ_PROMPTS.GENERATOR_SYSTEM_INTRO,
    MCQ_PROMPTS.RULES_HEADER,
    "- Always return STRICT JSON with fields: topic, subtopic, version, difficulty, bloomLevel, question, options (array of 4 strings), correctIndex (0-3), explanation (string), explanationBullets (array of 2-3 strings), citations (array of {title?, url}).",
    "- Use exactly four plausible options and exactly one correct answer.",
    "- Ground content in the provided context and cite 1–2 most relevant sources.",
    args.codingMode
      ? "- Coding mode is ON: Return a fenced js/tsx code block (3–50 lines) in the dedicated 'code' field. Do NOT include this fenced block inside the question text; reference it in prose (e.g., 'Given the code snippet below...'). The 'code' field is REQUIRED."
      : undefined,
    mode === EPromptMode.CHAIN_OF_THOUGHT
      ? "- Think step by step internally, but output ONLY the final JSON response."
      : "- Follow the patterns from the examples; output ONLY the final JSON response.",
  ]
    .filter(Boolean)
    .join("\n");

  const labels = formatLabels({
    topic: args.topic,
    subtopic: args.subtopic,
    version: args.version,
    difficulty: args.difficulty,
    bloomLevel: args.bloomLevel,
  });

  const contextLines = formatContextLines(args.contextItems, 8, 700);
  const examplesBlock = formatExamplesBlock(examples);
  const negativeBlock = formatNegativeExamplesBlock(args.negativeExamples);
  const subtopicsHint = formatAvailableSubtopicsHint(args.availableSubtopics);

  const styleBlock = (() => {
    if (!args.questionStyle) return undefined;
    return `Question style target (experimental): ${args.questionStyle}. Follow the style guidance while keeping quality high.`;
  })();

  const user = [
    `Labels: ${labels}`,
    subtopicsHint,
    MCQ_PROMPTS.CONTEXT_HEADER,
    contextLines,
    mode === EPromptMode.FEW_SHOT ? "Examples (style reference):\n" + examplesBlock : undefined,
    negativeBlock,
    styleBlock,
    args.extraInstructions || undefined,
    args.codingMode ? MCQ_PROMPTS.CODING_TASK_INSTRUCTION : MCQ_PROMPTS.STANDARD_TASK_INSTRUCTION,
    'Return JSON only with keys: {"topic","subtopic","version","difficulty","bloomLevel","question","options","correctIndex","explanation","explanationBullets","citations"' +
      (args.codingMode ? ',"code"' : "") +
      "}",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}
