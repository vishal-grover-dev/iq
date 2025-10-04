import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { selectNextQuestion, getEmbeddings } from "@/services/ai.services";
import { weightedRandomIndex, calculateCoverageWeights } from "@/utils/selection.utils";
import { EAttemptStatus } from "@/types/evaluate.types";
import { EDifficulty, EBloomLevel } from "@/types/mcq.types";
import { computeMcqContentKey, buildMcqEmbeddingText } from "@/utils/mcq.utils";
import { getStaticTopicList, getStaticSubtopicMap } from "@/utils/static-ontology.utils";

export const runtime = "nodejs";

const ATTEMPT_SIMILARITY_THRESHOLD = 0.85; // Lowered from 0.92 to catch more similar questions
const BANK_SIMILARITY_THRESHOLD_HIGH = 0.92;
const BANK_SIMILARITY_THRESHOLD_MEDIUM = 0.85;
const BANK_SIMILARITY_PENALTY_HIGH = 50;
const BANK_SIMILARITY_PENALTY_MEDIUM = 25;
const BANK_NEIGHBOR_PENALTY_HIGH = 30;
const BANK_NEIGHBOR_PENALTY_MEDIUM = 15;

function toNumericVector(raw: unknown): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.map((value) => Number(value));
  }
  if (typeof raw === "string") {
    const normalized = raw.replace(/[{}()]/g, "");
    const parts = normalized
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (!parts.length) return null;
    const vector = parts.map((part) => Number(part));
    return vector.every((value) => Number.isFinite(value)) ? vector : null;
  }
  return null;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const length = Math.min(vecA.length, vecB.length);
  if (length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * GET /api/evaluate/attempts/:id
 * Fetches attempt details with progress and next question.
 * Backend invokes LLM selector to determine optimal next question based on attempt context.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId) return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });

    const supabase = getSupabaseServiceRoleClient();

    // Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("user_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // If attempt is completed, return without next question
    if (attempt.status === EAttemptStatus.Completed) {
      return NextResponse.json({
        attempt: {
          id: attempt.id,
          status: attempt.status,
          questions_answered: attempt.questions_answered,
          correct_count: attempt.correct_count,
          total_questions: attempt.total_questions,
        },
        next_question: null,
      });
    }

    // Fetch all questions asked so far in this attempt
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

    if (questionsError) {
      console.error("Error fetching asked questions:", questionsError);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const asked = askedQuestions || [];
    const nextQuestionOrder = (attempt.questions_answered || 0) + 1;

    // If a question has already been assigned for the next order but not yet answered,
    // return it immediately to avoid duplicate selection when parallel requests occur.
    const existingPending = asked.find((q: any) => {
      const answeredAt = q?.answered_at;
      const userAnswer = q?.user_answer_index;
      const orderMatches = Number(q?.question_order ?? 0) === nextQuestionOrder;
      const notAnsweredYet = typeof userAnswer !== "number" && !answeredAt;
      return orderMatches && notAnsweredYet;
    });

    if (existingPending) {
      const rawMcq = existingPending?.mcq_items;
      let mcq = Array.isArray(rawMcq) ? rawMcq[0] : rawMcq;

      if ((!mcq || !mcq.id || !Array.isArray(mcq.options) || mcq.options.length === 0) && existingPending.question_id) {
        const { data: fallbackMcq } = await supabase
          .from("mcq_items")
          .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
          .eq("id", existingPending.question_id)
          .single();
        if (fallbackMcq) {
          mcq = fallbackMcq as any;
        }
      }

      if (mcq && mcq.id && Array.isArray(mcq.options) && mcq.options.length > 0) {
        console.log("question_selected", {
          attempt_id: attempt.id,
          method: "existing_pending",
          question_id: mcq.id,
          order: nextQuestionOrder,
          topic: mcq.topic,
          subtopic: mcq.subtopic,
        });

        return NextResponse.json({
          attempt: {
            id: attempt.id,
            status: attempt.status,
            questions_answered: attempt.questions_answered,
            correct_count: attempt.correct_count,
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
        });
      }
    }

    // Build asked content keys and question gists for similarity checks
    const askedContentKeySet = new Set<string>(
      asked.map((q: any) => String(q?.mcq_items?.content_key || "")).filter((s: string) => s.length > 0)
    );
    const askedQuestionTexts: string[] = asked
      .map((q: any) => String(q?.mcq_items?.question || ""))
      .filter((s: string) => s.length > 0);

    // Build attempt context for LLM selector
    const distributions = asked.reduce(
      (acc, q: any) => {
        const mcq = q.mcq_items;
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

    const asked_question_ids = asked.map((q: any) => q.question_id);
    // Validate and quote UUIDs for robust PostgREST in-list filtering
    const askedIdSet = new Set<string>(asked_question_ids.filter((id: any) => typeof id === "string" && id.length > 0));
    const askedIdListForIn = Array.from(askedIdSet)
      .map((id) => `"${id}"`)
      .join(",");

    // Log selection input context (structured)
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

    // Call LLM selector to get optimal criteria for next question
    const criteria = await selectNextQuestion({
      attempt_id: attemptId,
      questions_answered: attempt.questions_answered,
      easy_count: distributions.easy_count,
      medium_count: distributions.medium_count,
      hard_count: distributions.hard_count,
      coding_count: distributions.coding_count,
      topic_distribution: distributions.topic_distribution,
      subtopic_distribution: distributions.subtopic_distribution,
      bloom_distribution: distributions.bloom_distribution,
    });

    // Log selector output
    console.log("llm_selector_output", {
      attempt_id: attemptId,
      criteria,
    });

    // Identify overrepresented topics (>= 40% of total = 24)
    const topicLimit = 24;
    const overrepresentedTopics = Object.keys(distributions.topic_distribution).filter(
      (t) => (distributions.topic_distribution[t] || 0) >= topicLimit
    );

    // Fetch last two completed attempts' question_ids for soft exclusion (cross-attempt freshness)
    const { data: recentCompleted } = await supabase
      .from("user_attempts")
      .select("id, completed_at")
      .eq("user_id", userId)
      .eq("status", EAttemptStatus.Completed)
      .order("completed_at", { ascending: false })
      .limit(2);

    const recentAttemptIds = (recentCompleted ?? []).map((r: any) => r.id);
    let recentQuestionIds: string[] = [];
    if (recentAttemptIds.length > 0) {
      const { data: recentQs } = await supabase
        .from("attempt_questions")
        .select("question_id, attempt_id")
        .in("attempt_id", recentAttemptIds);
      recentQuestionIds = (recentQs ?? []).map((r: any) => r.question_id).filter(Boolean);
    }
    const recentIdSet = new Set<string>(recentQuestionIds);

    // Query MCQ bank with LLM criteria (preferred topics treated as soft preference later)
    let query = supabase
      .from("mcq_items")
      .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
      .eq("difficulty", criteria.difficulty);

    // Exclude already asked questions (quoted UUID list for PostgREST 'in')
    if (askedIdSet.size > 0) {
      query = query.not("id", "in", `(${askedIdListForIn})`);
    }

    // Filter by coding mode
    if (criteria.coding_mode) {
      query = query.not("code", "is", null);
    }

    // Exclude topics that already exceeded balance limit
    if (overrepresentedTopics.length > 0) {
      const quotedTopics = overrepresentedTopics.map((t) => `"${t}"`).join(",");
      query = query.not("topic", "in", `(${quotedTopics})`);
    }

    // Limit results
    query = query.limit(20);

    const { data: candidates, error: candidatesError } = await query;

    if (candidatesError) {
      console.error("Error querying MCQ bank:", candidatesError);
      return NextResponse.json({ error: "Failed to query questions" }, { status: 500 });
    }

    // If no candidates found, try with relaxed criteria first
    // Defensive JS-side exclusion in case upstream filter under-excludes
    const filteredPrimary = (candidates || [])
      .filter((c: any) => !askedIdSet.has(c.id))
      // Soft cross-attempt exclusion; keep but mark for penalty if present
      .map((c: any) => ({ ...c, _seenRecently: recentIdSet.has(c.id) }));

    console.log("candidate_pool_primary", {
      attempt_id: attemptId,
      raw_count: (candidates || []).length,
      filtered_count: filteredPrimary.length,
      asked_excluded: askedIdSet.size,
      seen_recently_count: filteredPrimary.filter((c: any) => c._seenRecently).length,
      overrepresented_excluded: overrepresentedTopics,
      coding_required: !!criteria.coding_mode,
    });

    if (!filteredPrimary || filteredPrimary.length === 0) {
      console.warn("No candidates found with preferred criteria, generating on-demand MCQ");

      // Track retry attempts
      let generationAttempts = 0;
      const maxAttempts = 3; // Initial attempt + 2 retries
      let lastError: any = null;

      const baseAvoidTopics = [...overrepresentedTopics];

      while (generationAttempts < maxAttempts) {
        generationAttempts++;
        console.log(`Generation attempt ${generationAttempts}/${maxAttempts}`);

        try {
          // Retrieve relevant context from interview content
          // Coverage-aware topic selection for generation fallback using dynamic ontology
          let topicsUniverse: string[] = [];
          let topicUniverseSource: string = "ontology";
          try {
            topicsUniverse = getStaticTopicList();
          } catch (_) {
            topicsUniverse = [];
          }
          // Fallbacks: use current distribution topics, then hardcoded list
          if (!topicsUniverse || topicsUniverse.length === 0) {
            const allTopicsForWeights = Object.keys(distributions.topic_distribution);
            topicsUniverse = allTopicsForWeights.length > 0 ? allTopicsForWeights : [];
            topicUniverseSource = allTopicsForWeights.length > 0 ? "distribution" : "hardcoded";
          }

          const weightMap = calculateCoverageWeights(distributions.topic_distribution, topicsUniverse, 1);
          const topicWeights = topicsUniverse.map((t) => weightMap[t] || 1);
          const topicIdx = weightedRandomIndex(topicWeights);
          const coverageAwareTopic = topicsUniverse[topicIdx] || "React";
          const contextTopic = criteria.preferred_topic || coverageAwareTopic;

          console.log("generation_fallback_topic_selection", {
            attempt_id: attemptId,
            topic_universe_source: topicUniverseSource,
            topics_universe: topicsUniverse,
            weights: topicWeights,
            selected_topic: coverageAwareTopic,
            llm_preferred_topic: criteria.preferred_topic || null,
            context_topic: contextTopic,
          });

          // Use ontology cache to find available subtopics for this topic
          const subtopicsByTopic = getStaticSubtopicMap();
          const topicSubtopicsSet = new Set<string>(subtopicsByTopic[contextTopic] || []);

          // Try to match LLM's preferred subtopics with actual DB subtopics
          let contextSubtopic: string | null = null;
          if (criteria.preferred_subtopic) {
            // Check for exact match or partial match
            const match = Array.from(topicSubtopicsSet).find(
              (dbSubtopic) =>
                dbSubtopic === criteria.preferred_subtopic ||
                dbSubtopic.toLowerCase().includes(criteria.preferred_subtopic.toLowerCase()) ||
                criteria.preferred_subtopic.toLowerCase().includes(dbSubtopic.toLowerCase())
            );
            if (match) {
              contextSubtopic = match;
            }
          }

          // If no match, pick a random subtopic from available ones for variety
          if (!contextSubtopic && topicSubtopicsSet.size > 0) {
            const subtopicsArray = Array.from(topicSubtopicsSet);
            contextSubtopic = subtopicsArray[Math.floor(Math.random() * subtopicsArray.length)];
          }

          // Build a meaningful query text for semantic search
          let queryText = "";
          if (contextSubtopic) {
            // Use the actual subtopic from DB (e.g., "Hooks: useState" or "Functions & Higher-Order Functions")
            queryText = contextSubtopic;

            // If coding mode, add terms that bias toward code-heavy content
            if (criteria.coding_mode) {
              queryText += " code example implementation syntax";
            } else {
              queryText += " explanation concepts";
            }
          } else {
            // Fallback: generic query for the topic
            queryText = `${contextTopic} fundamentals`;
            if (criteria.coding_mode) {
              queryText += " code examples";
            }
          }

          console.log("retrieval_generation", {
            attempt_id: attemptId,
            topic: contextTopic,
            subtopic: contextSubtopic,
            query_text: queryText,
            available_subtopics_sample: Array.from(topicSubtopicsSet).slice(0, 10),
          });

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

          if (contextError) {
            console.error("Error retrieving context:", contextError);
            return NextResponse.json({ error: "Failed to retrieve context for question generation." }, { status: 500 });
          }

          if (!contextItems || contextItems.length === 0) {
            return NextResponse.json({ error: "No relevant content found for question generation." }, { status: 503 });
          }

          // Convert context items to format expected by generateMcqFromContext
          const contextForGeneration = contextItems.map((item: any) => ({
            title: item.title,
            url: `${item.bucket}/${item.path}`,
            content: item.content,
          }));

          // Build negative examples from recent attempt questions to reduce duplicates (last 20)
          let negativeExamples: string[] = asked
            .slice(-20)
            .map((q: any) => String(q?.mcq_items?.question || ""))
            .filter((s: string) => s.length > 0);

          // Compute avoid lists with relaxation based on attempt number (soft constraints)
          const relaxationLevel = Math.max(0, generationAttempts - 1);
          const avoidTopicsForAttempt =
            relaxationLevel >= baseAvoidTopics.length
              ? []
              : baseAvoidTopics.slice(0, baseAvoidTopics.length - relaxationLevel);
          const avoidSubtopicsForAttempt: string[] = [];

          try {
            console.log("generation_avoid_lists_applied", {
              attempt_id: attemptId,
              generation_attempt: generationAttempts,
              relaxation_level: relaxationLevel,
              avoid_topics: avoidTopicsForAttempt,
              avoid_subtopics: avoidSubtopicsForAttempt,
            });
          } catch (_) {
            // no-op for logging failures
          }

          if (relaxationLevel > 0) {
            try {
              console.log("generation_avoid_lists_relaxed", {
                attempt_id: attemptId,
                generation_attempt: generationAttempts,
                relaxation_level: relaxationLevel,
                base_avoid_topics: baseAvoidTopics,
                adjusted_avoid_topics: avoidTopicsForAttempt,
              });
            } catch (_) {
              // ignore logging errors
            }
          }

          // Generate MCQ using retrieved context
          const { generateMcqFromContext } = await import("@/services/ai.services");
          let generatedMcq = await generateMcqFromContext({
            topic: contextTopic,
            subtopic: contextSubtopic,
            difficulty: criteria.difficulty as EDifficulty,
            bloomLevel: criteria.preferred_bloom_level || EBloomLevel.UNDERSTAND,
            contextItems: contextForGeneration,
            codingMode: criteria.coding_mode,
            negativeExamples,
            avoidTopics: avoidTopicsForAttempt,
            avoidSubtopics: avoidSubtopicsForAttempt,
          });

          // Compute content key for deduplication
          let contentKey = computeMcqContentKey(generatedMcq);

          if (askedContentKeySet.has(contentKey)) {
            console.warn("generation_similarity_gate_hit", {
              attempt_id: attemptId,
              reason: "content_key_match_in_attempt",
              subtopic: generatedMcq.subtopic,
            });

            negativeExamples = [...negativeExamples, generatedMcq.question].slice(-25);

            const subtopicsByTopic = getStaticSubtopicMap();
            const topicSubs = subtopicsByTopic[contextTopic] || [];
            const blocked = new Set<string>([generatedMcq.subtopic]);
            const altSubs = topicSubs.filter((s: string) => !blocked.has(s));
            if (altSubs.length > 0) {
              contextSubtopic = altSubs[Math.floor(Math.random() * altSubs.length)];
            }

            try {
              console.log("generation_relaxation_event", {
                attempt_id: attemptId,
                action: "retry_after_content_key_match",
                new_subtopic: contextSubtopic,
              });
            } catch (_) {
              // ignore logging failures
            }

            if (generationAttempts < maxAttempts) {
              continue;
            }
          }

          // Neighbor similarity check (embedding-based) before assignment
          try {
            const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);
            const { data: neighborRows } = await supabase.rpc("retrieval_mcq_neighbors", {
              p_user_id: userId,
              p_topic: contextTopic,
              p_embedding: mcqEmbedding as unknown as any,
              p_subtopic: contextSubtopic,
              p_topk: 8,
            });
            const neighborScores: Array<{ question: string; score: number }> = (neighborRows ?? []).map((r: any) => ({
              question: String(r?.question || ""),
              score: Number(r?.score || 0),
            }));
            // Attempt-level similarity logging handled after this block
            const topNeighbor = neighborScores[0];
            if (topNeighbor && topNeighbor.score >= 0.92) {
              console.warn("generation_similarity_gate_hit", {
                attempt_id: attemptId,
                reason: "neighbor_similarity_high",
                top_score: topNeighbor.score,
                conflicted_question_id: topNeighbor?.question ?? null,
              });
              // Add this question gist to negatives and retry with alternative subtopic if available
              negativeExamples = [...negativeExamples, generatedMcq.question].slice(-25);
              const subtopicsByTopic = getStaticSubtopicMap();
              const topicSubs = subtopicsByTopic[contextTopic] || [];
              const blocked = new Set<string>([generatedMcq.subtopic]);
              const altSubs = topicSubs.filter((s: string) => !blocked.has(s));
              if (altSubs.length > 0) {
                contextSubtopic = altSubs[Math.floor(Math.random() * altSubs.length)];
              }
              try {
                console.log("generation_relaxation_event", {
                  attempt_id: attemptId,
                  action: "retry_after_neighbor_hit",
                  new_subtopic: contextSubtopic,
                  top_neighbor_score: topNeighbor.score,
                  conflicted_question_id: topNeighbor?.question ?? null,
                });
              } catch (_) {
                // ignore logging errors
              }
              if (generationAttempts < maxAttempts) {
                continue; // retry
              }
            }
            try {
              console.log("generation_similarity_metrics", {
                attempt_id: attemptId,
                neighbor_top_scores: neighborScores.slice(0, 5).map((n) => n.score),
                phase: "candidate_neighbors",
              });
            } catch (_) {
              // ignore logging issues
            }
          } catch (e: any) {
            console.warn("neighbor_similarity_check_failed", { message: e?.message || String(e) });
          }

          // Pre-assign similarity gate: compare against asked-in-attempt embeddings
          try {
            const askedEmbeddings: number[][] = [];
            const askedMcqEmbeddings: Array<{ id: string; vector: number[] }> = [];
            const askedQuestions: Array<{ id: string; question: string; topic: string; subtopic: string }> = [];

            for (const entry of asked) {
              const mcqItem = Array.isArray(entry?.mcq_items) ? entry.mcq_items[0] : entry?.mcq_items;
              const vector = toNumericVector(mcqItem?.embedding);
              if (vector) {
                askedEmbeddings.push(vector);
                askedMcqEmbeddings.push({ id: entry.question_id, vector });
              }
              // Always collect question text for text-based similarity fallback
              if (mcqItem?.question) {
                askedQuestions.push({
                  id: entry.question_id,
                  question: mcqItem.question,
                  topic: mcqItem.topic || "",
                  subtopic: mcqItem.subtopic || "",
                });
              }
            }

            let similarityCheckPassed = true;
            let similarityReason = "";

            // Check 1: Embedding-based similarity (if embeddings available)
            if (askedEmbeddings.length > 0) {
              const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);
              const similarityScores = askedEmbeddings.map((vector) => cosineSimilarity(vector, mcqEmbedding));
              const topSimilarity = similarityScores.length ? Math.max(...similarityScores) : 0;

              try {
                console.log("generation_similarity_metrics", {
                  attempt_id: attemptId,
                  similarity_scores: similarityScores.slice(0, 5),
                  phase: "attempt_similarity_embedding",
                  embeddings_available: askedEmbeddings.length,
                  total_asked: asked.length,
                });
              } catch (_) {
                // ignore logging errors
              }

              if (topSimilarity >= ATTEMPT_SIMILARITY_THRESHOLD) {
                const topIndex = similarityScores.findIndex((score) => score === topSimilarity);
                const conflicted = askedMcqEmbeddings[topIndex];

                console.warn("generation_similarity_gate_hit", {
                  attempt_id: attemptId,
                  reason: "attempt_similarity_high_embedding",
                  top_score: topSimilarity,
                  conflicted_question_id: conflicted?.id ?? null,
                });

                similarityCheckPassed = false;
                similarityReason = `embedding_similarity_${topSimilarity}`;
              }
            }

            // Check 2: Text-based similarity fallback (for questions without embeddings)
            if (similarityCheckPassed && askedQuestions.length > 0) {
              const generatedQuestionText = generatedMcq.question.toLowerCase().trim();
              const generatedTopic = generatedMcq.topic.toLowerCase();
              const generatedSubtopic = (generatedMcq.subtopic || "").toLowerCase();

              // Check for exact or very similar question text
              for (const askedQ of askedQuestions) {
                const askedQuestionText = askedQ.question.toLowerCase().trim();
                const askedTopic = askedQ.topic.toLowerCase();
                const askedSubtopic = askedQ.subtopic.toLowerCase();

                // Check for exact text match
                if (askedQuestionText === generatedQuestionText) {
                  console.warn("generation_similarity_gate_hit", {
                    attempt_id: attemptId,
                    reason: "attempt_similarity_exact_text_match",
                    conflicted_question_id: askedQ.id,
                    asked_question: askedQuestionText.substring(0, 100),
                    generated_question: generatedQuestionText.substring(0, 100),
                  });
                  similarityCheckPassed = false;
                  similarityReason = "exact_text_match";
                  break;
                }

                // Check for high text similarity (same topic/subtopic + similar text)
                if (askedTopic === generatedTopic && askedSubtopic === generatedSubtopic) {
                  // Simple text similarity check
                  const words1 = new Set(generatedQuestionText.split(/\s+/));
                  const words2 = new Set(askedQuestionText.split(/\s+/));
                  const intersection = new Set([...words1].filter((x) => words2.has(x)));
                  const union = new Set([...words1, ...words2]);
                  const jaccardSimilarity = intersection.size / union.size;

                  if (jaccardSimilarity > 0.7) {
                    // Lower threshold for text similarity
                    console.warn("generation_similarity_gate_hit", {
                      attempt_id: attemptId,
                      reason: "attempt_similarity_high_text_similarity",
                      jaccard_similarity: jaccardSimilarity,
                      conflicted_question_id: askedQ.id,
                      topic: askedTopic,
                      subtopic: askedSubtopic,
                    });
                    similarityCheckPassed = false;
                    similarityReason = `text_similarity_${jaccardSimilarity}`;
                    break;
                  }
                }
              }
            }

            // If similarity check failed, retry with different subtopic
            if (!similarityCheckPassed) {
              negativeExamples = [...negativeExamples, generatedMcq.question].slice(-25);

              const subtopicsByTopic = getStaticSubtopicMap();
              const topicSubs = subtopicsByTopic[contextTopic] || [];
              const blocked = new Set<string>([generatedMcq.subtopic]);
              const altSubs = topicSubs.filter((s: string) => !blocked.has(s));
              if (altSubs.length > 0) {
                contextSubtopic = altSubs[Math.floor(Math.random() * altSubs.length)];
              }

              try {
                console.log("generation_relaxation_event", {
                  attempt_id: attemptId,
                  action: "retry_after_attempt_similarity",
                  new_subtopic: contextSubtopic,
                  similarity_reason: similarityReason,
                  embeddings_available: askedEmbeddings.length,
                  text_questions_checked: askedQuestions.length,
                });
              } catch (_) {
                // ignore logging errors
              }

              if (generationAttempts < maxAttempts) {
                continue;
              }
            }
          } catch (attemptSimilarityError: any) {
            console.warn("attempt_similarity_check_failed", {
              message: attemptSimilarityError?.message || String(attemptSimilarityError),
            });
          }

          // Persist generated MCQ to database for future reuse
          const [mcqEmbedding] = await getEmbeddings([buildMcqEmbeddingText(generatedMcq)]);

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

          // If saved successfully and has explanation, save to mcq_explanations table
          if (savedMcq?.id && generatedMcq.explanation) {
            await supabase.from("mcq_explanations").insert({
              mcq_id: savedMcq.id,
              explanation: generatedMcq.explanation,
              user_id: userId,
            });
          }

          // Handle duplicate content key by finding existing MCQ
          let questionId = savedMcq?.id;
          if (saveError && saveError.code === "23505") {
            // unique_violation
            console.log("question_generated_duplicate", {
              attempt_id: attemptId,
              reason: "content_key_conflict",
            });
            // Find the existing MCQ by content key
            const { data: existingMcq } = await supabase
              .from("mcq_items")
              .select("id")
              .eq("content_key", contentKey)
              .single();

            if (existingMcq) {
              questionId = existingMcq.id;
            }
          } else if (saveError) {
            console.error(`Failed to save generated MCQ (attempt ${generationAttempts}/${maxAttempts}):`, saveError);
            lastError = saveError;
            // Don't return yet, allow retry
            if (generationAttempts < maxAttempts) {
              console.log("Retrying with relaxed criteria...");
              continue; // Retry loop
            }
            // Max attempts reached, return error
            break;
          }

          // Ensure we have a valid question ID before proceeding
          if (!questionId) {
            console.error(`Failed to obtain question ID (attempt ${generationAttempts}/${maxAttempts})`);
            lastError = new Error("No question ID after save");
            if (generationAttempts < maxAttempts) {
              console.log("Retrying generation...");
              continue; // Retry loop
            }
            // Max attempts reached
            break;
          }

          // SUCCESS! Assign generated question to attempt (idempotent)
          const nextOrder = nextQuestionOrder;

          const { error: genAssignErr } = await supabase.from("attempt_questions").insert({
            attempt_id: attemptId,
            question_id: questionId,
            question_order: nextOrder,
          });

          if (genAssignErr && genAssignErr.code !== "23505") {
            console.error("Error assigning generated question:", genAssignErr);
            return NextResponse.json({ error: "Failed to assign question" }, { status: 500 });
          }

          // If a parallel request won the race, read back the canonical question
          const { data: assignedRow } = await supabase
            .from("attempt_questions")
            .select("question_id")
            .eq("attempt_id", attemptId)
            .eq("question_order", nextOrder)
            .single();

          const finalQuestionId = assignedRow?.question_id ?? questionId;

          // If another question got assigned, fetch its details for response
          let finalPayload = {
            id: questionId,
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
          } as any;

          if (finalQuestionId !== questionId) {
            const { data: assignedMcq } = await supabase
              .from("mcq_items")
              .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
              .eq("id", finalQuestionId)
              .single();
            if (assignedMcq) {
              finalPayload = {
                id: assignedMcq.id,
                question: assignedMcq.question,
                options: assignedMcq.options,
                code: assignedMcq.code || null,
                metadata: {
                  topic: assignedMcq.topic,
                  subtopic: assignedMcq.subtopic,
                  difficulty: assignedMcq.difficulty,
                  bloom_level: assignedMcq.bloom_level,
                  question_order: nextOrder,
                  coding_mode: !!assignedMcq.code,
                },
              } as any;
            }
          }

          console.log("question_selected", {
            attempt_id: attempt.id,
            method: "generated_on_demand",
            question_id: finalQuestionId,
            order: nextOrder,
            topic: finalPayload.metadata.topic,
            subtopic: finalPayload.metadata.subtopic,
          });

          return NextResponse.json({
            attempt: {
              id: attempt.id,
              status: attempt.status,
              questions_answered: attempt.questions_answered,
              correct_count: attempt.correct_count,
              total_questions: attempt.total_questions,
            },
            next_question: finalPayload,
          });
        } catch (generationError: any) {
          console.error(
            `Error generating on-demand MCQ (attempt ${generationAttempts}/${maxAttempts}):`,
            generationError
          );
          lastError = generationError;
          if (generationAttempts < maxAttempts) {
            console.log("Retrying after generation error...");
            continue; // Retry loop
          }
          // Max attempts reached
          break;
        }
      } // End while loop

      // If we get here, all retry attempts failed
      console.error("All generation attempts failed:", lastError);
      return NextResponse.json(
        {
          error: "Unable to generate question after multiple attempts.",
          message: "The system tried to generate a question but encountered issues. This has been logged for review.",
          suggestion: "Please try refreshing the page or contact support if the issue persists.",
          details: lastError?.message || "Unknown error",
          canRetry: true,
        },
        { status: 503 } // Service Unavailable (temporary)
      );
    }

    // Extract embeddings from already asked questions for similarity comparison
    const askedEmbeddings: number[][] = [];
    const askedMcqEmbeddings: Array<{ id: string; vector: number[] }> = [];
    for (const entry of asked) {
      const mcqItem = Array.isArray(entry?.mcq_items) ? entry.mcq_items[0] : entry?.mcq_items;
      const vector = toNumericVector(mcqItem?.embedding);
      if (vector) {
        askedEmbeddings.push(vector);
        askedMcqEmbeddings.push({ id: entry.question_id, vector });
      }
    }

    // Apply neighbor similarity checks to bank candidates
    const candidatesWithSimilarity = await Promise.all(
      filteredPrimary.map(async (candidate: any) => {
        let similarityPenalty = 0;
        let similarityMetrics: any = {};

        try {
          // Check similarity against questions already asked in this attempt
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

              if (topSimilarity >= BANK_SIMILARITY_THRESHOLD_HIGH) {
                similarityPenalty += BANK_SIMILARITY_PENALTY_HIGH; // Strong penalty for high similarity to attempt questions
                console.warn("bank_similarity_gate_hit", {
                  attempt_id: attemptId,
                  candidate_id: candidate.id,
                  reason: "attempt_similarity_high",
                  top_score: topSimilarity,
                  topic: candidate.topic,
                  subtopic: candidate.subtopic,
                });
              } else if (topSimilarity >= BANK_SIMILARITY_THRESHOLD_MEDIUM) {
                similarityPenalty += BANK_SIMILARITY_PENALTY_MEDIUM; // Moderate penalty for medium similarity
              }
            }
          }

          // Check similarity against recent questions from other attempts using neighbor retrieval
          try {
            const candidateEmbedding = toNumericVector(candidate.embedding);
            if (candidateEmbedding) {
              const { data: neighborRows } = await supabase.rpc("retrieval_mcq_neighbors", {
                p_user_id: userId,
                p_topic: candidate.topic,
                p_embedding: candidateEmbedding as unknown as any,
                p_subtopic: candidate.subtopic,
                p_topk: 5,
              });

              const neighborScores: Array<{ question: string; score: number }> = (neighborRows ?? []).map((r: any) => ({
                question: String(r?.question || ""),
                score: Number(r?.score || 0),
              }));

              similarityMetrics.neighbor_similarity = {
                scores: neighborScores.slice(0, 3).map((n) => n.score),
                top_score: neighborScores[0]?.score || 0,
              };

              const topNeighbor = neighborScores[0];
              if (topNeighbor && topNeighbor.score >= BANK_SIMILARITY_THRESHOLD_HIGH) {
                similarityPenalty += BANK_NEIGHBOR_PENALTY_HIGH; // Penalty for high similarity to existing questions
                console.warn("bank_similarity_gate_hit", {
                  attempt_id: attemptId,
                  candidate_id: candidate.id,
                  reason: "neighbor_similarity_high",
                  top_score: topNeighbor.score,
                  topic: candidate.topic,
                  subtopic: candidate.subtopic,
                });
              } else if (topNeighbor && topNeighbor.score >= BANK_SIMILARITY_THRESHOLD_MEDIUM) {
                similarityPenalty += BANK_NEIGHBOR_PENALTY_MEDIUM; // Moderate penalty for medium neighbor similarity
              }
            }
          } catch (neighborError: any) {
            console.warn("bank_neighbor_similarity_check_failed", {
              message: neighborError?.message || String(neighborError),
              candidate_id: candidate.id,
            });
          }
        } catch (e: any) {
          console.warn("bank_similarity_check_failed", {
            message: e?.message || String(e),
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

    // Log similarity metrics for top candidates
    const topCandidatesForLogging = candidatesWithSimilarity
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 5);

    console.log("bank_similarity_metrics", {
      attempt_id: attemptId,
      total_candidates: candidatesWithSimilarity.length,
      top_candidates_similarity: topCandidatesForLogging.map((c) => ({
        id: c.id,
        topic: c.topic,
        subtopic: c.subtopic,
        similarity_penalty: c.similarityPenalty,
        attempt_similarity_top: c.similarityMetrics?.attempt_similarity?.top_score || 0,
        neighbor_similarity_top: c.similarityMetrics?.neighbor_similarity?.top_score || 0,
      })),
    });

    // Score candidates based on preferences
    // Score over defensively filtered candidates with similarity penalties
    const scoredCandidates = candidatesWithSimilarity.map((candidate: any) => {
      let score = 0;

      // Topic preference (soft): boost if in preferred_topics
      if (criteria.preferred_topic === candidate.topic) score += 50;

      // Subtopic preference (soft)
      if (criteria.preferred_subtopic === candidate.subtopic) score += 30;

      // Bloom preference (soft)
      if (criteria.preferred_bloom_level.toString() === candidate.bloom_level) score += 20;

      // Coding match boost
      if (criteria.coding_mode && candidate.code) score += 40;

      // Overrepresentation penalty by dynamic cap (stage-based): early(<=20):30%, mid(<=40):35%, late:40%
      const answered = attempt.questions_answered;
      const stageCap = answered <= 20 ? 18 : answered <= 40 ? 24 : 24; // 60 * 0.3=18, 0.4 cap modeled via exclusion above; mid 35% not hard-removed but penalized
      const topicCount = distributions.topic_distribution[candidate.topic] || 0;
      if (answered <= 20 && topicCount >= 18) score -= 40; // early strict
      else if (answered <= 40 && topicCount >= 21) score -= 25; // mid softer (≈35%)

      // Cross-attempt freshness penalty (soft)
      if (candidate._seenRecently) score -= 15;

      // Apply similarity penalty from neighbor similarity checks
      score -= candidate.similarityPenalty || 0;

      return { ...candidate, score };
    });

    // Sort by score and try candidates in order; if a duplicate (23505) occurs due to
    // unique (attempt_id, question_id), pick the next candidate.
    scoredCandidates.sort((a, b) => b.score - a.score);

    const nextOrder = attempt.questions_answered + 1;
    let final: any | null = null;

    // Stochastic top-K selection (K=8) with score-proportional probabilities
    const K = Math.min(8, scoredCandidates.length);
    const topK = scoredCandidates.slice(0, K);
    const weights = topK.map((c) => Math.max(1, c.score));
    const chosenIdx = weightedRandomIndex(weights);
    const selectionOrder = [
      // Try chosen first, then fallback through remaining topK
      ...topK.slice(chosenIdx, chosenIdx + 1),
      ...topK.slice(0, chosenIdx),
      ...scoredCandidates.slice(K),
    ];

    console.log("candidate_pool_scored", {
      attempt_id: attemptId,
      total_candidates: scoredCandidates.length,
      top_k: K,
      top_k_summary: topK.map((c) => ({
        id: c.id,
        topic: c.topic,
        subtopic: c.subtopic,
        score: c.score,
        seen_recently: c._seenRecently,
        similarity_penalty: c.similarityPenalty || 0,
        attempt_similarity_top: c.similarityMetrics?.attempt_similarity?.top_score || 0,
        neighbor_similarity_top: c.similarityMetrics?.neighbor_similarity?.top_score || 0,
      })),
      weights,
      chosen_index: chosenIdx,
    });

    for (let i = 0; i < selectionOrder.length; i++) {
      const candidate = selectionOrder[i];

      // CRITICAL FIX: Add retry logic for question assignment to prevent gaps
      let assignSuccess = false;
      let assignError: any = null;
      const maxRetries = 3;

      for (let retry = 0; retry < maxRetries; retry++) {
        const { error: assignErrorAttempt } = await supabase.from("attempt_questions").insert({
          attempt_id: attemptId,
          question_id: candidate.id,
          question_order: nextOrder,
        });

        if (!assignErrorAttempt) {
          assignSuccess = true;
          break;
        }

        assignError = assignErrorAttempt;

        // If it's a unique constraint violation, check if another question was assigned
        if (assignError.code === "23505") {
          const { data: existingRow } = await supabase
            .from("attempt_questions")
            .select("question_id")
            .eq("attempt_id", attemptId)
            .eq("question_order", nextOrder)
            .single();

          if (existingRow?.question_id) {
            const { data: existingMcq } = await supabase
              .from("mcq_items")
              .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
              .eq("id", existingRow.question_id)
              .single();

            if (existingMcq) {
              final = existingMcq as any;
              assignSuccess = true;
              console.log("question_selected", {
                attempt_id: attempt.id,
                method: "bank_existing_order",
                question_id: existingMcq.id,
                order: nextOrder,
                topic: (existingMcq as any).topic,
                subtopic: (existingMcq as any).subtopic,
              });
              break;
            }
          }
          // If we couldn't load the existing question, continue to next candidate
          break;
        }

        // For other errors, retry with exponential backoff
        if (retry < maxRetries - 1) {
          const delay = Math.pow(2, retry) * 100; // 100ms, 200ms, 400ms
          console.warn("question_assignment_retry", {
            attempt_id: attemptId,
            candidate_id: candidate.id,
            order: nextOrder,
            retry: retry + 1,
            max_retries: maxRetries,
            error: assignError.message,
            delay_ms: delay,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      if (assignSuccess) {
        // Success — read back canonical assignment
        const { data: assignedRow } = await supabase
          .from("attempt_questions")
          .select("question_id")
          .eq("attempt_id", attemptId)
          .eq("question_order", nextOrder)
          .single();

        let selectedForResponse = candidate;
        if (assignedRow && assignedRow.question_id && assignedRow.question_id !== candidate.id) {
          const { data: assignedMcq } = await supabase
            .from("mcq_items")
            .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
            .eq("id", assignedRow.question_id)
            .single();
          if (assignedMcq) selectedForResponse = assignedMcq as any;
        }

        final = selectedForResponse;
        console.log("question_selected", {
          attempt_id: attemptId,
          method: "bank_topK",
          question_id: selectedForResponse.id,
          order: nextOrder,
          topic: (selectedForResponse as any).topic,
          subtopic: (selectedForResponse as any).subtopic,
        });
        break;
      }

      // If all retries failed, log the error but continue to next candidate
      console.error("question_assignment_failed_after_retries", {
        attempt_id: attemptId,
        candidate_id: candidate.id,
        order: nextOrder,
        max_retries: maxRetries,
        final_error: assignError?.message || "Unknown error",
      });
    }

    // CRITICAL FALLBACK: If no question was assigned after trying all candidates,
    // assign any available question to prevent gaps
    if (!final) {
      console.warn("no_question_assigned_fallback", {
        attempt_id: attemptId,
        order: nextOrder,
        candidates_tried: selectionOrder.length,
        action: "assigning_fallback_question",
      });

      // Get any available question as fallback
      const { data: fallbackMcq } = await supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .limit(1)
        .single();

      if (fallbackMcq) {
        const { error: fallbackError } = await supabase.from("attempt_questions").insert({
          attempt_id: attemptId,
          question_id: fallbackMcq.id,
          question_order: nextOrder,
        });

        if (!fallbackError) {
          final = fallbackMcq as any;
          console.log("question_selected", {
            attempt_id: attemptId,
            method: "fallback_assignment",
            question_id: fallbackMcq.id,
            order: nextOrder,
            topic: (fallbackMcq as any).topic,
            subtopic: (fallbackMcq as any).subtopic,
          });
        } else {
          console.error("fallback_assignment_failed", {
            attempt_id: attemptId,
            order: nextOrder,
            error: fallbackError.message,
          });
        }
      }
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        status: attempt.status,
        questions_answered: attempt.questions_answered,
        correct_count: attempt.correct_count,
        total_questions: attempt.total_questions,
      },
      next_question: {
        id: final.id,
        question: final.question,
        options: final.options,
        code: final.code || null,
        metadata: {
          topic: final.topic,
          subtopic: final.subtopic,
          difficulty: final.difficulty,
          bloom_level: final.bloom_level,
          question_order: nextOrder,
          coding_mode: !!final.code,
        },
      },
    });
  } catch (err: any) {
    console.error("Unexpected error in GET /api/evaluate/attempts/:id:", err);
    return NextResponse.json({ error: "Internal server error", message: err?.message }, { status: 500 });
  }
}

/**
 * PATCH /api/evaluate/attempts/:id
 * Pauses and saves current attempt state.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId) return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action !== "pause") {
      return NextResponse.json({ error: "Invalid action. Only 'pause' is supported." }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    // Fetch attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("user_attempts")
      .select("metadata")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Update metadata
    const metadata = attempt.metadata || {};
    const pauseCount = (metadata.pause_count || 0) + 1;

    const { error: updateError } = await supabase
      .from("user_attempts")
      .update({
        metadata: {
          ...metadata,
          pause_count: pauseCount,
          last_session_at: new Date().toISOString(),
        },
      })
      .eq("id", attemptId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Error pausing attempt:", updateError);
      return NextResponse.json({ error: "Failed to pause attempt" }, { status: 500 });
    }

    return NextResponse.json({
      status: EAttemptStatus.InProgress,
      message: "Attempt paused. Resume anytime.",
    });
  } catch (err: any) {
    console.error("Unexpected error in PATCH /api/evaluate/attempts/:id:", err);
    return NextResponse.json({ error: "Internal server error", message: err?.message }, { status: 500 });
  }
}
