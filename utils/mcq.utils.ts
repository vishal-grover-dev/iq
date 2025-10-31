import {
  MVP_TOPICS,
  getMvpSubtopics,
  getMvpTopicPriority,
  getMvpTopicWeight,
} from "@/constants/mvp-ontology.constants";
import type { TMvpTopic } from "@/constants/mvp-ontology.constants";
import type { IMcqItemView } from "@/types/mcq.types";
import { EMvpTopicPriority } from "@/types/generation.types";
import crypto from "crypto";

export function buildMcqEmbeddingText(item: IMcqItemView): string {
  const options = item.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n");
  const labels = [
    `Topic: ${item.topic}`,
    item.subtopic ? `Subtopic: ${item.subtopic}` : "",
    item.version ? `Version: ${item.version}` : "",
    `Difficulty: ${item.difficulty}`,
    `Bloom: ${item.bloomLevel}`,
  ]
    .filter(Boolean)
    .join(" | ");
  return [`${labels}`, `Q: ${item.question}`, options].join("\n\n");
}

export function computeMcqContentKey(item: IMcqItemView): string {
  const gist = (item.question || "")
    .toLowerCase()
    .replace(/[`*_~>\-\s]+/g, " ")
    .trim()
    .slice(0, 600);
  return crypto.createHash("sha256").update(gist).digest("hex");
}

/**
 * Extracts the first fenced code block from text and returns its language, content, and line count.
 */
export function extractFirstCodeFence(text: string): { lang: string | null; content: string; lines: number } | null {
  if (!text || typeof text !== "string") return null;
  const match = text.match(/```([a-zA-Z0-9+_-]+)?\n([\s\S]*?)\n```/i);
  if (!match) return null;
  const lang = match[1] ? match[1].toLowerCase() : null;
  const content = match[2] ?? "";
  const lines = content.split(/\r?\n/).length;
  return { lang, content, lines };
}

/**
 * Returns true only if the question contains a js/tsx fenced block with 3–50 lines.
 */
export function hasValidCodeBlock(text: string, opts?: { minLines?: number; maxLines?: number }): boolean {
  const { minLines = 3, maxLines = 50 } = opts || {};
  const info = extractFirstCodeFence(text);
  if (!info) return false;
  const allowed = new Set(["js", "jsx", "ts", "tsx", "javascript", "typescript"]);
  const langOk = !info.lang || allowed.has(info.lang);
  return langOk && info.lines >= minLines && info.lines <= maxLines;
}

function normalizeCodeForComparison(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function questionRepeatsCodeBlock(question: string, code?: string | null, tolerance: number = 12): boolean {
  if (!question || !code) return false;
  const questionFence = extractFirstCodeFence(question);
  const codeFence = extractFirstCodeFence(code);
  if (!questionFence || !codeFence) return false;
  const questionNormalized = normalizeCodeForComparison(questionFence.content);
  const codeNormalized = normalizeCodeForComparison(codeFence.content);
  if (!questionNormalized || !codeNormalized) return false;
  if (questionNormalized === codeNormalized) return true;
  const distance = Math.abs(questionNormalized.length - codeNormalized.length);
  if (distance > tolerance) return false;
  return questionNormalized.includes(codeNormalized) || codeNormalized.includes(questionNormalized);
}

/**
 * Validates core MCQ invariants and, when requireCode is true, enforces a 3–50 line fenced code block.
 */
export function validateMcq(item: IMcqItemView, requireCode: boolean): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!item) reasons.push("Missing item");
  if (!item.topic) reasons.push("Missing topic");
  if (!item.subtopic) reasons.push("Missing subtopic");
  if (!item.question || typeof item.question !== "string") reasons.push("Missing question");
  if (!Array.isArray(item.options) || item.options.length !== 4) reasons.push("Options must have exactly 4 items");
  if (typeof item.correctIndex !== "number" || item.correctIndex < 0 || item.correctIndex > 3)
    reasons.push("correctIndex must be 0–3");
  if (!Array.isArray(item.citations) || item.citations.length === 0) reasons.push("At least one citation required");

  if (requireCode) {
    const codeText = typeof item.code === "string" ? item.code : "";
    if (!hasValidCodeBlock(codeText, { minLines: 3, maxLines: 50 })) {
      reasons.push("Missing required js/tsx fenced code block (3–50 lines) in code field");
    }
    if (item.code && questionRepeatsCodeBlock(item.question, item.code)) {
      reasons.push("Question must not duplicate the fenced code block; reference it in prose");
    }
  }
  return { ok: reasons.length === 0, reasons };
}

export type TStaticSubtopic = {
  name: string;
};

export function getStaticTopicList(): string[] {
  return Object.keys(MVP_TOPICS);
}

export function getStaticSubtopicsForTopic(topic: string): string[] {
  const config = MVP_TOPICS[topic as TMvpTopic];
  return (config?.subtopics ?? []).slice();
}

export function getStaticTopicWeights(): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const topic of Object.keys(MVP_TOPICS)) {
    weights[topic] = getMvpTopicWeight(topic as TMvpTopic);
  }
  return weights;
}

export function getStaticTopicChunkCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const topic of Object.keys(MVP_TOPICS)) {
    counts[topic] = 0;
  }
  return counts;
}

export function getStaticSubtopicMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const topic of Object.keys(MVP_TOPICS)) {
    map[topic] = getMvpSubtopics(topic as TMvpTopic).slice() as string[];
  }
  return map;
}

export function getStaticSubtopicDetails(topic: string): TStaticSubtopic[] {
  return getMvpSubtopics(topic as TMvpTopic).map((name) => ({ name }));
}

export function getStaticTopicPriority(topic: string): EMvpTopicPriority | undefined {
  const config = MVP_TOPICS[topic as TMvpTopic];
  return config ? getMvpTopicPriority(topic as TMvpTopic) : undefined;
}
