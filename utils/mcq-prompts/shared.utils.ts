/**
 * Shared MCQ Prompt Utilities
 * Common helpers and formatting functions used across all prompt builders.
 */

import type { TExample } from "../../data/mcq-examples";

/**
 * Formats context items into numbered lines with titles and URLs.
 * Each item spans up to 2 lines (title + URL on first, content preview on second).
 */
export function formatContextLines(
  items: Array<{ title?: string | null; url: string; content: string }>,
  maxItems: number = 8,
  contentLength: number = 700
): string {
  return items
    .slice(0, maxItems)
    .map((c, i) => `${i + 1}. ${c.title ? `${c.title} — ` : ""}${c.url}\n${c.content.slice(0, contentLength)}`)
    .join("\n\n");
}

/**
 * Formats examples into labeled blocks for few-shot prompting.
 */
export function formatExamplesBlock(examples: TExample[]): string {
  return examples
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
}

/**
 * Formats negative examples (to-avoid gists) for the prompt.
 */
export function formatNegativeExamplesBlock(negativeExamples: string[] | undefined): string | undefined {
  const list = (negativeExamples ?? []).filter((s) => typeof s === "string" && s.trim().length > 0).slice(0, 8);
  if (list.length === 0) return undefined;
  return [
    "Avoid similar gists (learned from previous questions):",
    ...list.map((q, i) => `${i + 1}. ${q.slice(0, 240)}`),
    "Do not copy these. Aim for different angles or scenarios.",
  ].join("\n");
}

/**
 * Formats available subtopics as a hint for the generator.
 */
export function formatAvailableSubtopicsHint(subtopics: string[] | null | undefined): string | undefined {
  if (!subtopics || subtopics.length === 0) return undefined;
  return `Available subtopics for this topic: ${subtopics.join(", ")}.`;
}

/**
 * Formats labels (topic, subtopic, difficulty, Bloom) into a single line.
 */
export function formatLabels({
  topic,
  subtopic,
  version,
  difficulty,
  bloomLevel,
}: {
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  difficulty?: string;
  bloomLevel?: string;
}): string {
  return [
    `Topic: ${topic}`,
    subtopic ? `Subtopic: ${subtopic}` : undefined,
    version ? `Version: ${version}` : undefined,
    difficulty ? `Difficulty: ${difficulty}` : undefined,
    bloomLevel ? `Bloom: ${bloomLevel}` : undefined,
  ]
    .filter(Boolean)
    .join(" | ");
}

/**
 * Formats neighbors (similar MCQ items) for the judge prompt to assess duplicate risk.
 */
export function formatNeighborsBlock(
  neighbors: Array<{ question: string; options: [string, string, string, string] }> | undefined
): string | undefined {
  if (!neighbors || neighbors.length === 0) return undefined;
  return neighbors
    .slice(0, 6)
    .map((n, i) => {
      const opts = n.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join(" | ");
      return `${i + 1}. ${n.question.slice(0, 240)}\nOptions: ${opts}`;
    })
    .join("\n\n");
}
