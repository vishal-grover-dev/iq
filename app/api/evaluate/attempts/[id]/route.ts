import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { selectNextQuestion, getEmbeddings } from "@/services/ai.services";
import { EAttemptStatus } from "@/types/evaluate.types";
import { EDifficulty, EBloomLevel } from "@/types/mcq.types";
import { computeMcqContentKey } from "@/utils/mcq.utils";

export const runtime = "nodejs";

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
        mcq_items!inner(
          topic,
          subtopic,
          difficulty,
          bloom_level,
          code
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

        // Recent subtopics (last 5)
        if (subtopic) {
          acc.recent_subtopics.push(subtopic);
        }

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
        recent_subtopics: [] as string[],
      }
    );

    const recent_subtopics = distributions.recent_subtopics.slice(-5);
    const asked_question_ids = asked.map((q: any) => q.question_id);

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
      recent_subtopics,
    });

    // Identify overrepresented topics (>= 40% of total = 24)
    const topicLimit = 24;
    const overrepresentedTopics = Object.keys(distributions.topic_distribution).filter(
      (t) => (distributions.topic_distribution[t] || 0) >= topicLimit
    );

    // Query MCQ bank with LLM criteria
    let query = supabase
      .from("mcq_items")
      .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
      .eq("difficulty", criteria.difficulty);

    // Exclude already asked questions (use proper PostgREST in-list formatting for UUIDs)
    if (asked_question_ids.length > 0) {
      const idList = `(${asked_question_ids.join(",")})`;
      query = query.not("id", "in", idList);
    }

    // Filter by coding mode
    if (criteria.coding_mode) {
      query = query.not("code", "is", null);
    }

    // Prefer topics from LLM
    if (criteria.preferred_topics.length > 0) {
      query = query.in("topic", criteria.preferred_topics);
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
    if (!candidates || candidates.length === 0) {
      console.warn("No candidates found with preferred criteria, trying relaxed query");

      let relaxedQuery = supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .eq("difficulty", criteria.difficulty);

      if (asked_question_ids.length > 0) {
        const idList = `(${asked_question_ids.join(",")})`;
        relaxedQuery = relaxedQuery.not("id", "in", idList);
      }

      if (criteria.coding_mode) {
        relaxedQuery = relaxedQuery.not("code", "is", null);
      }

      // Exclude topics that already exceeded balance limit in relaxed query as well
      if (overrepresentedTopics.length > 0) {
        const quotedTopics = overrepresentedTopics.map((t) => `"${t}"`).join(",");
        relaxedQuery = relaxedQuery.not("topic", "in", `(${quotedTopics})`);
      }

      relaxedQuery = relaxedQuery.limit(20);

      const { data: relaxedCandidates } = await relaxedQuery;

      if (relaxedCandidates && relaxedCandidates.length > 0) {
        // Select random question from relaxed candidates
        const selected = relaxedCandidates[Math.floor(Math.random() * relaxedCandidates.length)];

        // Assign to attempt (idempotent on unique (attempt_id, question_order))
        const nextOrder = attempt.questions_answered + 1;
        const { error: insertErr } = await supabase.from("attempt_questions").insert({
          attempt_id: attemptId,
          question_id: selected.id,
          question_order: nextOrder,
        });

        // Treat unique violation as success due to parallel prefetch/refetch
        if (insertErr && insertErr.code !== "23505") {
          console.error("Error assigning (relaxed) question:", insertErr);
          return NextResponse.json({ error: "Failed to assign question" }, { status: 500 });
        }

        // Read back the actually-assigned row to return the canonical question
        const { data: assignedRow } = await supabase
          .from("attempt_questions")
          .select("question_id")
          .eq("attempt_id", attemptId)
          .eq("question_order", nextOrder)
          .single();

        let final = selected;
        if (assignedRow && assignedRow.question_id && assignedRow.question_id !== selected.id) {
          const { data: assignedMcq } = await supabase
            .from("mcq_items")
            .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
            .eq("id", assignedRow.question_id)
            .single();
          if (assignedMcq) final = assignedMcq as any;
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
      }

      // If still no candidates, fall back to on-demand generation
      console.warn("No candidates found even with relaxed criteria, generating on-demand MCQ");

      // Track retry attempts
      let generationAttempts = 0;
      const maxAttempts = 2; // Initial attempt + 1 retry
      let lastError: any = null;

      while (generationAttempts < maxAttempts) {
        generationAttempts++;
        console.log(`Generation attempt ${generationAttempts}/${maxAttempts}`);

        try {
          // Retrieve relevant context from interview content
          const contextTopic = criteria.preferred_topics.length > 0 ? criteria.preferred_topics[0] : "React";

          // Query database to find actual subtopics available for this topic
          const { data: availableSubtopics } = await supabase
            .from("document_chunks")
            .select("labels")
            .not("labels", "is", null)
            .limit(100);

          // Extract and deduplicate subtopics for the selected topic
          const topicSubtopics = new Set<string>();
          availableSubtopics?.forEach((chunk: any) => {
            const labels = chunk.labels;
            if (labels?.topic === contextTopic && labels?.subtopic) {
              topicSubtopics.add(labels.subtopic);
            }
          });

          // Try to match LLM's preferred subtopics with actual DB subtopics
          let contextSubtopic: string | null = null;
          for (const preferred of criteria.preferred_subtopics) {
            // Check for exact match or partial match
            const match = Array.from(topicSubtopics).find(
              (dbSubtopic) =>
                dbSubtopic === preferred ||
                dbSubtopic.toLowerCase().includes(preferred.toLowerCase()) ||
                preferred.toLowerCase().includes(dbSubtopic.toLowerCase())
            );
            if (match) {
              contextSubtopic = match;
              break;
            }
          }

          // If no match, pick a random subtopic from available ones for variety
          if (!contextSubtopic && topicSubtopics.size > 0) {
            const subtopicsArray = Array.from(topicSubtopics);
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

          console.log("Retrieval for generation:", {
            topic: contextTopic,
            subtopic: contextSubtopic,
            queryText,
            availableSubtopicsForTopic: Array.from(topicSubtopics).slice(0, 10),
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

          // Generate MCQ using retrieved context
          const { generateMcqFromContext } = await import("@/services/ai.services");
          const generatedMcq = await generateMcqFromContext({
            topic: contextTopic,
            subtopic: contextSubtopic,
            difficulty: criteria.difficulty as EDifficulty,
            bloomLevel:
              criteria.preferred_bloom_levels.length > 0
                ? (criteria.preferred_bloom_levels[0] as EBloomLevel)
                : EBloomLevel.UNDERSTAND,
            contextItems: contextForGeneration,
            codingMode: criteria.coding_mode,
            negativeExamples: [], // Could be populated from recent questions if needed
          });

          // Compute content key for deduplication
          const contentKey = computeMcqContentKey(generatedMcq);

          // Persist generated MCQ to database for future reuse
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
              embedding: null, // Can be computed later if needed
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
            console.log("Generated MCQ already exists in database, finding existing version");
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
          const nextOrder = attempt.questions_answered + 1;

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

    // Score candidates based on preferences
    const scoredCandidates = candidates.map((candidate: any) => {
      let score = 0;

      // Prefer subtopics from LLM
      if (criteria.preferred_subtopics.includes(candidate.subtopic)) {
        score += 3;
      }

      // Prefer Bloom levels from LLM
      if (criteria.preferred_bloom_levels.map((b) => b.toString()).includes(candidate.bloom_level)) {
        score += 2;
      }

      // Avoid recent subtopics (clustering)
      if (recent_subtopics.includes(candidate.subtopic)) {
        score -= 2;
      }

      return { ...candidate, score };
    });

    // Sort by score and try candidates in order; if a duplicate (23505) occurs due to
    // unique (attempt_id, question_id), pick the next candidate.
    scoredCandidates.sort((a, b) => b.score - a.score);
    const nextOrder = attempt.questions_answered + 1;
    let final: any | null = null;
    for (let i = 0; i < scoredCandidates.length; i++) {
      const candidate = scoredCandidates[i];
      const { error: assignError } = await supabase.from("attempt_questions").insert({
        attempt_id: attemptId,
        question_id: candidate.id,
        question_order: nextOrder,
      });

      if (assignError) {
        if (assignError.code === "23505") {
          // Duplicate question for this attempt or race on order; try next candidate
          continue;
        }
        console.error("Error assigning question:", assignError);
        return NextResponse.json({ error: "Failed to assign question" }, { status: 500 });
      }

      // Success (or race handled below) — read back canonical assignment
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
      break;
    }

    if (!final) {
      // If all candidates failed due to duplicates, fall back to relaxed flow
      return NextResponse.json({ error: "No unique candidate available" }, { status: 503 });
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
