/**
 * Selects an index based on weights using cumulative distribution.
 * Ensures all weights are non-negative; zero-sum falls back to uniform.
 */
export function weightedRandomIndex(weights: number[], rng?: () => number): number {
  const sanitized = weights.map((w) => (Number.isFinite(w) && w > 0 ? w : 0));
  const total = sanitized.reduce((s, w) => s + w, 0);
  if (total <= 0) {
    // Uniform fallback
    const r = (rng?.() ?? Math.random()) * sanitized.length;
    return Math.min(sanitized.length - 1, Math.floor(r));
  }
  const r = (rng?.() ?? Math.random()) * total;
  let acc = 0;
  for (let i = 0; i < sanitized.length; i++) {
    acc += sanitized[i];
    if (r <= acc) return i;
  }
  return sanitized.length - 1;
}

/**
 * Selects a value from items using the provided weights.
 */
export function weightedRandomSelect<T>(items: T[], weights: number[], rng?: () => number): T {
  if (items.length !== weights.length || items.length === 0) {
    throw new Error("weightedRandomSelect: items and weights must be same non-zero length");
  }
  const idx = weightedRandomIndex(weights, rng);
  return items[idx];
}

/**
 * Calculates inverse-proportion coverage weights for topics.
 * Less-covered topics get higher weights. Ensures a minimum exploration weight.
 */
export function calculateCoverageWeights(
  topicDistribution: Record<string, number>,
  topics: string[],
  minWeight: number = 1
): Record<string, number> {
  // Determine maximum count to normalize inverse weights
  const counts = topics.map((t) => topicDistribution[t] ?? 0);
  const maxCount = counts.length > 0 ? Math.max(...counts) : 0;
  const weights: Record<string, number> = {};
  for (const t of topics) {
    const count = topicDistribution[t] ?? 0;
    // Inverse weighting: higher when count is lower; add 1 to avoid division by zero
    const inv = 1 / (count + 1);
    // Scale by maxCount+1 so ranges are reasonable, then clamp to minWeight
    const w = Math.max(minWeight, inv * (maxCount + 1));
    weights[t] = w;
  }
  return weights;
}
