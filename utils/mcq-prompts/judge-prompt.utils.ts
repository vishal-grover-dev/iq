import type { IMcqItemView, TJudgeBuildArgs, TNeighborMcq } from "@/types/mcq.types";
import { formatContextLines, formatNeighborsBlock } from "./shared.utils";

/**
 * Builds system and user prompts for MCQ quality judgment.
 */
export function buildJudgeMessages(args: TJudgeBuildArgs & { neighbors?: TNeighborMcq[] }): {
  system: string;
  user: string;
} {
  const system = [
    "You are an MCQ quality judge. Evaluate clarity, correctness, option plausibility, single correct answer, appropriate difficulty and Bloom level, presence of citations grounded in context, and DUPLICATE RISK.",
    "Duplicate risk: If the MCQ is semantically similar to any provided neighbor items, mark verdict = 'revise' and explain.",
    args.codingMode
      ? "Coding mode is ON: Ensure the MCQ includes a js/tsx fenced block between 3 and 50 lines. If none is present, if the block falls outside that range, or if the options do not reflect the code's behavior, mark 'revise' with reasons. Also, reject if the question body simply repeats the entire fenced snippet instead of referencing it in prose."
      : undefined,
    "Return STRICT JSON: { verdict: 'approve' | 'revise', reasons: string[], suggestions?: string[] }",
  ]
    .filter(Boolean)
    .join("\n");

  const ctx = formatContextLines(args.contextItems, 6, 500);
  const neighborsBlock = formatNeighborsBlock(args.neighbors);

  const mcq = args.mcq;
  const mcqJson = JSON.stringify(mcq, null, 2);

  const parts = ["Context:", ctx, "MCQ to evaluate (JSON):", mcqJson];
  if (neighborsBlock) {
    parts.push("Similar existing items (avoid duplicates):", neighborsBlock);
  }
  parts.push("Assess and return only JSON as specified.");

  const user = parts.join("\n\n");

  return { system, user };
}
