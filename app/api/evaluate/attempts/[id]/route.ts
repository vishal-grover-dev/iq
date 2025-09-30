import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { selectNextQuestion } from "@/services/ai.services";
import { EAttemptStatus } from "@/types/evaluate.types";
import { EDifficulty, EBloomLevel } from "@/types/mcq.types";

export const runtime = "nodejs";

/**
 * GET /api/evaluate/attempts/:id
 * Fetches attempt details with progress and next question.
 * Backend invokes LLM selector to determine optimal next question based on attempt context.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = params.id;
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

    // Query MCQ bank with LLM criteria
    let query = supabase
      .from("mcq_items")
      .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
      .eq("difficulty", criteria.difficulty);

    // Exclude already asked questions
    if (asked_question_ids.length > 0) {
      query = query.not("id", "in", `(${asked_question_ids.join(",")})`);
    }

    // Filter by coding mode
    if (criteria.coding_mode) {
      query = query.not("code", "is", null);
    }

    // Prefer topics from LLM
    if (criteria.preferred_topics.length > 0) {
      query = query.in("topic", criteria.preferred_topics);
    }

    // Limit results
    query = query.limit(20);

    const { data: candidates, error: candidatesError } = await query;

    if (candidatesError) {
      console.error("Error querying MCQ bank:", candidatesError);
      return NextResponse.json({ error: "Failed to query questions" }, { status: 500 });
    }

    // If no candidates found, try with relaxed criteria
    if (!candidates || candidates.length === 0) {
      console.warn("No candidates found with preferred criteria, trying relaxed query");

      let relaxedQuery = supabase
        .from("mcq_items")
        .select("id, topic, subtopic, difficulty, bloom_level, question, options, code")
        .eq("difficulty", criteria.difficulty);

      if (asked_question_ids.length > 0) {
        relaxedQuery = relaxedQuery.not("id", "in", `(${asked_question_ids.join(",")})`);
      }

      if (criteria.coding_mode) {
        relaxedQuery = relaxedQuery.not("code", "is", null);
      }

      relaxedQuery = relaxedQuery.limit(20);

      const { data: relaxedCandidates } = await relaxedQuery;

      if (!relaxedCandidates || relaxedCandidates.length === 0) {
        return NextResponse.json(
          { error: "Insufficient questions in bank. Please seed more questions." },
          { status: 503 }
        );
      }

      // Select random question from relaxed candidates
      const selected = relaxedCandidates[Math.floor(Math.random() * relaxedCandidates.length)];

      // Assign to attempt
      const nextOrder = attempt.questions_answered + 1;
      await supabase.from("attempt_questions").insert({
        attempt_id: attemptId,
        question_id: selected.id,
        question_order: nextOrder,
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
          id: selected.id,
          question: selected.question,
          options: selected.options,
          code: selected.code || null,
          metadata: {
            topic: selected.topic,
            subtopic: selected.subtopic,
            difficulty: selected.difficulty,
            bloom_level: selected.bloom_level,
            question_order: nextOrder,
            coding_mode: !!selected.code,
          },
        },
      });
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

    // Sort by score and select top candidate
    scoredCandidates.sort((a, b) => b.score - a.score);
    const selected = scoredCandidates[0];

    // Assign question to attempt
    const nextOrder = attempt.questions_answered + 1;
    const { error: assignError } = await supabase.from("attempt_questions").insert({
      attempt_id: attemptId,
      question_id: selected.id,
      question_order: nextOrder,
    });

    if (assignError) {
      console.error("Error assigning question:", assignError);
      return NextResponse.json({ error: "Failed to assign question" }, { status: 500 });
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
        id: selected.id,
        question: selected.question,
        options: selected.options,
        code: selected.code || null,
        metadata: {
          topic: selected.topic,
          subtopic: selected.subtopic,
          difficulty: selected.difficulty,
          bloom_level: selected.bloom_level,
          question_order: nextOrder,
          coding_mode: !!selected.code,
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
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = params.id;
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
