/**
 * Custom Playwright matchers for evaluate page testing
 * Provides domain-specific assertions for testing evaluation integrity
 */

import { expect } from "@playwright/test";
import { EVALUATION_CONFIG } from "@/constants/evaluate.constants";

/**
 * Assert that all question IDs are unique
 */
export async function toHaveUniqueQuestionIds(questionIds: string[]): Promise<void> {
  const uniqueIds = new Set(questionIds);
  expect(uniqueIds.size).toBe(questionIds.length);
  expect(questionIds.length).toBeGreaterThan(0);
}

/**
 * Assert that question distribution matches expected counts
 */
export async function toHaveDistribution(
  questions: Array<{ difficulty: string; coding_mode?: boolean; topic?: string }>,
  expected: {
    easy?: number;
    medium?: number;
    hard?: number;
    coding?: number;
    topics?: Record<string, number>;
  }
): Promise<void> {
  // Count actual distribution
  const actual = {
    easy: questions.filter((q) => q.difficulty === "Easy").length,
    medium: questions.filter((q) => q.difficulty === "Medium").length,
    hard: questions.filter((q) => q.difficulty === "Hard").length,
    coding: questions.filter((q) => q.coding_mode === true).length,
    topics: questions.reduce((acc, q) => {
      if (q.topic) {
        acc[q.topic] = (acc[q.topic] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
  };

  // Assert difficulty distribution
  if (expected.easy !== undefined) {
    expect(actual.easy).toBe(expected.easy);
  }
  if (expected.medium !== undefined) {
    expect(actual.medium).toBe(expected.medium);
  }
  if (expected.hard !== undefined) {
    expect(actual.hard).toBe(expected.hard);
  }

  // Assert coding threshold
  if (expected.coding !== undefined) {
    expect(actual.coding).toBe(expected.coding);
  }

  // Assert topic distribution
  if (expected.topics) {
    for (const [topic, expectedCount] of Object.entries(expected.topics)) {
      expect(actual.topics[topic] || 0).toBe(expectedCount);
    }
  }
}

/**
 * Assert that an array has no duplicates
 */
export async function toHaveNoDuplicates<T>(array: T[]): Promise<void> {
  const unique = new Set(array);
  expect(unique.size).toBe(array.length);
}

/**
 * Assert that minimum coding questions threshold is met
 */
export async function toHaveMinimumCodingQuestions(
  questions: Array<{ coding_mode?: boolean }>,
  minCoding: number = EVALUATION_CONFIG.MIN_CODING_QUESTIONS
): Promise<void> {
  const codingCount = questions.filter((q) => q.coding_mode === true).length;
  expect(codingCount).toBeGreaterThanOrEqual(minCoding);
}

/**
 * Assert that no single topic exceeds the maximum percentage
 */
export async function toHaveBalancedTopics(
  questions: Array<{ topic?: string }>,
  maxPercentage: number = EVALUATION_CONFIG.MAX_TOPIC_PERCENTAGE
): Promise<void> {
  const topicCounts = questions.reduce((acc, q) => {
    if (q.topic) {
      acc[q.topic] = (acc[q.topic] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const totalQuestions = questions.length;
  const maxAllowed = Math.floor((maxPercentage / 100) * totalQuestions);

  for (const [topic, count] of Object.entries(topicCounts)) {
    expect(count).toBeLessThanOrEqual(maxAllowed);
  }
}

/**
 * Assert that question content has sufficient uniqueness
 * Enhanced for AI-generated questions with multiple similarity detection methods
 */
export async function toHaveUniqueContent(
  questions: Array<{ question: string; id: string }>,
  similarityThreshold: number = 0.7
): Promise<void> {
  const duplicatePairs: Array<{ q1: number; q2: number; similarity: number; method: string }> = [];

  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const q1 = questions[i].question;
      const q2 = questions[j].question;

      // Multiple similarity detection methods
      const jaccardSimilarity = calculateJaccardSimilarity(q1, q2);
      const cosineSimilarity = calculateCosineSimilarity(q1, q2);
      const semanticSimilarity = calculateSemanticSimilarity(q1, q2);
      const patternSimilarity = detectAIPatterns(q1, q2);

      // Use the highest similarity score
      const maxSimilarity = Math.max(jaccardSimilarity, cosineSimilarity, semanticSimilarity, patternSimilarity);

      if (maxSimilarity >= similarityThreshold) {
        const method =
          maxSimilarity === jaccardSimilarity
            ? "jaccard"
            : maxSimilarity === cosineSimilarity
            ? "cosine"
            : maxSimilarity === semanticSimilarity
            ? "semantic"
            : "pattern";

        duplicatePairs.push({
          q1: i,
          q2: j,
          similarity: maxSimilarity,
          method,
        });
      }
    }
  }

  if (duplicatePairs.length > 0) {
    const errorMessage =
      `Found ${duplicatePairs.length} potentially duplicate question pairs:\n` +
      duplicatePairs
        .map(
          (pair) =>
            `Questions ${pair.q1 + 1} & ${pair.q2 + 1} (${pair.similarity.toFixed(3)} similarity via ${
              pair.method
            }):\n` +
            `  Q1: "${questions[pair.q1].question.substring(0, 100)}..."\n` +
            `  Q2: "${questions[pair.q2].question.substring(0, 100)}..."`
        )
        .join("\n\n");

    throw new Error(errorMessage);
  }
}

/**
 * Assert that progress format is correct (X/60)
 */
export async function toHaveCorrectProgressFormat(progressText: string): Promise<void> {
  // Should be in "Question X / 60" format
  const match = progressText.match(/^Question\s+(\d+)\s*\/\s*(\d+)$/);
  expect(match).not.toBeNull();

  if (match) {
    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);

    expect(current).toBeGreaterThanOrEqual(0);
    expect(current).toBeLessThanOrEqual(EVALUATION_CONFIG.TOTAL_QUESTIONS);
    expect(total).toBe(EVALUATION_CONFIG.TOTAL_QUESTIONS);
  }
}

/**
 * Assert that no score or percentage is displayed
 */
export async function toHaveNoScoreDisplay(page: any): Promise<void> {
  // The UI shows percentage completion (e.g., "15% complete") but this is progress, not score
  // We should allow progress percentage but not score percentage
  // Check for score display (not progress percentage)
  await expect(page.locator("text=/\\d+\\s+correct/")).not.toBeVisible();
  await expect(page.locator("text=/score/i")).not.toBeVisible();

  // Check for accuracy display
  await expect(page.locator("text=/accuracy/i")).not.toBeVisible();
}

/**
 * Assert that progress bar has proper accessibility attributes
 */
export async function toHaveAccessibleProgress(page: any): Promise<void> {
  const progressBar = page.locator("[role='progressbar']");
  await expect(progressBar).toBeVisible();

  // Check ARIA attributes
  await expect(progressBar).toHaveAttribute("aria-valuenow");
  await expect(progressBar).toHaveAttribute("aria-valuemin", "0");
  await expect(progressBar).toHaveAttribute("aria-valuemax", EVALUATION_CONFIG.TOTAL_QUESTIONS.toString());
}

/**
 * Calculate Jaccard similarity between two strings
 */
function calculateJaccardSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.toLowerCase().split(/\s+/));
  const set2 = new Set(str2.toLowerCase().split(/\s+/));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between two strings
 * Better for detecting semantic similarity in AI-generated content
 */
function calculateCosineSimilarity(str1: string, str2: string): number {
  const words1 = tokenizeText(str1);
  const words2 = tokenizeText(str2);

  const allWords = new Set([...words1, ...words2]);
  const vector1 = Array.from(allWords).map((word) => words1.filter((w) => w === word).length);
  const vector2 = Array.from(allWords).map((word) => words2.filter((w) => w === word).length);

  const dotProduct = vector1.reduce((sum, val, i) => sum + val * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

  if (magnitude1 === 0 || magnitude2 === 0) return 0;

  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate semantic similarity for AI-generated questions
 * Detects paraphrasing, synonym usage, and structural variations
 */
function calculateSemanticSimilarity(str1: string, str2: string): number {
  // Normalize text for comparison
  const normalized1 = normalizeForSemanticComparison(str1);
  const normalized2 = normalizeForSemanticComparison(str2);

  // Check for exact matches after normalization
  if (normalized1 === normalized2) return 1.0;

  // Check for structural similarity (same question type)
  const structure1 = extractQuestionStructure(str1);
  const structure2 = extractQuestionStructure(str2);
  if (structure1 === structure2) {
    // Same structure, check content similarity
    const contentSimilarity = calculateCosineSimilarity(normalized1, normalized2);
    return Math.min(contentSimilarity + 0.2, 1.0); // Boost for same structure
  }

  // Check for key concept overlap
  const concepts1 = extractKeyConcepts(str1);
  const concepts2 = extractKeyConcepts(str2);
  const conceptOverlap = calculateConceptOverlap(concepts1, concepts2);

  return conceptOverlap;
}

/**
 * Detect AI-generated question patterns
 * Identifies common AI paraphrasing and variation patterns
 */
function detectAIPatterns(str1: string, str2: string): number {
  const patterns = [
    // Question type variations
    detectQuestionTypeVariation(str1, str2),
    // Synonym substitution patterns
    detectSynonymSubstitution(str1, str2),
    // Structural reordering
    detectStructuralReordering(str1, str2),
    // Tense/voice changes
    detectTenseVoiceChanges(str1, str2),
    // Negation patterns
    detectNegationPatterns(str1, str2),
  ];

  return Math.max(...patterns);
}

/**
 * Tokenize text for similarity analysis
 */
function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2); // Filter out short words
}

/**
 * Normalize text for semantic comparison
 */
function normalizeForSemanticComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract question structure (what, how, why, which, etc.)
 */
function extractQuestionStructure(text: string): string {
  const questionWords = text.match(/^(what|how|why|which|when|where|who|can|could|should|would|is|are|do|does|did)\b/i);
  return questionWords ? questionWords[0].toLowerCase() : "other";
}

/**
 * Extract key concepts from question text
 */
function extractKeyConcepts(text: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "can",
    "may",
    "might",
    "must",
    "this",
    "that",
    "these",
    "those",
  ]);

  return tokenizeText(text)
    .filter((word) => !stopWords.has(word) && word.length > 3)
    .slice(0, 10); // Limit to top 10 concepts
}

/**
 * Calculate concept overlap between two question sets
 */
function calculateConceptOverlap(concepts1: string[], concepts2: string[]): number {
  if (concepts1.length === 0 || concepts2.length === 0) return 0;

  const set1 = new Set(concepts1);
  const set2 = new Set(concepts2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Detect question type variations (what vs which vs how)
 */
function detectQuestionTypeVariation(str1: string, str2: string): number {
  const type1 = extractQuestionStructure(str1);
  const type2 = extractQuestionStructure(str2);

  if (type1 === type2) return 0.8; // Same question type
  if (["what", "which"].includes(type1) && ["what", "which"].includes(type2)) return 0.6; // Similar types
  return 0;
}

/**
 * Detect synonym substitution patterns
 */
function detectSynonymSubstitution(str1: string, str2: string): number {
  // Common AI synonym patterns
  const synonymGroups = [
    ["create", "make", "build", "generate"],
    ["use", "utilize", "employ", "apply"],
    ["function", "method", "procedure"],
    ["variable", "var", "identifier"],
    ["array", "list", "collection"],
    ["object", "instance", "entity"],
    ["class", "type", "structure"],
    ["property", "attribute", "field"],
    ["parameter", "argument", "input"],
    ["return", "output", "result"],
  ];

  const words1 = tokenizeText(str1);
  const words2 = tokenizeText(str2);

  let synonymMatches = 0;
  let totalWords = Math.max(words1.length, words2.length);

  for (const group of synonymGroups) {
    const hasGroup1 = group.some((word) => words1.includes(word));
    const hasGroup2 = group.some((word) => words2.includes(word));

    if (hasGroup1 && hasGroup2) {
      synonymMatches += 1;
    }
  }

  return totalWords > 0 ? synonymMatches / totalWords : 0;
}

/**
 * Detect structural reordering (same content, different order)
 */
function detectStructuralReordering(str1: string, str2: string): number {
  const words1 = tokenizeText(str1);
  const words2 = tokenizeText(str2);

  if (words1.length !== words2.length) return 0;

  // Check if words are the same but in different order
  const sorted1 = [...words1].sort();
  const sorted2 = [...words2].sort();

  if (JSON.stringify(sorted1) === JSON.stringify(sorted2)) {
    return 0.9; // Same words, different order
  }

  return 0;
}

/**
 * Detect tense/voice changes (active vs passive)
 */
function detectTenseVoiceChanges(str1: string, str2: string): number {
  const passivePattern = /\b(is|are|was|were|be|been)\s+\w+ed\b/;
  const activePattern = /\b\w+s?\s+(is|are|was|were|be|been)\b/;

  const isPassive1 = passivePattern.test(str1);
  const isPassive2 = passivePattern.test(str2);
  const isActive1 = activePattern.test(str1);
  const isActive2 = activePattern.test(str2);

  if ((isPassive1 && isActive2) || (isActive1 && isPassive2)) {
    return 0.7; // Different voice, likely same question
  }

  return 0;
}

/**
 * Detect negation patterns (positive vs negative phrasing)
 */
function detectNegationPatterns(str1: string, str2: string): number {
  const negationWords = ["not", "no", "never", "none", "nothing", "nowhere", "nobody"];
  const hasNegation1 = negationWords.some((word) => str1.toLowerCase().includes(word));
  const hasNegation2 = negationWords.some((word) => str2.toLowerCase().includes(word));

  if (hasNegation1 !== hasNegation2) {
    // One is positive, one is negative - could be same question
    const normalized1 = str1.toLowerCase().replace(/\b(not|no|never|none|nothing|nowhere|nobody)\b/g, "");
    const normalized2 = str2.toLowerCase().replace(/\b(not|no|never|none|nothing|nowhere|nobody)\b/g, "");

    if (calculateCosineSimilarity(normalized1, normalized2) > 0.6) {
      return 0.8; // Same content, different negation
    }
  }

  return 0;
}

/**
 * Assert that API response contains only allowed fields
 */
export async function toHaveValidApiResponse(response: any, allowedFields: string[]): Promise<void> {
  const responseKeys = Object.keys(response);

  for (const key of responseKeys) {
    expect(allowedFields).toContain(key);
  }

  // Check that forbidden fields are not present
  const forbiddenFields = ["is_correct", "correct_index", "explanation", "score", "percentage"];
  for (const field of forbiddenFields) {
    expect(response).not.toHaveProperty(field);
  }
}

/**
 * Assert that question metadata is valid
 */
export async function toHaveValidQuestionMetadata(question: {
  id: string;
  question: string;
  options: string[];
  metadata: {
    topic: string;
    subtopic: string | null;
    difficulty: string;
    bloom_level: string;
    question_order: number;
    coding_mode: boolean;
  };
}): Promise<void> {
  // Check required fields
  expect(question.id).toBeTruthy();
  expect(question.question).toBeTruthy();
  expect(question.options).toHaveLength(4);

  // Check metadata
  expect(question.metadata.topic).toBeTruthy();
  expect(question.metadata.difficulty).toMatch(/^(Easy|Medium|Hard)$/);
  expect(question.metadata.bloom_level).toBeTruthy();
  expect(question.metadata.question_order).toBeGreaterThan(0);
  expect(typeof question.metadata.coding_mode).toBe("boolean");
}

/**
 * Assert that attempt progress is valid
 */
export async function toHaveValidAttemptProgress(progress: {
  questions_answered: number;
  total_questions: number;
  is_complete: boolean;
}): Promise<void> {
  expect(progress.questions_answered).toBeGreaterThanOrEqual(0);
  expect(progress.questions_answered).toBeLessThanOrEqual(progress.total_questions);
  expect(progress.total_questions).toBe(EVALUATION_CONFIG.TOTAL_QUESTIONS);
  expect(typeof progress.is_complete).toBe("boolean");

  if (progress.questions_answered === progress.total_questions) {
    expect(progress.is_complete).toBe(true);
  }
}
