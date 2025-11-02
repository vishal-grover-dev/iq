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
  coverage_hotspots: string[];
  coverage_opportunities: string[];
  difficulty_goal_summary: string;
  bloom_goal_summary: string;
  understand_cap: number;
  apply_cap: number;
  analyze_min: number;
  eval_create_min: number;
  understand_remaining: number;
  apply_remaining: number;
  analyze_needed: number;
  eval_create_needed: number;
  understand_count: number;
  apply_count: number;
  analyze_count: number;
  evaluate_count: number;
  create_count: number;
  remember_count: number;
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
    understand_count,
    apply_count,
    analyze_count,
    evaluate_count,
    create_count,
    remember_count,
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

  const difficultyTargetsSummary = difficulty_goal_summary;
  const bloomTargetsSummary = bloom_goal_summary;
  const codingThresholdSummary = `${EVALUATION_CONFIG.MIN_CODING_QUESTIONS} of ${EVALUATION_CONFIG.TOTAL_QUESTIONS}`;

  const hotspotList = coverage_hotspots.length
    ? coverage_hotspots.map((line) => `- ${line}`).join("\n")
    : "- None recorded yet";
  const opportunityList = coverage_opportunities.length
    ? coverage_opportunities.map((line) => `- ${line}`).join("\n")
    : "- No clear gaps yet — explore adjacent subtopics";

  const difficultyProgress = `- Easy: ${easy_count}/${easy_target} (capacity left ${easy_remaining})\n- Medium: ${medium_count}/${medium_target} (capacity left ${medium_remaining})\n- Hard: ${hard_count} completed (need ≥${hard_target}, remaining ${hard_remaining})`;

  const combinedEvalCreate = evaluate_count + create_count;
  const bloomGoalStatus = `- Remember: ${remember_count}\n- Understand: ${understand_count}/${understand_cap} (cap remaining ${understand_remaining})\n- Apply: ${apply_count}/${apply_cap} (cap remaining ${apply_remaining})\n- Analyze: ${analyze_count}/${analyze_min} (need ${analyze_needed})\n- Evaluate/Create combined: ${combinedEvalCreate}/${eval_create_min} (need ${eval_create_needed})`;

  const system = `You are an intelligent question selector for a comprehensive frontend skills evaluation. Your role is to analyze attempt context and determine optimal criteria for the next question to ensure:

BALANCE REQUIREMENTS:
1. Difficulty caps: ${difficultyTargetsSummary}
2. Coding threshold: ≥35% coding questions (minimum ${codingThresholdSummary})
3. Topic sequencing: Follow the strict topic order (${topicSequence}). Do not advance to the next block until the current quota is satisfied.
4. Bloom goals: ${bloomTargetsSummary}
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

RECENT COVERAGE PATTERNS TO CONSIDER:
Hotspots (overused combinations):
${hotspotList}

Opportunities (under-served combinations):
${opportunityList}

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

Distribution progress vs targets:
${difficultyProgress}
- Coding: ${coding_count}/${total_target} (need ≥${coding_target}, ${coding_needed} more needed)

Topic sequencing status:
- Current topic block: ${currentTopicSummary}
- Next topic block: ${nextTopicSummary}
- Planned sequence:
${topicSequenceBreakdown}

Comprehensive coverage of answered questions:
- Topics covered: ${topic_list || "none yet"}
- Subtopics covered: ${subtopic_list || "none yet"}
- Bloom levels used: ${bloom_list || "none yet"}${bloom_count_list ? ` (counts: ${bloom_count_list})` : ""}
- Bloom goal progress:
${bloomGoalStatus}
- Difficulty levels used: ${difficulty_list || "none yet"}
- Coding questions: ${coding_list || "none yet"}

Recent coverage hotspots to avoid repeating:
${hotspotList}

Coverage opportunities you should prioritize when possible:
${opportunityList}

Based on the dynamic topic weights (shown above) and current attempt state, determine optimal criteria for question #${
    questions_answered + 1
  }. Consider both the weight-based importance of topics and the current distribution balance needs.`;

  return { system, user };
}
