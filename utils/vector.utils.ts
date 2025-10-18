/**
 * Convert raw embedding data (array, string, or other) to a numeric array.
 * Handles string formats like "{1,2,3}" or "1,2,3" by parsing and validating.
 */
export function toNumericVector(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map((value) => Number(value));
  }
  if (typeof raw === "string") {
    const normalized = raw.replace(/[{}()]/g, "");
    const parts = normalized
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (!parts.length) return null;
    const vector = parts.map((part) => Number(part));
    return vector.every((value) => Number.isFinite(value)) ? vector : null;
  }
  return null;
}

/**
 * Compute cosine similarity between two numeric vectors.
 * Returns a value between 0 and 1, where 1 is identical direction.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const length = Math.min(vecA.length, vecB.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
