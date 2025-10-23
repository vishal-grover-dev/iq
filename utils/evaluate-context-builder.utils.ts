import { SupabaseClient } from "@supabase/supabase-js";
import {
  IDistributions,
  IAttemptContext,
  EAttemptStatus,
  IAskedQuestionRow,
  IMcqRowWithDetails,
} from "@/types/evaluate.types";
import { EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";

/**
 * Calculate difficulty, coding, topic, subtopic, and Bloom distributions from asked questions
 */
export function calculateDistributions(askedQuestions: IAskedQuestionRow[]): IDistributions {
  return askedQuestions.reduce(
    (acc, q) => {
      const mcq = q.mcq_items as IMcqRowWithDetails | undefined;
      if (!mcq) return acc;

      const difficulty = mcq.difficulty as string;
      const bloom = mcq.bloom_level as string;
      const topic = mcq.topic as string;
      const subtopic = (mcq.subtopic as string) || "";
      const hasCoding = !!mcq.code;

      // Difficulty counts
      if (difficulty === "Easy") acc.easy_count++;
      else if (difficulty === "Medium") acc.medium_count++;
      else if (difficulty === "Hard") acc.hard_count++;

      // Coding count
      if (hasCoding) acc.coding_count++;

      // Topic distribution
      acc.topic_distribution[topic] = (acc.topic_distribution[topic] || 0) + 1;

      // Subtopic distribution
      if (subtopic) {
        acc.subtopic_distribution[subtopic] = (acc.subtopic_distribution[subtopic] || 0) + 1;
      }

      // Bloom distribution
      acc.bloom_distribution[bloom] = (acc.bloom_distribution[bloom] || 0) + 1;

      return acc;
    },
    {
      easy_count: 0,
      medium_count: 0,
      hard_count: 0,
      coding_count: 0,
      topic_distribution: {} as Record<string, number>,
      subtopic_distribution: {} as Record<string, number>,
      bloom_distribution: {} as Record<string, number>,
    }
  );
}

/**
 * Build selection context for LLM selector from distributions
 */
export function buildSelectionContext(
  attemptId: string,
  questionsAnswered: number,
  distributions: IDistributions
): IAttemptContext {
  return {
    attempt_id: attemptId,
    questions_answered: questionsAnswered,
    easy_count: distributions.easy_count,
    medium_count: distributions.medium_count,
    hard_count: distributions.hard_count,
    coding_count: distributions.coding_count,
    topic_distribution: distributions.topic_distribution,
    subtopic_distribution: distributions.subtopic_distribution,
    bloom_distribution: distributions.bloom_distribution,
    recent_subtopics: Object.keys(distributions.subtopic_distribution).slice(0, 5),
    asked_question_ids: [],
  };
}

/**
 * Identify topics that have exceeded balance limits based on stage
 */
export function identifyOverrepresentedTopics(distributions: IDistributions, questionsAnswered: number): string[] {
  const { EARLY_STAGE_THRESHOLD, MID_STAGE_THRESHOLD, EARLY_STAGE_CAP, MID_STAGE_CAP, LIMIT } =
    EVALUATE_SELECTION_CONFIG.TOPIC_BALANCE;

  // Determine cap based on attempt stage
  let cap: number = LIMIT; // Default for late stage

  if (questionsAnswered <= EARLY_STAGE_THRESHOLD) {
    cap = EARLY_STAGE_CAP; // Early: 30% of 60 = 18
  } else if (questionsAnswered <= MID_STAGE_THRESHOLD) {
    cap = MID_STAGE_CAP; // Mid: 40% of 60 = 24
  }

  // Return topics exceeding the cap for their stage
  return Object.keys(distributions.topic_distribution).filter((t) => (distributions.topic_distribution[t] || 0) >= cap);
}

/**
 * Fetch recent questions from last 2 completed attempts for cross-attempt freshness tracking
 */
export async function fetchRecentAttemptQuestions(userId: string, supabase: SupabaseClient): Promise<Set<string>> {
  const { data: recentCompleted } = await supabase
    .from("user_attempts")
    .select("id, completed_at")
    .eq("user_id", userId)
    .eq("status", EAttemptStatus.Completed)
    .order("completed_at", { ascending: false })
    .limit(EVALUATE_SELECTION_CONFIG.RECENT_ATTEMPTS.LOOK_BACK_COUNT);

  const recentAttemptIds = (recentCompleted ?? []).map((r: { id: string }) => r.id);

  if (recentAttemptIds.length === 0) {
    return new Set<string>();
  }

  const { data: recentQs } = await supabase
    .from("attempt_questions")
    .select("question_id")
    .in("attempt_id", recentAttemptIds);

  return new Set<string>((recentQs ?? []).map((r: { question_id: string }) => r.question_id).filter(Boolean));
}
