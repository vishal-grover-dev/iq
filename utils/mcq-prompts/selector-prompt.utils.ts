import { EBloomLevel } from "@/types/mcq.types";
import { EVALUATION_CONFIG } from "@/constants/evaluate.constants";
import { getStaticTopicPriority, getStaticSubtopicMap, getStaticTopicWeights } from "@/utils/mcq.utils";
import {
  getCurrentTopicPhase,
  getTopicProgress,
  getRemainingQuestionsInTopic,
  getNextTopic,
  getTopicRanges,
} from "@/utils/mcq.utils";

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
  const topicRanges = getTopicRanges();
  const currentTopic = getCurrentTopicPhase(questions_answered);
  const topicProgress = getTopicProgress(questions_answered, currentTopic);
  const remainingInTopic = getRemainingQuestionsInTopic(questions_answered);
  const nextTopic = getNextTopic(currentTopic);
  const topicSequence = topicRanges.map((range) => range.topic).join(" → ");
  const topicSequenceBreakdown = topicRanges
    .map((range) => `${range.topic}: Q${range.start}-${range.end} (${range.quota})`)
    .join("\n");
  const currentTopicSummary = `${currentTopic}: ${topicProgress.completed}/${topicProgress.total} completed (${remainingInTopic} remaining)`;
  const nextTopicSummary = nextTopic ?? "None (final topic)";

  // Get comprehensive ontology data
  const topicWeights = getStaticTopicWeights();
  const subtopicMap = getStaticSubtopicMap();

  // Build detailed topic information with weights and subtopics
  const topicDetails = Object.entries(topicWeights)
    .map(([topic, weight]) => {
      const subtopics = subtopicMap[topic] || [];
      const subtopicCount = subtopics.length;
      const priority = getStaticTopicPriority(topic);
      return {
        topic,
        weight: (weight * 100).toFixed(1) + "%",
        priority,
        subtopics: subtopics.slice(0, 5), // Show first 5 subtopics
        totalSubtopics: subtopicCount,
      };
    })
    .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight)); // Sort by weight descending

  // Create comprehensive topic breakdown
  const topicBreakdown = topicDetails
    .map(
      (t) =>
        `${t.topic}: ${t.weight} weight${t.priority ? ` (priority: ${t.priority})` : ""} (${
          t.totalSubtopics
        } subtopics) - ${t.subtopics.join(", ")}${t.totalSubtopics > 5 ? "..." : ""}`
    )
    .join("\n");

  // Get available Bloom levels from the enum
  const availableBloomLevels = Object.values(EBloomLevel).join(", ");

  const difficultyTargetsSummary = `${EVALUATION_CONFIG.EASY_QUESTIONS} Easy, ${EVALUATION_CONFIG.MEDIUM_QUESTIONS} Medium, ${EVALUATION_CONFIG.HARD_QUESTIONS} Hard (total ${EVALUATION_CONFIG.TOTAL_QUESTIONS} questions)`;
  const codingThresholdSummary = `${EVALUATION_CONFIG.MIN_CODING_QUESTIONS} of ${EVALUATION_CONFIG.TOTAL_QUESTIONS}`;

  const system = `You are an intelligent question selector for a comprehensive frontend skills evaluation. Your role is to analyze attempt context and determine optimal criteria for the next question to ensure:

BALANCE REQUIREMENTS:
1. Difficulty distribution: ${difficultyTargetsSummary}
2. Coding threshold: ≥35% coding questions (minimum ${codingThresholdSummary})
3. Topic sequencing: Follow the strict topic order (${topicSequence}). Do not advance to the next block until the current quota is satisfied.
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

TOPIC SEQUENCING (STRICT):
- Current block progress: ${currentTopicSummary}
- Next block: ${nextTopicSummary}
- Full sequence plan:
${topicSequenceBreakdown}

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

Topic sequencing status:
- Current topic block: ${currentTopicSummary}
- Next topic block: ${nextTopicSummary}
- Planned sequence:
${topicSequenceBreakdown}

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
