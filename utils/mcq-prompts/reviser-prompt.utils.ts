import type { IMcqItemView, TReviserBuildArgs } from "@/types/mcq.types";
import { formatContextLines } from "./shared.utils";

/**
 * Builds system and user prompts for MCQ revision.
 */
export function buildReviserMessages(args: TReviserBuildArgs): {
  system: string;
  user: string;
} {
  const contextLines = formatContextLines(args.contextItems, 6, 500);

  const system = [
    "You are an expert MCQ reviser. Your task is to modify an existing multiple-choice question based on user instructions.",
    "Rules:",
    "- Always return STRICT JSON with fields: topic, subtopic, version, difficulty, bloomLevel, question, options (array of 4 strings), correctIndex (0-3), explanation (string), explanationBullets (array of 2-3 strings), citations (array of {title?, url}).",
    "- Keep the same topic, subtopic, and version as the original question.",
    "- Make minimal but effective changes based on the instruction.",
    "- Maintain high quality: ensure exactly four plausible options and one correct answer.",
    "- Preserve citations when possible, update them if the content changes significantly.",
    "- Use the provided context to ensure accuracy and add relevant citations.",
  ].join("\n");

  const user = [
    `Current MCQ to revise:`,
    `Topic: ${args.currentMcq.topic}`,
    `Subtopic: ${args.currentMcq.subtopic}`,
    `Version: ${args.currentMcq.version || "N/A"}`,
    `Difficulty: ${args.currentMcq.difficulty}`,
    `Bloom Level: ${args.currentMcq.bloomLevel}`,
    `Question: ${args.currentMcq.question}`,
    `Options: ${args.currentMcq.options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join(", ")}`,
    `Correct Answer: ${String.fromCharCode(65 + args.currentMcq.correctIndex)}`,
    `Explanation: ${args.currentMcq.explanation || "N/A"}`,
    `Explanation Bullets: ${args.currentMcq.explanationBullets?.join(", ") || "N/A"}`,
    `Citations: ${args.currentMcq.citations.map((c) => (c.title ? `${c.title} — ${c.url}` : c.url)).join(", ")}`,
    "",
    `User Instruction: "${args.instruction}"`,
    "",
    "Context for grounding:",
    contextLines,
    "",
    "Task: Revise the MCQ according to the user instruction. Return the updated JSON only.",
  ].join("\n");

  return { system, user };
}
