import { OPENAI_API_KEY } from "@/constants/app.constants";
import { OPENAI_CONFIG, AI_SERVICE_ERRORS } from "@/constants/generation.constants";
import { EVALUATION_CONFIG } from "@/constants/evaluate.constants";
import { EDifficulty, EBloomLevel } from "@/types/mcq.types";
import { parseJsonObject } from "@/utils/json.utils";
import { generateQuestionPrompt } from "@/utils/mcq-prompts/selector-prompt.utils";
import {
  getStaticSubtopicMap,
  getCurrentTopicPhase,
  getTopicProgress,
  getRemainingQuestionsInTopic,
  getNextTopic,
} from "@/utils/mcq.utils";
import { weightedRandomIndex } from "@/utils/selection.utils";
import { createOpenAIClient, getErrorMessage } from "@/config/openai.config";

/**
 * selectNextQuestion
 * Server-only: LLM-driven selector that analyzes attempt context and determines optimal criteria
 * for the next question to ensure balanced, comprehensive evaluation coverage.
 *
 * Uses gpt-4o-mini with structured output to analyze:
 * - Distribution progress (Easy/Medium/Hard, coding threshold)
 * - Coverage gaps (topics, subtopics, Bloom levels)
 * - Recent patterns (avoid subtopic clustering)
 *
 * Returns target criteria for database query or generation.
 */
export async function selectNextQuestion(context: {
  attempt_id: string;
  questions_answered: number;
  easy_count: number;
  medium_count: number;
  hard_count: number;
  coding_count: number;
  topic_distribution: Record<string, number>;
  subtopic_distribution: Record<string, number>;
  bloom_distribution: Record<string, number>;
}): Promise<{
  difficulty: EDifficulty;
  coding_mode: boolean;
  preferred_topic: string;
  preferred_subtopic: string;
  preferred_bloom_level: EBloomLevel;
  reasoning: string;
}> {
  if (!OPENAI_API_KEY) throw new Error(AI_SERVICE_ERRORS.MISSING_API_KEY);
  const client = createOpenAIClient();

  const {
    questions_answered,
    easy_count,
    medium_count,
    hard_count,
    coding_count,
    topic_distribution,
    subtopic_distribution,
    bloom_distribution,
  } = context;

  const total_target = EVALUATION_CONFIG.TOTAL_QUESTIONS;
  const easy_target = EVALUATION_CONFIG.EASY_QUESTIONS;
  const medium_target = EVALUATION_CONFIG.MEDIUM_QUESTIONS;
  const hard_target = EVALUATION_CONFIG.HARD_QUESTIONS;
  const coding_target = EVALUATION_CONFIG.MIN_CODING_QUESTIONS;

  const currentTopic = getCurrentTopicPhase(questions_answered);
  const topicProgress = getTopicProgress(questions_answered, currentTopic);
  const remainingInTopic = getRemainingQuestionsInTopic(questions_answered);
  const nextTopic = getNextTopic(currentTopic);
  const subtopicsByTopic = getStaticSubtopicMap();

  // Distribution status
  const easy_remaining = Math.max(0, easy_target - easy_count);
  const medium_remaining = Math.max(0, medium_target - medium_count);
  const hard_remaining = Math.max(0, hard_target - hard_count);
  const coding_needed = Math.max(0, coding_target - coding_count);

  // Comprehensive coverage info
  const topic_list = Object.entries(topic_distribution)
    .map(([topic, count]) => `${topic}: ${count}`)
    .join(", ");
  const bloom_list = Object.entries(bloom_distribution)
    .map(([level, count]) => `${level}: ${count}`)
    .join(", ");
  // Detailed coverage breakdown
  const subtopic_list = Object.entries(subtopic_distribution)
    .map(([subtopic, count]) => `${subtopic}: ${count}`)
    .join(", ");

  // Difficulty breakdown
  const difficulty_list = [`Easy: ${easy_count}`, `Medium: ${medium_count}`, `Hard: ${hard_count}`].join(", ");

  // Coding breakdown
  const coding_list = `Coding questions: ${coding_count}/${total_target} (${coding_needed} more needed)`;

  // Detailed Bloom level breakdown
  const bloom_count_list = Object.entries(bloom_distribution)
    .map(([level, count]) => `${level}: ${count}`)
    .join(", ");

  // Note: Topic/subtopic information is now dynamically generated within generateQuestionPrompt
  const { system, user } = generateQuestionPrompt({
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
  });

  try {
    const res = await client.chat.completions.create({
      model: OPENAI_CONFIG.CHAT_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = res.choices[0]?.message?.content ?? "{}";
    const parsed = parseJsonObject(content, {
      difficulty: "Easy",
      coding_mode: false,
      preferred_topic: "React",
      preferred_subtopic: "",
      preferred_bloom_level: "Understand",
      reasoning: "Default selection",
    });

    // Structured log for selector output (non-sensitive)
    try {
      console.log("llm_selector_decision", {
        attempt_id: context.attempt_id,
        answered: context.questions_answered,
        decision: {
          difficulty: parsed.difficulty,
          coding_mode: parsed.coding_mode,
          preferred_topic: parsed.preferred_topic || "React",
          preferred_subtopic: parsed.preferred_subtopic || "",
          preferred_bloom_level: parsed.preferred_bloom_level || "Understand",
        },
        topic_phase: {
          current: currentTopic,
          completed: topicProgress.completed,
          total: topicProgress.total,
          remaining_in_topic: remainingInTopic,
          next: nextTopic,
        },
      });
    } catch (err) {
      console.error("🚀 ~ selectNextQuestion ~ err:", err);
    }

    // Validate and normalize
    const difficulty = ((): EDifficulty => {
      const d = String(parsed.difficulty || "").toLowerCase();
      if (d === "easy") return EDifficulty.EASY;
      if (d === "medium") return EDifficulty.MEDIUM;
      if (d === "hard") return EDifficulty.HARD;
      return EDifficulty.EASY;
    })();
    const coding_mode = Boolean(parsed.coding_mode);
    const requestedTopic = String(parsed.preferred_topic || currentTopic);
    const preferred_topic = currentTopic;
    const requestedSubtopic = String(parsed.preferred_subtopic || "");
    const availableSubtopics = subtopicsByTopic[currentTopic] || [];
    const preferred_subtopic = availableSubtopics.includes(requestedSubtopic) ? requestedSubtopic : "";
    const preferred_bloom_level = ((): EBloomLevel => {
      const l = String(parsed.preferred_bloom_level || "").toLowerCase();
      if (l === "remember") return EBloomLevel.REMEMBER;
      if (l === "understand") return EBloomLevel.UNDERSTAND;
      if (l === "apply") return EBloomLevel.APPLY;
      if (l === "analyze") return EBloomLevel.ANALYZE;
      if (l === "evaluate") return EBloomLevel.EVALUATE;
      if (l === "create") return EBloomLevel.CREATE;
      return EBloomLevel.UNDERSTAND;
    })();
    const reasoning = String(parsed.reasoning || "Selected based on attempt context");
    const topicOverrideNote =
      requestedTopic && requestedTopic !== currentTopic ? ` (override requested ${requestedTopic})` : "";
    const finalReasoning =
      `${reasoning} | Topic block: ${currentTopic}${topicOverrideNote} (${topicProgress.completed}/${topicProgress.total}, ${remainingInTopic} remaining)` +
      (nextTopic ? ` → Next: ${nextTopic}` : "");

    return {
      difficulty,
      coding_mode,
      preferred_topic,
      preferred_subtopic,
      preferred_bloom_level,
      reasoning: finalReasoning,
    };
  } catch (err) {
    console.error("LLM selector failed, using fallback:", getErrorMessage(err));

    // Enforce hard constraints with weighted randomization
    // Difficulty: pick by remaining quotas (weights proportional to deficit)
    const deficits: Array<{ d: EDifficulty; remaining: number }> = [
      { d: EDifficulty.EASY, remaining: easy_remaining },
      { d: EDifficulty.MEDIUM, remaining: medium_remaining },
      { d: EDifficulty.HARD, remaining: hard_remaining },
    ];
    const diffWeights = deficits.map((x) => Math.max(0, x.remaining));
    const diffIdx = weightedRandomIndex(diffWeights);
    const difficulty: EDifficulty = deficits[diffIdx]?.d ?? EDifficulty.EASY;

    // Force coding if behind pace (accelerate late if needed)
    const coding_mode = coding_needed > 0 && questions_answered >= Math.floor(total_target * 0.4);

    const topic = currentTopic;

    // Subtopic: prefer dynamic ontology for chosen topic, pick 1 underrepresented
    let preferred_subtopic: string = "";
    const subs = subtopicsByTopic[topic] || [];
    if (subs.length > 0) {
      const subWeights = subs.map((s) => 1 / ((subtopic_distribution[s] || 0) + 1));
      const idx = weightedRandomIndex(subWeights);
      preferred_subtopic = subs[idx] || "";
    }

    // Bloom level: prefer underrepresented globally
    const allBlooms: EBloomLevel[] = [
      EBloomLevel.REMEMBER,
      EBloomLevel.UNDERSTAND,
      EBloomLevel.APPLY,
      EBloomLevel.ANALYZE,
      EBloomLevel.EVALUATE,
      EBloomLevel.CREATE,
    ];
    const bloomWeights = allBlooms.map((b) => 1 / ((bloom_distribution[b] || 0) + 1));
    const preferred_bloom_level = allBlooms[weightedRandomIndex(bloomWeights)];

    return {
      difficulty,
      coding_mode,
      preferred_topic: topic,
      preferred_subtopic,
      preferred_bloom_level,
      reasoning:
        `Coverage-aware fallback after LLM error | Topic block: ${topic} (${topicProgress.completed}/${topicProgress.total}, ${remainingInTopic} remaining)` +
        (nextTopic ? ` → Next: ${nextTopic}` : ""),
    };
  }
}
