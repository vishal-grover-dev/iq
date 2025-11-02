import { SupabaseClient } from "@supabase/supabase-js";

import { COVERAGE_KEY_DELIMITER } from "@/constants/evaluate.constants";
import { EBloomLevel, EDifficulty } from "@/types/mcq.types";
import {
  EAttemptStatus,
  IAttemptContext,
  IDistributions,
  IAskedQuestionRow,
  IUserAttempt,
  TAttemptQuestion,
  IBankCandidate,
  IUserCoverageSummary,
  IDifficultyEnforcementContext,
  IBloomEnforcementContext,
} from "@/types/evaluate.types";

const CODING_RATE_TOLERANCE = 0.05;

export async function fetchAttemptOrFail(
  attemptId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<IUserAttempt | null> {
  const { data: attempt, error } = await supabase
    .from("user_attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .single();

  if (error || !attempt) {
    return null;
  }

  return attempt as IUserAttempt;
}

export function checkCompletionStatus(attempt: IUserAttempt): { status: EAttemptStatus; completed: boolean } | null {
  if (attempt.status === EAttemptStatus.Completed) {
    return {
      status: attempt.status,
      completed: true,
    };
  }

  if ((attempt.questions_answered || 0) >= attempt.total_questions) {
    return {
      status: attempt.status,
      completed: true,
    };
  }

  return null;
}

export function findExistingPendingQuestion(
  askedQuestions: TAttemptQuestion[],
  nextQuestionOrder: number
): TAttemptQuestion | null {
  return (
    (askedQuestions ?? []).find((question) => {
      const orderMatches = Number(question?.question_order ?? 0) === nextQuestionOrder;
      const notAnsweredYet = typeof question?.user_answer_index !== "number" && !question?.answered_at;
      return orderMatches && notAnsweredYet;
    }) ?? null
  );
}

export function extractAskedMcq(entry: IAskedQuestionRow): IBankCandidate | null {
  if (!entry) return null;
  const raw = Array.isArray(entry.mcq_items) ? entry.mcq_items[0] : entry.mcq_items;
  return raw ? (raw as IBankCandidate) : null;
}

export function calculateDistributions(askedQuestions: IAskedQuestionRow[]): IDistributions {
  return askedQuestions.reduce(
    (acc, question) => {
      const mcq = extractAskedMcq(question);
      if (!mcq) return acc;

      const difficulty = mcq.difficulty as string;
      const bloom = mcq.bloom_level as string;
      const topic = mcq.topic as string;
      const subtopic = (mcq.subtopic as string) || "";
      const hasCoding = !!mcq.code;

      if (difficulty === "Easy") acc.easy_count++;
      else if (difficulty === "Medium") acc.medium_count++;
      else if (difficulty === "Hard") acc.hard_count++;

      if (hasCoding) acc.coding_count++;

      acc.topic_distribution[topic] = (acc.topic_distribution[topic] || 0) + 1;

      if (subtopic) {
        acc.subtopic_distribution[subtopic] = (acc.subtopic_distribution[subtopic] || 0) + 1;
      }

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

export function buildSelectionContext(
  attemptId: string,
  questionsAnswered: number,
  distributions: IDistributions,
  coverageSummary?: IUserCoverageSummary
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
    coverage_summary: coverageSummary ?? { hotspots: [], opportunities: [] },
  };
}

export function applyCodingPacing(
  desiredCodingMode: boolean,
  {
    questionsAnswered,
    codingCount,
    codingNeeded,
    totalQuestions,
  }: { questionsAnswered: number; codingCount: number; codingNeeded: number; totalQuestions: number }
): boolean {
  if (codingNeeded <= 0) {
    return false;
  }

  const remainingQuestions = Math.max(totalQuestions - questionsAnswered, 1);
  const requiredRate = codingNeeded / remainingQuestions;
  const actualRate = questionsAnswered > 0 ? codingCount / questionsAnswered : 0;

  if (actualRate < requiredRate - CODING_RATE_TOLERANCE) {
    return true;
  }

  if (actualRate > requiredRate + CODING_RATE_TOLERANCE) {
    return false;
  }

  return desiredCodingMode;
}

export function enforceDifficultyLimits(
  requested: EDifficulty,
  {
    easyRemaining,
    mediumRemaining,
    hardNeeded,
    questionsRemaining,
    questionsAnswered,
    easyCount,
    mediumCount,
    hardCount,
    totalQuestions,
    hardTarget,
    easyCap,
    mediumCap,
  }: IDifficultyEnforcementContext
): EDifficulty {
  const safeRequested = requested ?? EDifficulty.EASY;

  const total = Math.max(totalQuestions, 1);
  const answered = Math.max(questionsAnswered, 0);
  const remaining = Math.max(questionsRemaining, 0);

  const targetHardRate = hardTarget / total;
  const hardExpectedByNow = Math.ceil(((answered + 1) / total) * hardTarget);
  const behindOnHard = hardCount < hardExpectedByNow;
  const hardBacklogRatio = hardNeeded > 0 ? hardNeeded / Math.max(remaining, 1) : 0;

  if (hardNeeded > 0) {
    if (
      safeRequested === EDifficulty.HARD ||
      behindOnHard ||
      hardBacklogRatio >= targetHardRate ||
      remaining <= hardNeeded
    ) {
      return EDifficulty.HARD;
    }
  }

  const easyAtCap = easyRemaining <= 0 || easyCount >= easyCap;
  const mediumAtCap = mediumRemaining <= 0 || mediumCount >= mediumCap;

  if (safeRequested === EDifficulty.EASY && !easyAtCap) {
    return EDifficulty.EASY;
  }

  if (safeRequested === EDifficulty.MEDIUM && !mediumAtCap) {
    return EDifficulty.MEDIUM;
  }

  if (safeRequested === EDifficulty.HARD) {
    return EDifficulty.HARD;
  }

  if (hardNeeded > 0) {
    return EDifficulty.HARD;
  }

  if (!easyAtCap) {
    return EDifficulty.EASY;
  }

  if (!mediumAtCap) {
    return EDifficulty.MEDIUM;
  }

  return EDifficulty.HARD;
}

export function enforceBloomTargets(
  requested: EBloomLevel,
  {
    counts,
    understandCap,
    applyCap,
    analyzeMin,
    evalCreateMin,
    questionsRemaining,
    questionsAnswered,
    totalQuestions,
  }: IBloomEnforcementContext
): EBloomLevel {
  const safeRequested = requested ?? EBloomLevel.UNDERSTAND;

  const understandRemaining = Math.max(0, understandCap - (counts[EBloomLevel.UNDERSTAND] ?? 0));
  const applyRemaining = Math.max(0, applyCap - (counts[EBloomLevel.APPLY] ?? 0));
  const analyzeNeeded = Math.max(0, analyzeMin - (counts[EBloomLevel.ANALYZE] ?? 0));
  const evalCreateCount = (counts[EBloomLevel.EVALUATE] ?? 0) + (counts[EBloomLevel.CREATE] ?? 0);
  const evalCreateNeeded = Math.max(0, evalCreateMin - evalCreateCount);

  const total = Math.max(totalQuestions, 1);
  const answered = Math.max(questionsAnswered, 0);
  const remaining = Math.max(questionsRemaining, 0);
  const targetAnalyzeRate = analyzeMin / total;
  const targetEvalCreateRate = evalCreateMin / total;
  const analyzeExpectedByNow = Math.ceil(((answered + 1) / total) * analyzeMin);
  const evalCreateExpectedByNow = Math.ceil(((answered + 1) / total) * evalCreateMin);
  const behindOnAnalyze = (counts[EBloomLevel.ANALYZE] ?? 0) < analyzeExpectedByNow;
  const behindOnEvalCreate = evalCreateCount < evalCreateExpectedByNow;
  const analyzeBacklogRatio = analyzeNeeded > 0 ? analyzeNeeded / Math.max(remaining, 1) : 0;
  const evalCreateBacklogRatio = evalCreateNeeded > 0 ? evalCreateNeeded / Math.max(remaining, 1) : 0;

  if (analyzeNeeded > 0 || evalCreateNeeded > 0) {
    if (safeRequested === EBloomLevel.ANALYZE && analyzeNeeded > 0) {
      return EBloomLevel.ANALYZE;
    }

    if ((safeRequested === EBloomLevel.EVALUATE || safeRequested === EBloomLevel.CREATE) && evalCreateNeeded > 0) {
      return safeRequested;
    }

    if (analyzeNeeded > 0 && (behindOnAnalyze || analyzeBacklogRatio >= targetAnalyzeRate)) {
      return EBloomLevel.ANALYZE;
    }

    if (evalCreateNeeded > 0 && (behindOnEvalCreate || evalCreateBacklogRatio >= targetEvalCreateRate)) {
      const evalCount = counts[EBloomLevel.EVALUATE] ?? 0;
      const createCount = counts[EBloomLevel.CREATE] ?? 0;
      return evalCount <= createCount ? EBloomLevel.EVALUATE : EBloomLevel.CREATE;
    }
  }

  if (safeRequested === EBloomLevel.UNDERSTAND && understandRemaining <= 0) {
    if (analyzeNeeded > 0) {
      return EBloomLevel.ANALYZE;
    }
    if (evalCreateNeeded > 0) {
      const evalCount = counts[EBloomLevel.EVALUATE] ?? 0;
      const createCount = counts[EBloomLevel.CREATE] ?? 0;
      return evalCount <= createCount ? EBloomLevel.EVALUATE : EBloomLevel.CREATE;
    }
    if (applyRemaining > 0) {
      return EBloomLevel.APPLY;
    }
    return EBloomLevel.ANALYZE;
  }

  if (safeRequested === EBloomLevel.APPLY && applyRemaining <= 0) {
    if (analyzeNeeded > 0) {
      return EBloomLevel.ANALYZE;
    }
    if (evalCreateNeeded > 0) {
      const evalCount = counts[EBloomLevel.EVALUATE] ?? 0;
      const createCount = counts[EBloomLevel.CREATE] ?? 0;
      return evalCount <= createCount ? EBloomLevel.EVALUATE : EBloomLevel.CREATE;
    }
    if (understandRemaining > 0) {
      return EBloomLevel.UNDERSTAND;
    }
    return EBloomLevel.ANALYZE;
  }

  return safeRequested;
}

export function normalizeSubtopic(subtopic?: string | null): string {
  return subtopic?.trim() || "";
}

export function buildExposureKey(
  topic: string,
  subtopic: string | null,
  difficulty: string,
  codingMode: boolean
): string {
  return [topic, normalizeSubtopic(subtopic), difficulty, codingMode ? "1" : "0"].join(COVERAGE_KEY_DELIMITER);
}

export function formatDifficultyLabel(value: string): string {
  if (!value) return "Unknown";
  const lower = value.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function formatSubtopicLabel(value: string): string {
  return value?.length ? value : "General";
}

export function formatCoverageLine(
  topic: string,
  subtopic: string,
  difficulty: string,
  codingMode: boolean,
  total: number
): string {
  const difficultyLabel = formatDifficultyLabel(difficulty);
  const codingLabel = codingMode ? "coding" : "non-coding";
  const countLabel = total === 1 ? "time" : "times";
  return `${topic} → ${formatSubtopicLabel(subtopic)} (${difficultyLabel}, ${codingLabel}) seen ${total} ${countLabel}`;
}
