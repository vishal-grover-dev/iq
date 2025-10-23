import { SupabaseClient } from "@supabase/supabase-js";
import {
  ESelectionMethod,
  ESimilarityGate,
  IAssignmentResult,
  IAskedQuestionRow,
  ISelectionCriteria,
  IDistributions,
  IAssignmentError,
} from "@/types/evaluate.types";
import { EDifficulty, EBloomLevel, IMcqItemView } from "@/types/mcq.types";
import { generateMcqFromContext } from "@/services/ai/mcq-generation.service";
import { getEmbeddings } from "@/services/ai/embedding.service";
import { toNumericVector, cosineSimilarity } from "@/utils/vector.utils";
import { computeMcqContentKey, buildMcqEmbeddingText } from "@/utils/mcq.utils";
import { getStaticTopicList, getStaticSubtopicMap } from "@/utils/static-ontology.utils";
import { weightedRandomIndex, calculateCoverageWeights } from "@/utils/selection.utils";
import { EVALUATE_SELECTION_CONFIG } from "@/constants/evaluate.constants";

export async function assignQuestionWithRetry(
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

export async function persistGeneratedMcq(
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
      embedding: mcqEmbedding as unknown as any,
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

export async function ensureQuestionAssigned(
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

export async function generateMcqFallback(
  attemptId: string,
  userId: string,
  criteria: ISelectionCriteria,
  distributions: IDistributions,
  askedQuestions: IAskedQuestionRow[],
  askedContentKeySet: Set<string>,
  overrepresentedTopics: string[],
  supabase: SupabaseClient
): Promise<{ questionId: string | null; generatedMcq?: IMcqItemView }> {
  const { MAX_ATTEMPTS, NEGATIVE_EXAMPLES_LOOKAHEAD, NEGATIVE_EXAMPLES_LIMIT } = EVALUATE_SELECTION_CONFIG.GENERATION;

  let generationAttempts = 0;
  let contextTopic = criteria.preferred_topic;
  let contextSubtopic: string | null = null;

  const baseAvoidTopics = [...overrepresentedTopics];
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
      let topicsUniverse: string[] = [];
      try {
        topicsUniverse = getStaticTopicList();
      } catch (_) {
        topicsUniverse = [];
      }

      if (!topicsUniverse || topicsUniverse.length === 0) {
        const allTopicsForWeights = Object.keys(distributions.topic_distribution);
        topicsUniverse = allTopicsForWeights.length > 0 ? allTopicsForWeights : ["React"];
      }

      const weightMap = calculateCoverageWeights(distributions.topic_distribution, topicsUniverse, 1);
      const topicWeights = topicsUniverse.map((t) => weightMap[t] || 1);
      const topicIdx = weightedRandomIndex(topicWeights);
      contextTopic = criteria.preferred_topic || topicsUniverse[topicIdx] || "React";

      const subtopicsByTopic = getStaticSubtopicMap();
      const topicSubtopicsSet = new Set<string>(subtopicsByTopic[contextTopic] || []);

      if (criteria.preferred_subtopic) {
        const match = Array.from(topicSubtopicsSet).find(
          (dbSubtopic) =>
            dbSubtopic === criteria.preferred_subtopic ||
            dbSubtopic.toLowerCase().includes(criteria.preferred_subtopic?.toLowerCase() || "") ||
            criteria.preferred_subtopic?.toLowerCase().includes(dbSubtopic.toLowerCase())
        );
        if (match) contextSubtopic = match;
      }

      if (!contextSubtopic && topicSubtopicsSet.size > 0) {
        const subtopicsArray = Array.from(topicSubtopicsSet);
        contextSubtopic = subtopicsArray[Math.floor(Math.random() * subtopicsArray.length)];
      }

      let queryText = contextSubtopic || `${contextTopic} fundamentals`;
      if (criteria.coding_mode) {
        queryText += " code example implementation";
      } else {
        queryText += " explanation concepts";
      }

      const [queryEmbedding] = await getEmbeddings([queryText]);

      const { data: contextItems, error: contextError } = await supabase.rpc("retrieval_hybrid_by_labels", {
        p_user_id: userId,
        p_topic: contextTopic,
        p_query_embedding: queryEmbedding as unknown as any,
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

      const relaxationLevel = Math.max(0, generationAttempts - 1);
      const avoidTopicsForAttempt =
        relaxationLevel >= baseAvoidTopics.length
          ? []
          : baseAvoidTopics.slice(0, baseAvoidTopics.length - relaxationLevel);

      let generatedMcq = await generateMcqFromContext({
        topic: contextTopic,
        subtopic: contextSubtopic,
        difficulty: criteria.difficulty as EDifficulty,
        bloomLevel: criteria.preferred_bloom_level || EBloomLevel.UNDERSTAND,
        contextItems: contextForGeneration,
        codingMode: criteria.coding_mode,
        negativeExamples,
        avoidTopics: avoidTopicsForAttempt,
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
          p_embedding: mcqEmbedding as unknown as any,
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
