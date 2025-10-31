import type { TGeneratorBuildArgs, TJudgeBuildArgs, TNeighborMcq, TReviserBuildArgs } from "@/types/mcq.types";
import { EPromptMode, EBloomLevel as BloomLevel } from "@/types/mcq.types";
import { MCQ_PROMPTS } from "@/constants/generation.constants";
import { MVP_TOPICS } from "@/constants/mvp-ontology.constants";
import type { TMvpTopic } from "@/constants/mvp-ontology.constants";
import type { TExample } from "../data/mcq-examples";
import { pickExamples } from "../data/mcq-examples";
import { getStaticSubtopicMap, getStaticTopicWeights } from "./mcq.utils";

// Examples moved to data/mcq-examples.ts to keep this builder focused on prompts

const isMvpTopic = (topic?: string | null): topic is TMvpTopic =>
  !!topic && Object.prototype.hasOwnProperty.call(MVP_TOPICS, topic);

export function buildGeneratorMessages(args: TGeneratorBuildArgs): { system: string; user: string } {
  const mode = args.mode ?? EPromptMode.FEW_SHOT;
  const topicForExamples = isMvpTopic(args.topic) ? args.topic : undefined;
  const examples = pickExamples(args.examplesCount ?? 10, topicForExamples);
  const prioritizedExamples = args.subtopic
    ? [...examples].sort((a, b) => Number(b.subtopic === args.subtopic) - Number(a.subtopic === args.subtopic))
    : examples;
  const system = [
    MCQ_PROMPTS.GENERATOR_SYSTEM_INTRO,
    MCQ_PROMPTS.RULES_HEADER,
    "- Always return STRICT JSON with fields: topic, subtopic, version, difficulty, bloomLevel, question, options (array of 4 strings), correctIndex (0-3), explanation (string), explanationBullets (array of 2-3 strings), citations (array of {title?, url}).",
    "- Use exactly four plausible options and exactly one correct answer.",
    "- Ground content in the provided context and cite 1–2 most relevant sources.",
    "- Frame questions in interview-relevant contexts when appropriate. Vary the phrasing: 'In a technical interview...', 'During code review...', 'In a whiteboard session...', 'You're debugging...', 'A colleague asks...', or simply present the scenario directly without explicit interview framing.",
    "- Focus on practical debugging, problem-solving scenarios, and real-world application contexts. Not every question needs explicit interview framing - vary the approach naturally.",
    args.codingMode
      ? "- Coding mode is ON: Return a fenced js/tsx code block (3–50 lines) in the dedicated 'code' field. Do NOT include this fenced block inside the question text; reference it in prose (e.g., 'Given the code snippet below...'). The 'code' field is REQUIRED."
      : undefined,
    // Event loop emphasis for JavaScript async topics
    args.topic === "JavaScript" &&
    args.subtopic &&
    ["Event Loop & Task/Microtask Queue", "Promises", "Async/Await"].includes(args.subtopic)
      ? "- For event loop questions, provide code snippets with setTimeout, Promise, and console.log to test understanding of microtask/macrotask execution order. Focus on practical timing scenarios."
      : undefined,
    // React fundamentals emphasis
    args.topic === "React"
      ? "- Focus on fundamental concepts that apply across React versions rather than version-specific APIs. Prioritize hooks lifecycle, state management, and component patterns over latest features."
      : undefined,
    mode === EPromptMode.CHAIN_OF_THOUGHT
      ? "- Review the chain-of-thought reference, think step by step internally, but output ONLY the final JSON response."
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

  const includeChainOfThought = mode === EPromptMode.CHAIN_OF_THOUGHT;

  const examplesBlock = prioritizedExamples
    .map((ex: TExample, i: number): string => {
      const bullets = ex.explanationBullets.map((b: string) => `- ${b}`).join("\n");
      const cits = ex.citations
        .map((c: { title?: string; url: string }) => `- ${c.title ? `${c.title} — ` : ""}${c.url}`)
        .join("\n");
      return [
        `Example ${i + 1}`,
        `Topic: ${ex.topic}${ex.subtopic ? ` — ${ex.subtopic}` : ""}`,
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
        includeChainOfThought ? `Chain of Thought:\n${ex.chainOfThought}` : undefined,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const negativeBlock = (() => {
    const list = (args.negativeExamples ?? []).filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 8);
    if (list.length === 0) return undefined;
    return [
      MCQ_PROMPTS.NEGATIVE_EXAMPLES_INTRO,
      ...list.map((q, i) => `${i + 1}. ${q.slice(0, 240)}`),
      "Do not copy these. Aim for different angles or scenarios.",
    ].join("\n");
  })();

  const styleBlock = (() => {
    if (!args.questionStyle) return undefined;
    return `Question style target (experimental): ${args.questionStyle}. Follow the style guidance while keeping quality high.`;
  })();

  const user = [
    `Labels: ${labels}`,
    MCQ_PROMPTS.CONTEXT_HEADER,
    contextLines,
    mode === EPromptMode.FEW_SHOT
      ? "Examples (style reference):\n" + examplesBlock
      : includeChainOfThought
      ? "Chain-of-thought references (for internal planning only):\n" + examplesBlock
      : undefined,
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
    "AGGRESSIVE DEDUPLICATION: Mark as 'revise' if question structure, code pattern, or options are >85% similar to neighbors. Reject if question differs only by variable names, minor wording, or trivial option changes. Ensure code snippets vary significantly (different patterns, not just renamed variables).",
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

/**
 * Generates system and user prompts for LLM-driven question selection in evaluations.
 * Uses dynamic ontology data to provide comprehensive topic weights and subtopic information.
 */
export function generateQuestionPrompt(context: {
  questions_answered: number;
  total_target: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  coding_count: number;
  easy_target: number;
  medium_target: number;
  hard_target: number;
  coding_target: number;
  easy_remaining: number;
  medium_remaining: number;
  hard_remaining: number;
  coding_needed: number;
  topic_list: string;
  subtopic_list: string;
  bloom_list: string;
  difficulty_list: string;
  coding_list: string;
  bloom_count_list: string;
}): { system: string; user: string } {
  const {
    questions_answered,
    total_target,
    easy_count,
    medium_count,
    hard_count,
    coding_count,
    easy_target,
    medium_target,
    hard_target,
    coding_target,
    easy_remaining,
    medium_remaining,
    hard_remaining,
    coding_needed,
    topic_list,
    subtopic_list,
    bloom_list,
    difficulty_list,
    coding_list,
    bloom_count_list,
  } = context;

  const remaining = total_target - questions_answered;

  // Get comprehensive ontology data
  const topicWeights = getStaticTopicWeights();
  const subtopicMap = getStaticSubtopicMap();

  // Build detailed topic information with weights and subtopics
  const topicDetails = Object.entries(topicWeights)
    .map(([topic, weight]) => {
      const subtopics = subtopicMap[topic] || [];
      const subtopicCount = subtopics.length;
      return {
        topic,
        weight: (weight * 100).toFixed(1) + "%",
        subtopics: subtopics.slice(0, 5), // Show first 5 subtopics
        totalSubtopics: subtopicCount,
      };
    })
    .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight)); // Sort by weight descending

  // Create comprehensive topic breakdown
  const topicBreakdown = topicDetails
    .map(
      (t) =>
        `${t.topic}: ${t.weight} weight (${t.totalSubtopics} subtopics) - ${t.subtopics.join(", ")}${
          t.totalSubtopics > 5 ? "..." : ""
        }`
    )
    .join("\n");

  // Get available Bloom levels from the enum
  const availableBloomLevels = Object.values(BloomLevel).join(", ");

  const system = `You are an intelligent question selector for a comprehensive frontend skills evaluation. Your role is to analyze attempt context and determine optimal criteria for the next question to ensure:

BALANCE REQUIREMENTS:
1. Difficulty distribution: 30 Easy, 20 Medium, 10 Hard (total 60 questions)
2. Coding threshold: ≥35% coding questions (minimum 21 of 60)
3. Topic balance: Respect topic weights and avoid over-concentration (no single topic >40%)
4. Bloom diversity: ≥3 different Bloom levels per difficulty tier
5. Subtopic distribution: Avoid clustering (no >5 consecutive from same subtopic)
6. Weight-aware selection: Consider topic importance based on available content

INTERVIEW FOCUS GUIDELINES:
- Prioritize timeless React fundamentals (hooks lifecycle, state management, component patterns) over version-specific features
- Interviewers typically assess core concepts rather than latest version features
- Focus on practical debugging, problem-solving scenarios, and real-world application contexts
- For JavaScript: Emphasize event loop, closures, prototypes, and async behavior over latest syntax features

TOPIC WEIGHTS & SUBTOPIC AVAILABILITY:
The following topics are available with their relative importance (weights) and subtopic breakdown:

${topicBreakdown}

SELECTION GUIDELINES:
- Prioritize higher-weight topics when multiple options are viable
- Balance between high-weight and lower-weight topics based on current distribution
- Ensure coding questions cover practical implementation scenarios
- Maintain Bloom taxonomy progression: Remember → Understand → Apply → Analyze → Evaluate → Create
- Only select topics and subtopics that exist in the provided ontology data
- For React: Favor fundamental subtopics (useState, useEffect, Components & Props, State & Lifecycle) over version-specific features

AVAILABLE BLOOM LEVELS:
${availableBloomLevels}

Return strict JSON with:
- difficulty: "Easy" | "Medium" | "Hard"
- coding_mode: boolean
- preferred_topic: string (1 topic from the ontology)
- preferred_subtopic: string (1 subtopic that exists in the ontology)
- preferred_bloom_level: string (1 Bloom level from the available list above)
- reasoning: string (1-2 sentences explaining your choice based on weights and balance)`;

  const user = `Current attempt state:
- Questions answered: ${questions_answered}/${total_target}
- Remaining: ${remaining}

Distribution progress:
- Easy: ${easy_count}/${easy_target} (${easy_remaining} remaining)
- Medium: ${medium_count}/${medium_target} (${medium_remaining} remaining)  
- Hard: ${hard_count}/${hard_target} (${hard_remaining} remaining)
- Coding: ${coding_count}/${total_target} (need ≥${coding_target}, ${coding_needed} more needed)

Comprehensive coverage of answered questions:
- Topics covered: ${topic_list || "none yet"}
- Subtopics covered: ${subtopic_list || "none yet"}
- Bloom levels used: ${bloom_list || "none yet"}
- Bloom level counts: ${bloom_count_list || "none yet"}
- Difficulty levels used: ${difficulty_list || "none yet"}
- Coding questions: ${coding_list || "none yet"}

Based on the dynamic topic weights (shown above) and current attempt state, determine optimal criteria for question #${
    questions_answered + 1
  }. Consider both the weight-based importance of topics and the current distribution balance needs.`;

  return { system, user };
}
