import { SupabaseClient } from "@supabase/supabase-js";
import {
  ESelectionMethod,
  EAttemptStatus,
  IBankCandidate,
  IBankCandidateWithMetadata,
  IAttemptQuestion,
} from "@/types/evaluate.types";
import { selectNextQuestion as callLLMSelector } from "@/services/ai/question-selector.service";
import {
  fetchAttemptOrFail,
  checkCompletionStatus,
  findExistingPendingQuestion,
  validateAttemptQuestions,
} from "@/utils/evaluate-attempt-guard.utils";
import {
  calculateDistributions,
  buildSelectionContext,
  identifyOverrepresentedTopics,
  fetchRecentAttemptQuestions,
} from "@/utils/evaluate-context-builder.utils";
import {
  applyNeighborSimilarityChecks,
  scoreCandidate,
  selectTopKWithWeights,
} from "@/utils/evaluate-candidate-scorer.utils";
import {
  assignQuestionWithRetry,
  generateMcqFallback,
  ensureQuestionAssigned,
} from "@/utils/evaluate-assignment-executor.utils";
import { toNumericVector } from "@/utils/vector.utils";
import { EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";
import { ICandidateWithSimilarity } from "@/types/evaluate.types";
import { IAttemptContext } from "@/types/evaluate.types";

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

  // Identify overrepresented topics
  const overrepresentedTopics = identifyOverrepresentedTopics(distributions, attempt.questions_answered || 0);

  // Build asked content keys for similarity checks
  const askedContentKeySet = new Set<string>(
    asked.map((q: IAttemptQuestion) => String(q?.mcq_items?.content_key || "")).filter((s: string) => s.length > 0)
  );

  const askedIdSet = new Set<string>(
    asked.map((q: IAttemptQuestion) => q.question_id).filter((id: string) => typeof id === "string")
  );

  // Fetch recent questions for cross-attempt freshness
  const recentIdSet = await fetchRecentAttemptQuestions(userId, supabase);

  // Stage 3: Bank Query - Query MCQ bank with LLM criteria
  let query = supabase
    .from("mcq_items")
    .select("id, topic, subtopic, difficulty, bloom_level, question, options, code, embedding")
    .eq("difficulty", criteria.difficulty);

  if (askedIdSet.size > 0) {
    const askedIdListForIn = Array.from(askedIdSet)
      .map((id) => `"${id}"`)
      .join(",");
    query = query.not("id", "in", `(${askedIdListForIn})`);
  }

  if (criteria.coding_mode) {
    query = query.not("code", "is", null);
  }

  if (overrepresentedTopics.length > 0) {
    const quotedTopics = overrepresentedTopics.map((t) => `"${t}"`).join(",");
    query = query.not("topic", "in", `(${quotedTopics})`);
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
    overrepresented_excluded: overrepresentedTopics,
    coding_required: !!criteria.coding_mode,
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
      overrepresentedTopics,
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
    supabase,
    attemptId
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
