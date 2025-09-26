import type {
  EBloomLevel,
  EDifficulty,
  TGeneratorBuildArgs,
  TJudgeBuildArgs,
  TNeighborMcq,
  TReviserBuildArgs,
} from "@/types/mcq.types";
import { EPromptMode } from "@/types/mcq.types";
import type { TExample } from "../data/mcq-examples";
import { pickExamples } from "../data/mcq-examples";

// Examples moved to data/mcq-examples.ts to keep this builder focused on prompts

export function buildGeneratorMessages(args: TGeneratorBuildArgs): { system: string; user: string } {
  const mode = args.mode ?? EPromptMode.FEW_SHOT;
  const examples = pickExamples(args.examplesCount ?? 10, args.topic);
  const system = [
    "You generate high-quality multiple-choice questions (MCQs) with citations.",
    "Rules:",
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

  const labels = [
    `Topic: ${args.topic}`,
    args.subtopic ? `Subtopic: ${args.subtopic}` : undefined,
    args.version ? `Version: ${args.version}` : undefined,
    args.difficulty ? `Difficulty: ${args.difficulty}` : undefined,
    args.bloomLevel ? `Bloom: ${args.bloomLevel}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  const contextLines = args.contextItems
    .slice(0, 8)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 700)}`)
    .join("\n\n");

  const examplesBlock = examples
    .map((ex: TExample, i: number): string => {
      const bullets = ex.explanationBullets.map((b: string) => `- ${b}`).join("\n");
      const cits = ex.citations
        .map((c: { title?: string; url: string }) => `- ${c.title ? `${c.title} — ` : ""}${c.url}`)
        .join("\n");
      return [
        `Example ${i + 1}`,
        `Statement: ${ex.statement}`,
        `Question: ${ex.question}`,
        `Options: ${ex.options.join(", ")}`,
        `CorrectIndex: ${ex.correctIndex}`,
        `Difficulty: ${ex.difficulty}`,
        `Bloom: ${ex.bloomLevel}`,
        ex.code ? `Code:\n\n\`\`\`tsx\n${ex.code}\n\`\`\`` : undefined,
        `Explanation: ${ex.explanation}`,
        `Explanation Bullets:\n${bullets}`,
        `Citations:\n${cits}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const negativeBlock = (() => {
    const list = (args.negativeExamples ?? []).filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 8);
    if (list.length === 0) return undefined;
    return [
      "Avoid generating MCQs similar to the following question gists:",
      ...list.map((q, i) => `${i + 1}. ${q.slice(0, 240)}`),
      "Do not copy these. Aim for different angles or scenarios.",
    ].join("\n");
  })();

  const user = [
    `Labels: ${labels}`,
    "Context (use for grounding and citations):",
    contextLines,
    mode === EPromptMode.FEW_SHOT ? "Examples (style reference):\n" + examplesBlock : undefined,
    negativeBlock,
    args.codingMode
      ? "Task: Generate ONE coding MCQ. MUST include a fenced code block (```js``` or ```tsx```) in the dedicated 'code' field (3–50 lines). Do NOT place the code in the question; reference the snippet in prose. Ask about behavior/bugs/fixes."
      : "Task: Generate one MCQ adhering to labels and grounded in the context.",
    'Return JSON only with keys: {"topic","subtopic","version","difficulty","bloomLevel","question","options","correctIndex","explanation","explanationBullets","citations"' +
      (args.codingMode ? ',"code"' : "") +
      "}",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { system, user };
}

export function buildReviserMessages(args: TReviserBuildArgs): {
  system: string;
  user: string;
} {
  const contextLines = args.contextItems
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 500)}`)
    .join("\n\n");

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

  const ctx = args.contextItems
    .slice(0, 6)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, 500)}`)
    .join("\n\n");

  const neighborsBlock = (args.neighbors ?? [])
    .slice(0, 6)
    .map((n, i) => {
      const opts = n.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join(" | ");
      return `${i + 1}. ${n.question.slice(0, 240)}\nOptions: ${opts}`;
    })
    .join("\n\n");

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
