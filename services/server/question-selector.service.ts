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
import { applyCodingPacing, enforceBloomTargets, enforceDifficultyLimits } from "@/utils/evaluation-selection.utils";

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
  coverage_summary: { hotspots: string[]; opportunities: string[] };
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
    coverage_summary,
  } = context;

  const total_target = EVALUATION_CONFIG.TOTAL_QUESTIONS;
  const difficultyTargets = EVALUATION_CONFIG.DIFFICULTY_TARGETS;
  const bloomTargets = EVALUATION_CONFIG.BLOOM_TARGETS;
  const easy_cap = difficultyTargets.MAX_EASY;
  const medium_cap = difficultyTargets.MAX_MEDIUM;
  const hard_floor = difficultyTargets.MIN_HARD;
  const coding_target = EVALUATION_CONFIG.MIN_CODING_QUESTIONS;

  const understand_cap = bloomTargets.MAX_UNDERSTAND;
  const apply_cap = bloomTargets.MAX_APPLY;
  const analyze_min = bloomTargets.MIN_ANALYZE;
  const eval_create_min = bloomTargets.MIN_EVALUATE_CREATE;

  const currentTopic = getCurrentTopicPhase(questions_answered);
  const topicProgress = getTopicProgress(questions_answered, currentTopic);
  const remainingInTopic = getRemainingQuestionsInTopic(questions_answered);
  const nextTopic = getNextTopic(currentTopic);
  const subtopicsByTopic = getStaticSubtopicMap();

  const questionsRemaining = Math.max(total_target - questions_answered, 0);

  // Distribution status
  const easy_remaining = Math.max(0, easy_cap - easy_count);
  const medium_remaining = Math.max(0, medium_cap - medium_count);
  const hard_needed = Math.max(0, hard_floor - hard_count);
  const coding_needed = Math.max(0, coding_target - coding_count);

  const bloomCounts: Record<EBloomLevel, number> = {
    [EBloomLevel.REMEMBER]: bloom_distribution[EBloomLevel.REMEMBER] ?? 0,
    [EBloomLevel.UNDERSTAND]: bloom_distribution[EBloomLevel.UNDERSTAND] ?? 0,
    [EBloomLevel.APPLY]: bloom_distribution[EBloomLevel.APPLY] ?? 0,
    [EBloomLevel.ANALYZE]: bloom_distribution[EBloomLevel.ANALYZE] ?? 0,
    [EBloomLevel.EVALUATE]: bloom_distribution[EBloomLevel.EVALUATE] ?? 0,
    [EBloomLevel.CREATE]: bloom_distribution[EBloomLevel.CREATE] ?? 0,
  };

  const understand_remaining = Math.max(0, understand_cap - bloomCounts[EBloomLevel.UNDERSTAND]);
  const apply_remaining = Math.max(0, apply_cap - bloomCounts[EBloomLevel.APPLY]);
  const analyze_needed = Math.max(0, analyze_min - bloomCounts[EBloomLevel.ANALYZE]);
  const eval_create_count = bloomCounts[EBloomLevel.EVALUATE] + bloomCounts[EBloomLevel.CREATE];
  const eval_create_needed = Math.max(0, eval_create_min - eval_create_count);

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

  const coverage_hotspots = coverage_summary?.hotspots ?? [];
  const coverage_opportunities = coverage_summary?.opportunities ?? [];

  const difficulty_goal_summary = `≤${easy_cap} Easy, ≤${medium_cap} Medium, ≥${hard_floor} Hard`;
  const bloom_goal_summary = `Understand ≤${understand_cap}, Apply ≤${apply_cap}, Analyze ≥${analyze_min}, Evaluate/Create ≥${eval_create_min}`;

  // Note: Topic/subtopic information is now dynamically generated within generateQuestionPrompt
  const { system, user } = generateQuestionPrompt({
    questions_answered,
    total_target,
    easy_count,
    medium_count,
    hard_count,
    coding_count,
    easy_target: easy_cap,
    medium_target: medium_cap,
    hard_target: hard_floor,
    coding_target,
    easy_remaining,
    medium_remaining,
    hard_remaining: hard_needed,
    coding_needed,
    topic_list,
    subtopic_list,
    bloom_list,
    difficulty_list,
    coding_list,
    bloom_count_list,
    coverage_hotspots,
    coverage_opportunities,
    difficulty_goal_summary,
    bloom_goal_summary,
    understand_cap,
    apply_cap,
    analyze_min,
    eval_create_min,
    understand_remaining,
    apply_remaining,
    analyze_needed,
    eval_create_needed,
    understand_count: bloomCounts[EBloomLevel.UNDERSTAND],
    apply_count: bloomCounts[EBloomLevel.APPLY],
    analyze_count: bloomCounts[EBloomLevel.ANALYZE],
    evaluate_count: bloomCounts[EBloomLevel.EVALUATE],
    create_count: bloomCounts[EBloomLevel.CREATE],
    remember_count: bloomCounts[EBloomLevel.REMEMBER],
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
    const requestedDifficulty = ((): EDifficulty => {
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
    const requestedBloomLevel = ((): EBloomLevel => {
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

    const normalizedDifficulty = enforceDifficultyLimits(requestedDifficulty, {
      easyRemaining: easy_remaining,
      mediumRemaining: medium_remaining,
      hardNeeded: hard_needed,
      questionsRemaining,
      questionsAnswered: questions_answered,
      easyCount: easy_count,
      mediumCount: medium_count,
      hardCount: hard_count,
      totalQuestions: total_target,
      hardTarget: hard_floor,
      easyCap: easy_cap,
      mediumCap: medium_cap,
    });

    const normalizedBloomLevel = enforceBloomTargets(requestedBloomLevel, {
      counts: bloomCounts,
      understandCap: understand_cap,
      applyCap: apply_cap,
      analyzeMin: analyze_min,
      evalCreateMin: eval_create_min,
      questionsRemaining,
      questionsAnswered: questions_answered,
      totalQuestions: total_target,
    });

    if (normalizedDifficulty !== requestedDifficulty) {
      console.log("difficulty_enforcement_override", {
        attempt_id: context.attempt_id,
        answered: questions_answered,
        requested: requestedDifficulty,
        enforced: normalizedDifficulty,
        easy_remaining: easy_remaining,
        medium_remaining: medium_remaining,
        hard_needed: hard_needed,
        questions_remaining: questionsRemaining,
        hard_count: hard_count,
      });
    }

    if (normalizedBloomLevel !== requestedBloomLevel) {
      console.log("bloom_enforcement_override", {
        attempt_id: context.attempt_id,
        answered: questions_answered,
        requested: requestedBloomLevel,
        enforced: normalizedBloomLevel,
        analyze_needed: Math.max(0, analyze_min - (bloomCounts[EBloomLevel.ANALYZE] ?? 0)),
        eval_create_needed: Math.max(
          0,
          eval_create_min - ((bloomCounts[EBloomLevel.EVALUATE] ?? 0) + (bloomCounts[EBloomLevel.CREATE] ?? 0))
        ),
        questions_remaining: questionsRemaining,
      });
    }

    const pacedCodingMode = applyCodingPacing(coding_mode, {
      questionsAnswered: questions_answered,
      codingCount: coding_count,
      codingNeeded: coding_needed,
      totalQuestions: total_target,
    });

    return {
      difficulty: normalizedDifficulty,
      coding_mode: pacedCodingMode,
      preferred_topic,
      preferred_subtopic,
      preferred_bloom_level: normalizedBloomLevel,
      reasoning: finalReasoning,
    };
  } catch (err) {
    console.error("LLM selector failed, using fallback:", getErrorMessage(err));

    // Enforce hard constraints with weighted randomization
    // Difficulty: pick by remaining quotas (weights proportional to deficit)
    const deficits: Array<{ d: EDifficulty; remaining: number }> = [
      { d: EDifficulty.EASY, remaining: easy_remaining },
      { d: EDifficulty.MEDIUM, remaining: medium_remaining },
      { d: EDifficulty.HARD, remaining: Math.max(hard_needed, 1) },
    ];
    const diffWeights = deficits.map((x) => Math.max(0, x.remaining));
    const diffIdx = weightedRandomIndex(diffWeights);
    const requestedDifficulty: EDifficulty = deficits[diffIdx]?.d ?? EDifficulty.EASY;
    const difficulty = enforceDifficultyLimits(requestedDifficulty, {
      easyRemaining: easy_remaining,
      mediumRemaining: medium_remaining,
      hardNeeded: hard_needed,
      questionsRemaining,
      questionsAnswered: questions_answered,
      easyCount: easy_count,
      mediumCount: medium_count,
      hardCount: hard_count,
      totalQuestions: total_target,
      hardTarget: hard_floor,
      easyCap: easy_cap,
      mediumCap: medium_cap,
    });

    // Force coding if behind pace (accelerate late if needed)
    const rawCodingMode = coding_needed > 0 && questions_answered >= Math.floor(total_target * 0.4);
    const coding_mode = applyCodingPacing(rawCodingMode, {
      questionsAnswered: questions_answered,
      codingCount: coding_count,
      codingNeeded: coding_needed,
      totalQuestions: total_target,
    });

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
    let bloomWeights = allBlooms.map((level) => {
      if (level === EBloomLevel.UNDERSTAND && understand_remaining <= 0) return 0;
      if (level === EBloomLevel.APPLY && apply_remaining <= 0) return 0;
      if (level === EBloomLevel.ANALYZE && analyze_needed > 0) return analyze_needed + 5;
      if (level === EBloomLevel.EVALUATE || level === EBloomLevel.CREATE) {
        if (eval_create_needed > 0) {
          const levelCount = bloomCounts[level] ?? 0;
          const counterpart =
            level === EBloomLevel.EVALUATE ? bloomCounts[EBloomLevel.CREATE] : bloomCounts[EBloomLevel.EVALUATE];
          const balanceBonus = levelCount <= counterpart ? 2 : 1;
          return eval_create_needed + 4 + balanceBonus;
        }
        return 1 / ((bloom_distribution[level] || 0) + 1);
      }
      return 1 / ((bloom_distribution[level] || 0) + 1);
    });

    if (bloomWeights.every((weight) => weight <= 0)) {
      bloomWeights = allBlooms.map(() => 1);
    }

    const requestedBloom = allBlooms[weightedRandomIndex(bloomWeights)];
    const preferred_bloom_level = enforceBloomTargets(requestedBloom, {
      counts: bloomCounts,
      understandCap: understand_cap,
      applyCap: apply_cap,
      analyzeMin: analyze_min,
      evalCreateMin: eval_create_min,
      questionsRemaining,
      questionsAnswered: questions_answered,
      totalQuestions: total_target,
    });

    if (difficulty !== requestedDifficulty) {
      console.log("difficulty_enforcement_override_fallback", {
        attempt_id: context.attempt_id,
        answered: context.questions_answered,
        requested: requestedDifficulty,
        enforced: difficulty,
        easy_remaining: easy_remaining,
        medium_remaining: medium_remaining,
        hard_needed: hard_needed,
        questions_remaining: questionsRemaining,
        hard_count: hard_count,
      });
    }

    if (preferred_bloom_level !== requestedBloom) {
      console.log("bloom_enforcement_override_fallback", {
        attempt_id: context.attempt_id,
        answered: context.questions_answered,
        requested: requestedBloom,
        enforced: preferred_bloom_level,
        analyze_needed: Math.max(0, analyze_min - (bloomCounts[EBloomLevel.ANALYZE] ?? 0)),
        eval_create_needed: Math.max(
          0,
          eval_create_min - ((bloomCounts[EBloomLevel.EVALUATE] ?? 0) + (bloomCounts[EBloomLevel.CREATE] ?? 0))
        ),
        questions_remaining: questionsRemaining,
      });
    }

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
