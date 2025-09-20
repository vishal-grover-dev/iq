import type { IMcqItemView } from "@/types/mcq.types";
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
