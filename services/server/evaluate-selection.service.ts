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
  IUserAttempt,
  TAttemptQuestion,
} from "@/types/evaluate.types";
import { selectNextQuestion as callLLMSelector } from "@/services/server/question-selector.service";
import { generateMcqFromContext } from "@/services/server/mcq-generation.service";
import { getEmbeddings } from "@/services/server/embedding.service";
import { toNumericVector, cosineSimilarity } from "@/utils/vector.utils";
import { computeMcqContentKey, buildMcqEmbeddingText } from "@/utils/mcq.utils";
import { weightedRandomIndex } from "@/utils/selection.utils";
import { EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";
import { EDifficulty, EBloomLevel, IMcqItemView } from "@/types/mcq.types";

// ---------------------------------------------------------------------------
// Stage 1 helpers: Attempt guard and validation
// ---------------------------------------------------------------------------

async function fetchAttemptOrFail(
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

function checkCompletionStatus(attempt: IUserAttempt): { status: EAttemptStatus; completed: boolean } | null {
  if (attempt.status === EAttemptStatus.Completed) {
    return {
      status: attempt.status,
      completed: true,
    };
  }

  // Also check if user has answered the target number of questions
  // This prevents assigning a 61st question when 60 have been answered
  if ((attempt.questions_answered || 0) >= attempt.total_questions) {
    return {
      status: attempt.status,
      completed: true,
    };
  }

  return null;
}

function findExistingPendingQuestion(
  askedQuestions: TAttemptQuestion[],
  nextQuestionOrder: number
): TAttemptQuestion | null {
  const pending = askedQuestions.find((q) => {
    const answeredAt = q?.answered_at;
    const userAnswer = q?.user_answer_index;
    const orderMatches = Number(q?.question_order ?? 0) === nextQuestionOrder;
    const notAnsweredYet = typeof userAnswer !== "number" && !answeredAt;
    return orderMatches && notAnsweredYet;
  });

  return pending || null;
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

// ---------------------------------------------------------------------------
// Stage 2 helpers: Context building
// ---------------------------------------------------------------------------

function calculateDistributions(askedQuestions: IAskedQuestionRow[]): IDistributions {
  return askedQuestions.reduce(
    (acc, q) => {
      const mcq = q.mcq_items as IBankCandidate | undefined;
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

function buildSelectionContext(
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

async function fetchRecentAttemptQuestions(userId: string, supabase: SupabaseClient): Promise<Set<string>> {
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
    const { error: assignError } = await supabase.from("attempt_questions").insert({
      attempt_id: attemptId,
      question_id: questionId,
      question_order: questionOrder,
    });

    if (!assignError) {
      return { success: true, assigned_question_id: questionId };
    }

    lastError = assignError;

    if (assignError.code === "23505") {
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
        error: assignError.message,
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

async function ensureQuestionAssigned(
  attemptId: string,
  questionOrder: number,
  supabase: SupabaseClient,
  attemptIdForLogging: string
): Promise<{ question_id: string | null; error?: IAssignmentError | string | null }> {
  const { data: fallbackMcq } = await supabase
    .from("mcq_items")
    .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
    .limit(1)
    .single();

  if (!fallbackMcq) {
    return { question_id: null, error: "no_fallback_available" };
  }

  const { error: fallbackError } = await supabase.from("attempt_questions").insert({
    attempt_id: attemptId,
    question_id: fallbackMcq.id,
    question_order: questionOrder,
  });

  if (!fallbackError) {
    console.log("question_selected", {
      attempt_id: attemptIdForLogging,
      method: ESelectionMethod.FALLBACK_ASSIGNMENT,
      question_id: fallbackMcq.id,
      order: questionOrder,
      topic: fallbackMcq.topic,
      subtopic: fallbackMcq.subtopic,
    });
    return { question_id: fallbackMcq.id };
  }

  console.error("fallback_assignment_failed", {
    attempt_id: attemptIdForLogging,
    order: questionOrder,
    error: fallbackError.message,
  });

  return { question_id: null, error: fallbackError };
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

  let negativeExamples: string[] = askedQuestions
    .slice(-NEGATIVE_EXAMPLES_LOOKAHEAD)
    .map((q) => {
      const mcqItem = Array.isArray(q.mcq_items) ? q.mcq_items[0] : q.mcq_items;
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

  const nextQuestionOrder = (attempt.questions_answered || 0) + 1;

  // Fetch all asked questions
  const { questions: askedQuestionsData, error: questionsError } = await validateAttemptQuestions(attemptId, supabase);
  if (questionsError) throw questionsError;

  const asked = askedQuestionsData || [];

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
  const selectionContext = buildSelectionContext(attemptId, attempt.questions_answered || 0, distributions);

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
  const recentIdSet = await fetchRecentAttemptQuestions(userId, supabase);

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
  const filteredPrimary = (candidates || [])
    .filter((c: IBankCandidate) => !askedIdSet.has(c.id))
    .map((c: IBankCandidate) => ({ ...c, _seenRecently: recentIdSet.has(c.id) }));

  console.log("candidate_pool_primary", {
    attempt_id: attemptId,
    raw_count: (candidates || []).length,
    filtered_count: filteredPrimary.length,
    seen_recently_count: filteredPrimary.filter((c) => c._seenRecently).length,
    exact_match_criteria: {
      topic: criteria.preferred_topic,
      subtopic: criteria.preferred_subtopic,
      difficulty: criteria.difficulty,
      bloom_level: criteria.preferred_bloom_level,
      coding_mode: criteria.coding_mode,
    },
  });

  // If no bank candidates, attempt generation fallback
  if (!filteredPrimary || filteredPrimary.length === 0) {
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
    const { question_id: fallbackId } = await ensureQuestionAssigned(attemptId, nextQuestionOrder, supabase, attemptId);

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
    filteredPrimary.map((c) => ({ ...c, similarityPenalty: 0, similarityMetrics: {} })) as ICandidateWithSimilarity[],
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
  const nextOrder = attempt.questions_answered + 1;
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
      break;
    }
  }

  // Fallback if no candidate succeeded
  if (!final) {
    const { question_id: fallbackId } = await ensureQuestionAssigned(attemptId, nextOrder, supabase, attemptId);

    if (fallbackId) {
      const { data: fallbackMcq } = await supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .eq("id", fallbackId)
        .single();
      if (fallbackMcq) final = fallbackMcq as IBankCandidate;
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
