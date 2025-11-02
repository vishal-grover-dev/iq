import { SupabaseClient } from "@supabase/supabase-js";
import {
  ESelectionMethod,
  ESimilarityGate,
  EAttemptStatus,
  IBankCandidate,
  ICandidateWithSimilarity,
  IAttemptContext,
  IDistributions,
  IAskedQuestionRow,
  IAssignmentResult,
  IAssignmentError,
  ISelectionCriteria,
  IScoredCandidate,
  IUserCoverageSummary,
  IUserQuestionStatRow,
  TAttemptQuestion,
} from "@/types/evaluate.types";
import { selectNextQuestion as callLLMSelector } from "@/services/server/question-selector.service";
import { generateMcqFromContext } from "@/services/server/mcq-generation.service";
import { getEmbeddings } from "@/services/server/embedding.service";
import { toNumericVector, cosineSimilarity } from "@/utils/vector.utils";
import {
  computeMcqContentKey,
  buildMcqEmbeddingText,
  getStaticSubtopicMap,
  getCurrentTopicPhase,
} from "@/utils/mcq.utils";
import { weightedRandomIndex } from "@/utils/selection.utils";
import { EVALUATION_CONFIG, EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";
import { EDifficulty, EBloomLevel, IMcqItemView } from "@/types/mcq.types";
import {
  buildExposureKey,
  buildSelectionContext,
  calculateDistributions,
  checkCompletionStatus,
  extractAskedMcq,
  fetchAttemptOrFail,
  findExistingPendingQuestion,
  formatCoverageLine,
  normalizeSubtopic,
} from "@/utils/evaluation-selection.utils";

const ALL_DIFFICULTIES = [EDifficulty.EASY, EDifficulty.MEDIUM, EDifficulty.HARD];
const CODING_VARIANTS = [true, false] as const;

async function recordQuestionExposure(
  userId: string,
  question: {
    id?: string;
    topic?: string;
    subtopic?: string | null;
    difficulty?: string;
    bloom_level?: string;
    code?: string | null;
  },
  supabase: SupabaseClient
): Promise<void> {
  if (!question?.topic || !question?.difficulty || !question?.bloom_level) {
    return;
  }

  const { error } = await supabase.rpc("increment_user_question_stats", {
    p_user_id: userId,
    p_topic: question.topic,
    p_subtopic: normalizeSubtopic(question.subtopic ?? ""),
    p_difficulty: question.difficulty,
    p_bloom_level: question.bloom_level,
    p_coding_mode: Boolean(question.code),
  });

  if (error) {
    console.warn("user_question_stats_increment_failed", {
      user_id: userId,
      question_id: question?.id || null,
      error: error.message,
    });
  } else {
    console.log("user_question_stats_incremented", {
      user_id: userId,
      topic: question.topic,
      subtopic: normalizeSubtopic(question.subtopic ?? ""),
      difficulty: question.difficulty,
      bloom_level: question.bloom_level,
      coding_mode: Boolean(question.code),
    });
  }
}

function buildCoverageSummary(
  stats: IUserQuestionStatRow[],
  exposureLookup: Map<string, number>,
  currentTopic: string
): IUserCoverageSummary {
  const {
    USER_FRESHNESS: { HOTSPOT_LIMIT, OPPORTUNITY_LIMIT, OPPORTUNITY_THRESHOLD },
  } = EVALUATE_SELECTION_CONFIG;

  const hotspots = stats
    .filter((row) => row.total_seen > 0)
    .sort((a, b) => b.total_seen - a.total_seen)
    .slice(0, HOTSPOT_LIMIT)
    .map((row) => formatCoverageLine(row.topic, row.subtopic, row.difficulty, row.coding_mode, row.total_seen));

  const opportunitiesMap = new Map<
    string,
    { topic: string; subtopic: string; difficulty: string; coding_mode: boolean; total: number }
  >();

  for (const row of stats) {
    if (row.total_seen <= OPPORTUNITY_THRESHOLD) {
      const key = buildExposureKey(row.topic, row.subtopic, row.difficulty, row.coding_mode);
      opportunitiesMap.set(key, {
        topic: row.topic,
        subtopic: row.subtopic,
        difficulty: row.difficulty,
        coding_mode: row.coding_mode,
        total: row.total_seen,
      });
    }
  }

  const staticSubtopics = getStaticSubtopicMap();
  const topicSubtopics = staticSubtopics[currentTopic] ?? [];
  const subtopicPool = new Set<string>(["", ...topicSubtopics]);

  for (const subtopic of subtopicPool) {
    for (const difficulty of ALL_DIFFICULTIES) {
      for (const coding of CODING_VARIANTS) {
        const key = buildExposureKey(currentTopic, subtopic, difficulty, coding);
        if (!opportunitiesMap.has(key)) {
          const total = exposureLookup.get(key) ?? 0;
          if (total <= OPPORTUNITY_THRESHOLD) {
            opportunitiesMap.set(key, {
              topic: currentTopic,
              subtopic: normalizeSubtopic(subtopic),
              difficulty,
              coding_mode: coding,
              total,
            });
          }
        }
      }
    }
  }

  const opportunities = Array.from(opportunitiesMap.values())
    .sort((a, b) => {
      if (a.total !== b.total) return a.total - b.total;
      return `${a.topic}-${a.subtopic}`.localeCompare(`${b.topic}-${b.subtopic}`);
    })
    .slice(0, OPPORTUNITY_LIMIT)
    .map((bucket) =>
      formatCoverageLine(bucket.topic, bucket.subtopic, bucket.difficulty, bucket.coding_mode, bucket.total)
    );

  return {
    hotspots,
    opportunities,
  };
}

async function fetchUserCoverageData(
  userId: string,
  supabase: SupabaseClient,
  currentTopic: string
): Promise<{ summary: IUserCoverageSummary; exposureLookup: Map<string, number> }> {
  const { data: rows } = await supabase
    .from("user_question_stats")
    .select("topic, subtopic, difficulty, bloom_level, coding_mode, total_seen, last_seen_at")
    .eq("user_id", userId);

  const stats = (rows ?? []).map((row) => ({
    topic: String(row.topic || ""),
    subtopic: normalizeSubtopic(row.subtopic || ""),
    difficulty: String(row.difficulty || ""),
    bloom_level: String(row.bloom_level || ""),
    coding_mode: Boolean(row.coding_mode),
    total_seen: Number(row.total_seen || 0),
    last_seen_at: String(row.last_seen_at || ""),
  })) as IUserQuestionStatRow[];

  const exposureLookup = new Map<string, number>();
  for (const stat of stats) {
    const key = buildExposureKey(stat.topic, stat.subtopic, stat.difficulty, stat.coding_mode);
    exposureLookup.set(key, stat.total_seen);
  }

  const summary = buildCoverageSummary(stats, exposureLookup, currentTopic);
  return { summary, exposureLookup };
}

async function validateAttemptQuestions(
  attemptId: string,
  supabase: SupabaseClient
): Promise<{ questions: TAttemptQuestion[]; error: Error }> {
  const { data: askedQuestions, error: questionsError } = await supabase
    .from("attempt_questions")
    .select(
      `
      question_id,
      question_order,
      user_answer_index,
      answered_at,
      mcq_items!inner(
        id,
        topic,
        subtopic,
        difficulty,
        bloom_level,
        code,
        question,
        options,
        content_key,
        embedding
      )
    `
    )
    .eq("attempt_id", attemptId)
    .order("question_order", { ascending: true });

  return {
    questions: (askedQuestions as unknown as TAttemptQuestion[]) ?? [],
    error: questionsError as unknown as Error,
  };
}

async function fetchRecentAttemptQuestions(
  userId: string,
  supabase: SupabaseClient,
  options: { excludeAttemptId?: string } = {}
): Promise<Set<string>> {
  const { LOOK_BACK_COUNT } = EVALUATE_SELECTION_CONFIG.RECENT_ATTEMPTS;
  const { excludeAttemptId } = options;

  let attemptQuery = supabase
    .from("user_attempts")
    .select("id, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(LOOK_BACK_COUNT + (excludeAttemptId ? 1 : 0));

  if (excludeAttemptId) {
    attemptQuery = attemptQuery.neq("id", excludeAttemptId);
  }

  const { data: recentAttempts } = await attemptQuery;

  const recentAttemptIds = (recentAttempts ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
    .slice(0, LOOK_BACK_COUNT);

  if (recentAttemptIds.length === 0) {
    return new Set<string>();
  }

  const { data: recentQs } = await supabase
    .from("attempt_questions")
    .select("question_id")
    .in("attempt_id", recentAttemptIds);

  return new Set<string>((recentQs ?? []).map((r: { question_id: string }) => r.question_id).filter(Boolean));
}

// ---------------------------------------------------------------------------
// Stage 3 & 4 helpers: Candidate similarity and scoring
// ---------------------------------------------------------------------------

async function applyNeighborSimilarityChecks(
  candidates: ICandidateWithSimilarity[],
  askedEmbeddings: number[][],
  userId: string,
  supabase: SupabaseClient
): Promise<ICandidateWithSimilarity[]> {
  return Promise.all(
    candidates.map(async (candidate) => {
      let similarityPenalty = 0;
      const similarityMetrics: Record<string, { scores: number[]; top_score: number }> = {};

      try {
        if (askedEmbeddings.length > 0) {
          const candidateEmbedding = toNumericVector(candidate.embedding);
          if (candidateEmbedding) {
            const similarityScores = askedEmbeddings.map((vector: number[]) =>
              cosineSimilarity(vector, candidateEmbedding)
            );
            const topSimilarity = similarityScores.length ? Math.max(...similarityScores) : 0;

            similarityMetrics.attempt_similarity = {
              scores: similarityScores.slice(0, 5),
              top_score: topSimilarity,
            };

            const { BANK_THRESHOLD_HIGH, BANK_THRESHOLD_MEDIUM } = EVALUATE_SELECTION_CONFIG.SIMILARITY;
            const { BANK_SIMILARITY_HIGH, BANK_SIMILARITY_MEDIUM } = EVALUATE_SELECTION_CONFIG.PENALTIES;

            if (topSimilarity >= BANK_THRESHOLD_HIGH) {
              similarityPenalty += BANK_SIMILARITY_HIGH;
            } else if (topSimilarity >= BANK_THRESHOLD_MEDIUM) {
              similarityPenalty += BANK_SIMILARITY_MEDIUM;
            }
          }
        }

        try {
          const candidateEmbedding = toNumericVector(candidate.embedding);
          if (candidateEmbedding) {
            const { data: neighborRows } = await supabase.rpc("retrieval_mcq_neighbors", {
              p_user_id: userId,
              p_topic: candidate.topic,
              p_embedding: candidateEmbedding as unknown as number[],
              p_subtopic: candidate.subtopic,
              p_topk: 5,
            });

            const neighborScores: Array<{ question: string; score: number }> = (neighborRows ?? []).map(
              (r: { question?: string; score?: number }) => ({
                question: String(r?.question || ""),
                score: Number(r?.score || 0),
              })
            );

            similarityMetrics.neighbor_similarity = {
              scores: neighborScores.slice(0, 3).map((n) => n.score),
              top_score: neighborScores[0]?.score || 0,
            };

            const { BANK_THRESHOLD_HIGH } = EVALUATE_SELECTION_CONFIG.SIMILARITY;
            const { BANK_NEIGHBOR_HIGH, BANK_NEIGHBOR_MEDIUM } = EVALUATE_SELECTION_CONFIG.PENALTIES;

            const topNeighbor = neighborScores[0];
            if (topNeighbor && topNeighbor.score >= BANK_THRESHOLD_HIGH) {
              similarityPenalty += BANK_NEIGHBOR_HIGH;
            } else if (topNeighbor && topNeighbor.score >= EVALUATE_SELECTION_CONFIG.SIMILARITY.BANK_THRESHOLD_MEDIUM) {
              similarityPenalty += BANK_NEIGHBOR_MEDIUM;
            }
          }
        } catch (neighborError) {
          const message = neighborError instanceof Error ? neighborError.message : String(neighborError);
          console.warn("bank_neighbor_similarity_check_failed", {
            message,
            candidate_id: candidate.id,
          });
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        console.warn("bank_similarity_check_failed", {
          message,
          candidate_id: candidate.id,
        });
      }

      return {
        ...candidate,
        similarityPenalty,
        similarityMetrics,
      };
    })
  );
}

function scoreCandidate(
  candidate: ICandidateWithSimilarity,
  criteria: ISelectionCriteria,
  distributions: IDistributions,
  attempt: IAttemptContext
): number {
  void criteria;
  void distributions;
  void attempt;
  let score = 100; // Base score for exact matches

  // Apply penalties for similarity and freshness
  if (candidate._seenRecently) score -= EVALUATE_SELECTION_CONFIG.PENALTIES.CROSS_ATTEMPT_FRESHNESS;
  score -= candidate.similarityPenalty || 0;

  return score;
}

function selectTopKWithWeights(scoredCandidates: IScoredCandidate[]): IScoredCandidate[] {
  const K = Math.min(EVALUATE_SELECTION_CONFIG.CANDIDATE_SCORING.TOPK_COUNT, scoredCandidates.length);
  const topK = scoredCandidates.slice(0, K);
  const weights = topK.map((c) => Math.max(1, c.score));
  const chosenIdx = weightedRandomIndex(weights);

  return [...topK.slice(chosenIdx, chosenIdx + 1), ...topK.slice(0, chosenIdx), ...scoredCandidates.slice(K)];
}

// ---------------------------------------------------------------------------
// Stage 5 helpers: Assignment + generation fallback
// ---------------------------------------------------------------------------

async function computeNextQuestionOrder(
  attemptId: string,
  attemptQuestionsAnswered: number,
  totalQuestions: number,
  supabase: SupabaseClient
): Promise<number> {
  const { data: existingOrders, error } = await supabase
    .from("attempt_questions")
    .select("question_order")
    .eq("attempt_id", attemptId)
    .order("question_order", { ascending: true });

  if (error) {
    console.error("next_order_compute_failed", {
      attempt_id: attemptId,
      message: error.message,
    });
    return Math.min(attemptQuestionsAnswered + 1, totalQuestions);
  }

  const orders = existingOrders?.map((row: { question_order: number }) => Number(row.question_order)) ?? [];
  const orderSet = new Set(orders);
  const targetWindow = Math.min(totalQuestions, attemptQuestionsAnswered + 1);

  for (let i = 1; i <= targetWindow; i++) {
    if (!orderSet.has(i)) {
      return i;
    }
  }

  const currentMax = orders.length > 0 ? orders[orders.length - 1] : 0;
  return Math.min(currentMax + 1, totalQuestions);
}

async function assignQuestionWithRetry(
  attemptId: string,
  questionId: string,
  questionOrder: number,
  supabase: SupabaseClient,
  attemptIdForLogging: string
): Promise<IAssignmentResult> {
  const { MAX_RETRIES, EXPONENTIAL_BACKOFF_BASE_MS } = EVALUATE_SELECTION_CONFIG.ASSIGNMENT;

  let lastError: IAssignmentError | null = null;

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    const { data: insertedRow, error: assignError } = await supabase
      .from("attempt_questions")
      .insert({
        attempt_id: attemptId,
        question_id: questionId,
        question_order: questionOrder,
      })
      .select("question_id, question_order")
      .single();

    if (!assignError && insertedRow?.question_id === questionId && insertedRow?.question_order === questionOrder) {
      return { success: true, assigned_question_id: questionId };
    }

    lastError = (assignError as IAssignmentError) ?? null;

    if (assignError?.code === "23505") {
      return {
        success: false,
        assigned_question_id: null,
        error: "duplicate_constraint",
      };
    }

    if (retry < MAX_RETRIES - 1) {
      const delay = Math.pow(2, retry) * EXPONENTIAL_BACKOFF_BASE_MS;
      console.warn("question_assignment_retry", {
        attempt_id: attemptIdForLogging,
        question_id: questionId,
        order: questionOrder,
        retry: retry + 1,
        max_retries: MAX_RETRIES,
        error: assignError?.message,
        delay_ms: delay,
      });
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { success: false, assigned_question_id: null, error: lastError };
}

async function persistGeneratedMcq(
  generatedMcq: IMcqItemView,
  mcqEmbedding: number[],
  userId: string,
  supabase: SupabaseClient,
  attemptIdForLogging: string
): Promise<{ id: string | null; error?: IAssignmentError | null }> {
  const contentKey = computeMcqContentKey(generatedMcq);

  const { data: savedMcq, error: saveError } = await supabase
    .from("mcq_items")
    .insert({
      topic: generatedMcq.topic,
      subtopic: generatedMcq.subtopic,
      version: generatedMcq.version || null,
      difficulty: generatedMcq.difficulty,
      bloom_level: generatedMcq.bloomLevel,
      question: generatedMcq.question,
      options: generatedMcq.options,
      correct_index: generatedMcq.correctIndex,
      citations: generatedMcq.citations,
      code: generatedMcq.code || null,
      content_key: contentKey,
      embedding: mcqEmbedding as unknown as number[],
      user_id: userId,
    })
    .select("id")
    .single();

  if (savedMcq?.id && generatedMcq.explanation) {
    await supabase.from("mcq_explanations").insert({
      mcq_id: savedMcq.id,
      explanation: generatedMcq.explanation,
      user_id: userId,
    });
  }

  if (saveError && saveError.code === "23505") {
    console.log("question_generated_duplicate", {
      attempt_id: attemptIdForLogging,
      reason: "content_key_conflict",
    });

    const { data: existingMcq } = await supabase.from("mcq_items").select("id").eq("content_key", contentKey).single();

    if (existingMcq) {
      return { id: existingMcq.id };
    }
  }

  if (saveError) {
    return { id: null, error: saveError };
  }

  return { id: savedMcq?.id || null };
}

interface IFallbackStage {
  requireTopic: boolean;
  requireSubtopic: boolean;
  requireDifficulty: boolean;
  requireBloom: boolean;
  enforceCodingMode: boolean;
}

interface IEnsureAssignmentOptions {
  criteria?: Partial<ISelectionCriteria>;
  excludedQuestionIds?: Set<string>;
  recentQuestionIds?: Set<string>;
  maxAttempts?: number;
  exposureLookup?: Map<string, number>;
  maxExposurePerCombo?: number;
  enforceDifficulty?: boolean;
  enforceBloom?: boolean;
}

async function ensureQuestionAssigned(
  attemptId: string,
  questionOrder: number,
  supabase: SupabaseClient,
  attemptIdForLogging: string,
  options: IEnsureAssignmentOptions = {}
): Promise<{ question_id: string | null; error?: IAssignmentError | string | null }> {
  const {
    criteria,
    excludedQuestionIds,
    recentQuestionIds,
    maxAttempts = 12,
    exposureLookup,
    maxExposurePerCombo,
    enforceDifficulty = false,
    enforceBloom = false,
  } = options;

  const excluded = new Set<string>((excludedQuestionIds ? Array.from(excludedQuestionIds) : []).filter(Boolean));
  const recent = new Set<string>((recentQuestionIds ? Array.from(recentQuestionIds) : []).filter(Boolean));

  const baseFallbackStages: IFallbackStage[] = [
    { requireTopic: true, requireSubtopic: true, requireDifficulty: true, requireBloom: true, enforceCodingMode: true },
    {
      requireTopic: true,
      requireSubtopic: false,
      requireDifficulty: true,
      requireBloom: true,
      enforceCodingMode: true,
    },
    {
      requireTopic: true,
      requireSubtopic: false,
      requireDifficulty: true,
      requireBloom: false,
      enforceCodingMode: true,
    },
    {
      requireTopic: true,
      requireSubtopic: false,
      requireDifficulty: false,
      requireBloom: false,
      enforceCodingMode: false,
    },
    {
      requireTopic: false,
      requireSubtopic: false,
      requireDifficulty: false,
      requireBloom: false,
      enforceCodingMode: false,
    },
  ];

  let fallbackStages = [...baseFallbackStages];
  const removedFilters: string[] = [];

  if (enforceDifficulty) {
    const filtered = fallbackStages.filter((stage) => stage.requireDifficulty);
    if (filtered.length > 0 && filtered.length !== fallbackStages.length) {
      removedFilters.push("difficulty");
      fallbackStages = filtered;
    }
  }

  if (enforceBloom) {
    const filtered = fallbackStages.filter((stage) => stage.requireBloom);
    if (filtered.length > 0 && filtered.length !== fallbackStages.length) {
      removedFilters.push("bloom");
      fallbackStages = filtered;
    }
  }

  if (fallbackStages.length === 0) {
    fallbackStages = [
      {
        requireTopic: true,
        requireSubtopic: Boolean(criteria?.preferred_subtopic),
        requireDifficulty: enforceDifficulty,
        requireBloom: enforceBloom,
        enforceCodingMode: true,
      },
    ];
  }

  if (removedFilters.length > 0) {
    console.log("ensure_assignment_constraints_enforced", {
      attempt_id: attemptIdForLogging,
      order: questionOrder,
      removed_filters: removedFilters,
      stage_count: fallbackStages.length,
    });
  }

  const selectionColumns = "id, topic, subtopic, difficulty, bloom_level, question, options, code";

  let attemptsRemaining = Math.max(1, maxAttempts);
  let lastError: IAssignmentError | string | null = null;

  const buildNotInClause = (ids: Set<string>): string | null => {
    if (ids.size === 0) return null;
    const list = Array.from(ids)
      .filter(Boolean)
      .map((id) => `"${id.replace(/"/g, '""')}"`)
      .join(",");
    return list.length > 0 ? `(${list})` : null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyStageFilters = (query: any, stage: IFallbackStage) => {
    if (stage.requireTopic && criteria?.preferred_topic) {
      query = query.eq("topic", criteria.preferred_topic);
    }

    if (stage.requireSubtopic) {
      if (criteria?.preferred_subtopic) {
        query = query.eq("subtopic", criteria.preferred_subtopic);
      } else {
        query = query.is("subtopic", null);
      }
    }

    if (stage.requireDifficulty && criteria?.difficulty) {
      query = query.eq("difficulty", criteria.difficulty);
    }

    if (stage.requireBloom && criteria?.preferred_bloom_level) {
      query = query.eq("bloom_level", criteria.preferred_bloom_level);
    }

    if (typeof criteria?.coding_mode === "boolean" && stage.enforceCodingMode) {
      query = criteria.coding_mode
        ? query.not("code", "is", null).not("code", "eq", "")
        : query.or("code.is.null,code.eq.");
    } else if (criteria?.coding_mode === false && stage.enforceCodingMode === false) {
      // Prefer non-coding when possible by filtering out code if we still have room to explore
      query = query.or("code.is.null,code.eq.");
    }

    return query;
  };

  for (let stageIndex = 0; stageIndex < fallbackStages.length && attemptsRemaining > 0; stageIndex++) {
    const stage = fallbackStages[stageIndex];

    console.log("ensure_assignment_stage_start", {
      attempt_id: attemptIdForLogging,
      order: questionOrder,
      stage_index: stageIndex,
      stage,
      attempts_remaining: attemptsRemaining,
    });

    const exclusionVariants: Set<string>[] = [];
    if (recent.size > 0) {
      exclusionVariants.push(new Set<string>([...excluded, ...recent]));
    }
    exclusionVariants.push(new Set<string>(excluded));

    for (const exclusion of exclusionVariants) {
      if (attemptsRemaining <= 0) break;

      let query = supabase.from("mcq_items").select(selectionColumns);
      query = applyStageFilters(query, stage);

      const exclusionClause = buildNotInClause(exclusion);
      if (exclusionClause) {
        query = query.not("id", "in", exclusionClause);
      }

      const candidateLimit = stage.requireTopic && stage.requireSubtopic ? 12 : 24;
      const { data: candidates, error: candidateError } = await query.limit(candidateLimit);

      if (candidateError) {
        console.warn("fallback_candidate_query_failed", {
          attempt_id: attemptIdForLogging,
          order: questionOrder,
          stage: stageIndex,
          error: candidateError.message,
        });
        lastError = candidateError as unknown as IAssignmentError;
        continue;
      }

      const candidateList = (candidates as IBankCandidate[]) ?? [];
      if (candidateList.length === 0) {
        continue;
      }

      for (const candidate of candidateList) {
        if (attemptsRemaining <= 0) break;
        if (!candidate?.id || excluded.has(candidate.id)) continue;

        if (exposureLookup && typeof maxExposurePerCombo === "number") {
          const exposureKey = buildExposureKey(
            candidate.topic,
            candidate.subtopic,
            candidate.difficulty,
            Boolean(candidate.code)
          );
          const seenCount = exposureLookup.get(exposureKey) ?? 0;
          if (seenCount >= maxExposurePerCombo) {
            excluded.add(candidate.id);
            console.log("fallback_candidate_skipped_user_freshness", {
              attempt_id: attemptIdForLogging,
              candidate_id: candidate.id,
              order: questionOrder,
              seen_count: seenCount,
            });
            continue;
          }
        }

        attemptsRemaining--;

        const { data: insertedRow, error: fallbackError } = await supabase
          .from("attempt_questions")
          .insert({
            attempt_id: attemptId,
            question_id: candidate.id,
            question_order: questionOrder,
          })
          .select("question_id, question_order")
          .single();

        if (
          !fallbackError &&
          insertedRow?.question_id === candidate.id &&
          insertedRow?.question_order === questionOrder
        ) {
          console.log("question_selected", {
            attempt_id: attemptIdForLogging,
            method: ESelectionMethod.FALLBACK_ASSIGNMENT,
            question_id: candidate.id,
            order: questionOrder,
            topic: candidate.topic,
            subtopic: candidate.subtopic,
          });
          return { question_id: candidate.id };
        }

        if (fallbackError?.code === "23505") {
          excluded.add(candidate.id);
          console.warn("fallback_candidate_duplicate", {
            attempt_id: attemptIdForLogging,
            order: questionOrder,
            candidate_id: candidate.id,
            stage: stageIndex,
          });
          lastError = (fallbackError as IAssignmentError) ?? lastError;
          continue;
        }

        console.error("fallback_assignment_failed", {
          attempt_id: attemptIdForLogging,
          order: questionOrder,
          candidate_id: candidate.id,
          stage: stageIndex,
          error: fallbackError?.message,
        });
        lastError = (fallbackError as IAssignmentError) ?? lastError;
      }
    }
  }

  if (!lastError) {
    lastError = "no_fallback_available";
  }

  return { question_id: null, error: lastError };
}

async function generateMcqFallback(
  attemptId: string,
  userId: string,
  criteria: ISelectionCriteria,
  distributions: IDistributions,
  askedQuestions: IAskedQuestionRow[],
  askedContentKeySet: Set<string>,
  supabase: SupabaseClient
): Promise<{ questionId: string | null; generatedMcq?: IMcqItemView }> {
  const { MAX_ATTEMPTS, NEGATIVE_EXAMPLES_LOOKAHEAD, NEGATIVE_EXAMPLES_LIMIT } = EVALUATE_SELECTION_CONFIG.GENERATION;

  let generationAttempts = 0;

  // Use exact criteria from LLM selector (no randomization)
  const contextTopic = criteria.preferred_topic || "React";
  const contextSubtopic = criteria.preferred_subtopic;

  const topicFilteredQuestions = askedQuestions.filter((entry) => {
    const mcqItem = extractAskedMcq(entry);
    return mcqItem?.topic === contextTopic;
  });

  const previousQuestionsMeta = topicFilteredQuestions
    .map((entry) => {
      const mcqItem = extractAskedMcq(entry);
      if (!mcqItem || !mcqItem.topic) {
        return null;
      }
      return {
        topic: String(mcqItem.topic),
        subtopic: String(mcqItem.subtopic || ""),
        is_code: Boolean(mcqItem.code),
        difficulty: String(mcqItem.difficulty || ""),
        bloom: String(mcqItem.bloom_level || ""),
      };
    })
    .filter(
      (
        meta
      ): meta is {
        topic: string;
        subtopic: string;
        is_code: boolean;
        difficulty: string;
        bloom: string;
      } => Boolean(meta && meta.topic)
    );

  let negativeExamples: string[] = askedQuestions
    .slice(-NEGATIVE_EXAMPLES_LOOKAHEAD)
    .map((q) => {
      const mcqItem = extractAskedMcq(q);
      return String(mcqItem?.question || "");
    })
    .filter((s) => s.length > 0);

  while (generationAttempts < MAX_ATTEMPTS) {
    generationAttempts++;

    try {
      let queryText = contextSubtopic || `${contextTopic} fundamentals`;
      queryText += criteria.coding_mode ? " code example implementation" : " explanation concepts";

      const [queryEmbedding] = await getEmbeddings([queryText]);

      const { data: contextItems, error: contextError } = await supabase.rpc("retrieval_hybrid_by_labels", {
        p_user_id: userId,
        p_topic: contextTopic,
        p_query_embedding: queryEmbedding as unknown as number[],
        p_query_text: queryText,
        p_subtopic: contextSubtopic,
        p_version: null,
        p_topk: 8,
        p_alpha: 0.5,
      });

      if (contextError || !contextItems || contextItems.length === 0) {
        throw new Error("No context items retrieved");
      }

      const contextForGeneration = contextItems.map(
        (item: { title?: string | null; bucket: string; path: string; content: string }) => ({
          title: item.title,
          url: `${item.bucket}/${item.path}`,
          content: item.content,
        })
      );

      const generatedMcq = await generateMcqFromContext({
        topic: contextTopic,
        subtopic: contextSubtopic,
        difficulty: criteria.difficulty as EDifficulty,
        bloomLevel: criteria.preferred_bloom_level || EBloomLevel.UNDERSTAND,
        contextItems: contextForGeneration,
        codingMode: criteria.coding_mode,
        negativeExamples,
        avoidTopics: [],
        avoidSubtopics: [],
        previousQuestionsMeta,
      });

      const contentKey = computeMcqContentKey(generatedMcq);
      if (askedContentKeySet.has(contentKey)) {
        console.warn("generation_similarity_gate_hit", {
          attempt_id: attemptId,
          reason: ESimilarityGate.CONTENT_KEY,
        });
        negativeExamples = [...negativeExamples, generatedMcq.question].slice(-NEGATIVE_EXAMPLES_LIMIT);
        if (generationAttempts < MAX_ATTEMPTS) continue;
      }

      try {
        const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);
        const { data: neighborRows } = await supabase.rpc("retrieval_mcq_neighbors", {
          p_user_id: userId,
          p_topic: contextTopic,
          p_embedding: mcqEmbedding as unknown as number[],
          p_subtopic: contextSubtopic,
          p_topk: EVALUATE_SELECTION_CONFIG.GENERATION.NEIGHBOR_TOPK,
        });

        const neighborScores: Array<{ score: number }> = (neighborRows ?? []).map((r: { score?: number }) => ({
          score: Number(r?.score || 0),
        }));

        if (
          neighborScores[0] &&
          neighborScores[0].score >= EVALUATE_SELECTION_CONFIG.GENERATION.NEIGHBOR_HIGH_SIMILARITY_THRESHOLD
        ) {
          console.warn("generation_similarity_gate_hit", {
            attempt_id: attemptId,
            reason: ESimilarityGate.NEIGHBOR,
            top_score: neighborScores[0].score,
          });
          negativeExamples = [...negativeExamples, generatedMcq.question].slice(-NEGATIVE_EXAMPLES_LIMIT);
          if (generationAttempts < MAX_ATTEMPTS) continue;
        }
      } catch (neighborError) {
        const message = neighborError instanceof Error ? neighborError.message : String(neighborError);
        console.warn("neighbor_check_failed", { message });
      }

      try {
        const askedEmbeddings: number[][] = [];
        const askedQuestionTexts: string[] = [];

        for (const entry of askedQuestions) {
          const mcqItem = Array.isArray(entry.mcq_items) ? entry.mcq_items[0] : entry.mcq_items;
          const vector = toNumericVector(mcqItem?.embedding);
          if (vector) askedEmbeddings.push(vector);
          if (mcqItem?.question) askedQuestionTexts.push(mcqItem.question);
        }

        let similarityCheckPassed = true;

        if (askedEmbeddings.length > 0) {
          const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);
          const similarityScores = askedEmbeddings.map((vector) => cosineSimilarity(vector, mcqEmbedding));
          const topSimilarity = Math.max(...similarityScores);

          if (topSimilarity >= EVALUATE_SELECTION_CONFIG.SIMILARITY.ATTEMPT_THRESHOLD) {
            console.warn("generation_similarity_gate_hit", {
              attempt_id: attemptId,
              reason: ESimilarityGate.ATTEMPT_EMBEDDING,
              top_score: topSimilarity,
            });
            similarityCheckPassed = false;
          }
        }

        if (similarityCheckPassed && askedQuestionTexts.length > 0) {
          const genText = generatedMcq.question.toLowerCase().trim();
          for (const askedText of askedQuestionTexts) {
            if (askedText.toLowerCase().trim() === genText) {
              console.warn("generation_similarity_gate_hit", {
                attempt_id: attemptId,
                reason: ESimilarityGate.ATTEMPT_EXACT,
              });
              similarityCheckPassed = false;
              break;
            }
          }
        }

        if (!similarityCheckPassed) {
          negativeExamples = [...negativeExamples, generatedMcq.question].slice(-NEGATIVE_EXAMPLES_LIMIT);
          if (generationAttempts < MAX_ATTEMPTS) continue;
        }
      } catch (attemptSimilarityError) {
        const message =
          attemptSimilarityError instanceof Error ? attemptSimilarityError.message : String(attemptSimilarityError);
        console.warn("attempt_similarity_check_failed", { message });
      }

      const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);
      const { id: savedId } = await persistGeneratedMcq(generatedMcq, mcqEmbedding, userId, supabase, attemptId);

      if (savedId) {
        return { questionId: savedId, generatedMcq };
      }
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : String(generationError);
      console.error(`Error generating MCQ (attempt ${generationAttempts}/${MAX_ATTEMPTS}):`, message);
    }
  }

  return { questionId: null };
}
/**
 * Select the next question for a user attempt using a multi-stage adaptive pipeline.
 *
 * Pipeline stages:
 * 1. **Guard**: Authenticate user, fetch attempt, check completion
 * 2. **Context**: Build attempt distributions and LLM context
 * 3. **Bank Query**: Query MCQ bank with LLM criteria; filter overrepresented topics
 * 4. **Scoring**: Apply neighbor similarity checks and preference scoring
 * 5. **Assignment**: Stochastic top-K selection; fallback to generation/fallback if needed
 *
 * Ensures deterministic output despite concurrent requests through unique constraint handling.
 *
 * @param attemptId - User attempt UUID
 * @param userId - Authenticated user UUID
 * @param supabase - Supabase service role client
 * @returns Formatted next question response ready for API handler
 * @throws Error if attempt not found or user unauthorized; caught by route handler
 */
export async function selectNextQuestionForAttempt(
  attemptId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<{
  attempt: {
    id: string;
    status: EAttemptStatus;
    questions_answered: number;
    correct_count: number;
    total_questions: number;
  };
  next_question: {
    id: string;
    question: string;
    options: string[];
    code: string | null;
    metadata: {
      topic: string;
      subtopic: string;
      difficulty: string;
      bloom_level: string;
      question_order: number;
      coding_mode: boolean;
      generated_on_demand?: boolean;
    };
  } | null;
}> {
  // Stage 1: Guard - Fetch and validate attempt
  const attempt = await fetchAttemptOrFail(attemptId, userId, supabase);
  if (!attempt) {
    throw new Error("Attempt not found or unauthorized");
  }

  // Check if completed
  const completionCheck = checkCompletionStatus(attempt);
  if (completionCheck?.completed) {
    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        questions_answered: attempt.questions_answered || 0,
        correct_count: attempt.correct_count || 0,
        total_questions: attempt.total_questions,
      },
      next_question: null,
    };
  }

  // Fetch all asked questions
  const { questions: askedQuestionsData, error: questionsError } = await validateAttemptQuestions(attemptId, supabase);
  if (questionsError) throw questionsError;

  const asked = askedQuestionsData || [];

  const nextQuestionOrder = await computeNextQuestionOrder(
    attemptId,
    attempt.questions_answered || 0,
    attempt.total_questions,
    supabase
  );

  // Check for existing pending question
  const existingPending = findExistingPendingQuestion(asked, nextQuestionOrder);
  if (existingPending) {
    const rawMcq = existingPending?.mcq_items;
    let mcq = Array.isArray(rawMcq) ? rawMcq[0] : rawMcq;

    if ((!mcq || !mcq.id || !Array.isArray(mcq.options) || mcq.options.length === 0) && existingPending.question_id) {
      const { data: fallbackMcq } = await supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .eq("id", existingPending.question_id)
        .single();
      if (fallbackMcq) mcq = fallbackMcq as IBankCandidate;
    }

    if (mcq && mcq.id && Array.isArray(mcq.options) && mcq.options.length > 0) {
      console.log("question_selected", {
        attempt_id: attempt.id,
        method: ESelectionMethod.EXISTING_PENDING,
        question_id: mcq.id,
        order: nextQuestionOrder,
        topic: mcq.topic,
        subtopic: mcq.subtopic,
      });

      return {
        attempt: {
          id: attempt.id,
          status: attempt.status,
          questions_answered: attempt.questions_answered || 0,
          correct_count: attempt.correct_count || 0,
          total_questions: attempt.total_questions,
        },
        next_question: {
          id: mcq.id,
          question: mcq.question,
          options: mcq.options,
          code: mcq.code || null,
          metadata: {
            topic: mcq.topic,
            subtopic: mcq.subtopic,
            difficulty: mcq.difficulty,
            bloom_level: mcq.bloom_level,
            question_order: nextQuestionOrder,
            coding_mode: !!mcq.code,
          },
        },
      };
    }
  }

  // Stage 2: Context - Build distributions and selection context
  const distributions = calculateDistributions(asked);
  const currentTopicPhase = getCurrentTopicPhase(attempt.questions_answered || 0);
  const { summary: coverageSummary, exposureLookup } = await fetchUserCoverageData(userId, supabase, currentTopicPhase);
  const selectionContext = buildSelectionContext(
    attemptId,
    attempt.questions_answered || 0,
    distributions,
    coverageSummary
  );

  const totalTarget = EVALUATION_CONFIG.TOTAL_QUESTIONS;
  const difficultyTargets = EVALUATION_CONFIG.DIFFICULTY_TARGETS;
  const bloomTargets = EVALUATION_CONFIG.BLOOM_TARGETS;

  const questionsAnswered = attempt.questions_answered || 0;
  const questionsRemaining = Math.max(totalTarget - questionsAnswered, 0);

  const hardNeeded = Math.max(0, difficultyTargets.MIN_HARD - distributions.hard_count);
  const easyRemaining = Math.max(0, difficultyTargets.MAX_EASY - distributions.easy_count);
  const mediumRemaining = Math.max(0, difficultyTargets.MAX_MEDIUM - distributions.medium_count);

  const bloomCounts: Record<EBloomLevel, number> = {
    [EBloomLevel.REMEMBER]: distributions.bloom_distribution[EBloomLevel.REMEMBER] ?? 0,
    [EBloomLevel.UNDERSTAND]: distributions.bloom_distribution[EBloomLevel.UNDERSTAND] ?? 0,
    [EBloomLevel.APPLY]: distributions.bloom_distribution[EBloomLevel.APPLY] ?? 0,
    [EBloomLevel.ANALYZE]: distributions.bloom_distribution[EBloomLevel.ANALYZE] ?? 0,
    [EBloomLevel.EVALUATE]: distributions.bloom_distribution[EBloomLevel.EVALUATE] ?? 0,
    [EBloomLevel.CREATE]: distributions.bloom_distribution[EBloomLevel.CREATE] ?? 0,
  };

  const analyzeNeeded = Math.max(0, bloomTargets.MIN_ANALYZE - bloomCounts[EBloomLevel.ANALYZE]);
  const evalCreateNeeded = Math.max(
    0,
    bloomTargets.MIN_EVALUATE_CREATE - (bloomCounts[EBloomLevel.EVALUATE] + bloomCounts[EBloomLevel.CREATE])
  );

  const enforceDifficultyFallback = hardNeeded > 0;
  const enforceBloomFallback = analyzeNeeded > 0 || evalCreateNeeded > 0;

  console.log("selection_input", {
    attempt_id: attemptId,
    answered: attempt.questions_answered,
    distributions: {
      difficulty: {
        easy: distributions.easy_count,
        medium: distributions.medium_count,
        hard: distributions.hard_count,
      },
      coding_count: distributions.coding_count,
      topics: distributions.topic_distribution,
      blooms: distributions.bloom_distribution,
    },
    constraints: {
      hard_needed: hardNeeded,
      easy_remaining: easyRemaining,
      medium_remaining: mediumRemaining,
      analyze_needed: analyzeNeeded,
      eval_create_needed: evalCreateNeeded,
      questions_remaining: questionsRemaining,
    },
    coverage_summary: coverageSummary,
  });

  // Call LLM selector
  const criteria = await callLLMSelector(selectionContext);

  console.log("llm_selector_output", {
    attempt_id: attemptId,
    criteria,
  });

  // Build asked content keys for similarity checks
  const askedContentKeySet = new Set<string>(
    asked.map((q) => String(q?.mcq_items?.content_key || "")).filter((s: string) => s.length > 0)
  );

  const askedIdSet = new Set<string>(asked.map((q) => q.question_id).filter((id: string) => typeof id === "string"));

  // Fetch recent questions for cross-attempt freshness
  const recentIdSet = await fetchRecentAttemptQuestions(userId, supabase, { excludeAttemptId: attemptId });

  // Stage 3: Bank Query - Query MCQ bank with exact 5-dimension match
  let query = supabase
    .from("mcq_items")
    .select("id, topic, subtopic, difficulty, bloom_level, question, options, code, embedding")
    .eq("difficulty", criteria.difficulty)
    .eq("topic", criteria.preferred_topic)
    .eq("bloom_level", criteria.preferred_bloom_level);

  // Handle subtopic matching (null or exact match)
  if (criteria.preferred_subtopic) {
    query = query.eq("subtopic", criteria.preferred_subtopic);
  } else {
    query = query.is("subtopic", null);
  }

  // Handle coding mode matching
  if (criteria.coding_mode) {
    query = query.not("code", "is", null).not("code", "eq", "");
  } else {
    query = query.or("code.is.null,code.eq.");
  }

  // Exclude already-asked questions
  if (askedIdSet.size > 0) {
    const askedIdListForIn = Array.from(askedIdSet)
      .map((id) => `"${id}"`)
      .join(",");
    query = query.not("id", "in", `(${askedIdListForIn})`);
  }

  query = query.limit(EVALUATE_SELECTION_CONFIG.BANK_QUERY.LIMIT);

  const { data: candidates, error: candidatesError } = await query;
  if (candidatesError) throw candidatesError;

  // Filter primary candidates
  const primaryCandidates = (candidates || [])
    .filter((c: IBankCandidate) => !askedIdSet.has(c.id))
    .map((c: IBankCandidate) => ({ ...c, _seenRecently: recentIdSet.has(c.id) }));

  const {
    USER_FRESHNESS: { MAX_PER_COMBO },
  } = EVALUATE_SELECTION_CONFIG;

  const freshnessFiltered = primaryCandidates.filter((candidate) => {
    const key = buildExposureKey(candidate.topic, candidate.subtopic, candidate.difficulty, Boolean(candidate.code));
    const seenCount = exposureLookup.get(key) ?? 0;
    if (seenCount >= MAX_PER_COMBO) {
      console.log("candidate_skipped_user_freshness", {
        attempt_id: attemptId,
        question_id: candidate.id,
        topic: candidate.topic,
        subtopic: candidate.subtopic,
        difficulty: candidate.difficulty,
        coding_mode: Boolean(candidate.code),
        seen_count: seenCount,
      });
      return false;
    }

    return true;
  });

  console.log("candidate_pool_primary", {
    attempt_id: attemptId,
    raw_count: (candidates || []).length,
    filtered_count: primaryCandidates.length,
    freshness_filtered_count: freshnessFiltered.length,
    seen_recently_count: freshnessFiltered.filter((c) => c._seenRecently).length,
    exact_match_criteria: {
      topic: criteria.preferred_topic,
      subtopic: criteria.preferred_subtopic,
      difficulty: criteria.difficulty,
      bloom_level: criteria.preferred_bloom_level,
      coding_mode: criteria.coding_mode,
    },
  });

  // If no bank candidates, attempt generation fallback
  if (!freshnessFiltered || freshnessFiltered.length === 0) {
    console.warn("No bank candidates found; attempting generation fallback");

    const { questionId: generatedId, generatedMcq } = await generateMcqFallback(
      attemptId,
      userId,
      criteria,
      distributions,
      asked,
      askedContentKeySet,
      supabase
    );

    if (generatedId && generatedMcq) {
      // Assign generated question
      const nextOrder = nextQuestionOrder;
      const { error: genAssignErr } = await supabase.from("attempt_questions").insert({
        attempt_id: attemptId,
        question_id: generatedId,
        question_order: nextOrder,
      });

      if (genAssignErr && genAssignErr.code !== "23505") throw genAssignErr;

      // Read back canonical question
      const { data: assignedRow } = await supabase
        .from("attempt_questions")
        .select("question_id")
        .eq("attempt_id", attemptId)
        .eq("question_order", nextOrder)
        .single();

      const finalQuestionId = assignedRow?.question_id ?? generatedId;

      console.log("question_selected", {
        attempt_id: attempt.id,
        method: ESelectionMethod.GENERATED_ON_DEMAND,
        question_id: finalQuestionId,
        order: nextOrder,
        topic: generatedMcq.topic,
        subtopic: generatedMcq.subtopic,
      });

      await recordQuestionExposure(
        userId,
        {
          id: finalQuestionId,
          topic: generatedMcq.topic,
          subtopic: generatedMcq.subtopic,
          difficulty: generatedMcq.difficulty,
          bloom_level: generatedMcq.bloomLevel,
          code: generatedMcq.code || null,
        },
        supabase
      );

      return {
        attempt: {
          id: attempt.id,
          status: attempt.status,
          questions_answered: attempt.questions_answered || 0,
          correct_count: attempt.correct_count || 0,
          total_questions: attempt.total_questions,
        },
        next_question: {
          id: finalQuestionId,
          question: generatedMcq.question,
          options: generatedMcq.options,
          code: generatedMcq.code || null,
          metadata: {
            topic: generatedMcq.topic,
            subtopic: generatedMcq.subtopic,
            difficulty: generatedMcq.difficulty,
            bloom_level: generatedMcq.bloomLevel,
            question_order: nextOrder,
            coding_mode: !!generatedMcq.code,
            generated_on_demand: true,
          },
        },
      };
    }

    // If generation failed, attempt fallback assignment
    const { question_id: fallbackId } = await ensureQuestionAssigned(
      attemptId,
      nextQuestionOrder,
      supabase,
      attemptId,
      {
        criteria,
        excludedQuestionIds: askedIdSet,
        recentQuestionIds: recentIdSet,
        exposureLookup,
        maxExposurePerCombo: MAX_PER_COMBO,
        enforceDifficulty: enforceDifficultyFallback,
        enforceBloom: enforceBloomFallback,
      }
    );

    if (!fallbackId) {
      throw new Error("Unable to assign question after exhausting all methods");
    }

    const { data: fallbackQuestion } = await supabase
      .from("mcq_items")
      .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
      .eq("id", fallbackId)
      .single();

    return {
      attempt: {
        id: attempt.id,
        status: attempt.status,
        questions_answered: attempt.questions_answered || 0,
        correct_count: attempt.correct_count || 0,
        total_questions: attempt.total_questions,
      },
      next_question: fallbackQuestion
        ? {
            id: fallbackQuestion.id,
            question: fallbackQuestion.question,
            options: fallbackQuestion.options,
            code: fallbackQuestion.code || null,
            metadata: {
              topic: fallbackQuestion.topic,
              subtopic: fallbackQuestion.subtopic,
              difficulty: fallbackQuestion.difficulty,
              bloom_level: fallbackQuestion.bloom_level,
              question_order: nextQuestionOrder,
              coding_mode: !!fallbackQuestion.code,
            },
          }
        : null,
    };
  }

  // Stage 4: Scoring - Apply similarity checks and preference scoring
  const askedEmbeddings: number[][] = [];
  for (const entry of asked) {
    const mcqItem = Array.isArray(entry?.mcq_items) ? entry.mcq_items[0] : entry?.mcq_items;
    const vector = toNumericVector(mcqItem?.embedding);
    if (vector) askedEmbeddings.push(vector);
  }

  const candidatesWithSimilarity = await applyNeighborSimilarityChecks(
    freshnessFiltered.map((c) => ({ ...c, similarityPenalty: 0, similarityMetrics: {} })) as ICandidateWithSimilarity[],
    askedEmbeddings,
    userId,
    supabase
  );

  const scoredCandidates = candidatesWithSimilarity.map((candidate) => ({
    ...candidate,
    score: scoreCandidate(candidate, criteria, distributions, distributions as IAttemptContext),
  }));

  scoredCandidates.sort((a, b) => b.score - a.score);

  // Stage 5: Assignment - Stochastic top-K selection with fallback
  const selectionOrder = selectTopKWithWeights(scoredCandidates);
  const nextOrder = nextQuestionOrder;
  let final: IBankCandidate | null = null;

  for (const candidate of selectionOrder) {
    const { success, assigned_question_id } = await assignQuestionWithRetry(
      attemptId,
      candidate.id,
      nextOrder,
      supabase,
      attemptId
    );

    if (success && assigned_question_id) {
      const { data: assignedRow } = await supabase
        .from("attempt_questions")
        .select("question_id")
        .eq("attempt_id", attemptId)
        .eq("question_order", nextOrder)
        .single();

      let selectedForResponse: IBankCandidate = candidate;
      if (assignedRow && assignedRow.question_id && assignedRow.question_id !== candidate.id) {
        const { data: assignedMcq } = await supabase
          .from("mcq_items")
          .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
          .eq("id", assignedRow.question_id)
          .single();
        if (assignedMcq) selectedForResponse = assignedMcq as IBankCandidate;
      }

      final = selectedForResponse;
      console.log("question_selected", {
        attempt_id: attemptId,
        method: ESelectionMethod.BANK_TOPK,
        question_id: selectedForResponse.id,
        order: nextOrder,
        topic: selectedForResponse.topic,
        subtopic: selectedForResponse.subtopic,
      });

      await recordQuestionExposure(userId, selectedForResponse, supabase);
      break;
    }
  }

  // Fallback if no candidate succeeded
  if (!final) {
    const { question_id: fallbackId } = await ensureQuestionAssigned(attemptId, nextOrder, supabase, attemptId, {
      criteria,
      excludedQuestionIds: askedIdSet,
      recentQuestionIds: recentIdSet,
      exposureLookup,
      maxExposurePerCombo: MAX_PER_COMBO,
      enforceDifficulty: enforceDifficultyFallback,
      enforceBloom: enforceBloomFallback,
    });

    if (fallbackId) {
      const { data: fallbackMcq } = await supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .eq("id", fallbackId)
        .single();
      if (fallbackMcq) {
        final = fallbackMcq as IBankCandidate;
        await recordQuestionExposure(userId, final, supabase);
      }
    }
  }

  return {
    attempt: {
      id: attempt.id,
      status: attempt.status,
      questions_answered: attempt.questions_answered || 0,
      correct_count: attempt.correct_count || 0,
      total_questions: attempt.total_questions,
    },
    next_question: final
      ? {
          id: final.id,
          question: final.question,
          options: final.options,
          code: final.code || null,
          metadata: {
            topic: final.topic,
            subtopic: final.subtopic || "",
            difficulty: final.difficulty,
            bloom_level: final.bloom_level,
            question_order: nextOrder,
            coding_mode: !!final.code,
          },
        }
      : null,
  };
}
