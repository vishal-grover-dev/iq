import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { EAttemptStatus } from "@/types/evaluate.types";

export const runtime = "nodejs";

/**
 * POST /api/evaluate/attempts/:id/answer
 * Submits user's answer for the current question.
 * Records answer silently without revealing correctness (no feedback until completion).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId) return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { question_id, user_answer_index, time_spent_seconds } = body;

    // Validate payload
    if (!question_id || typeof user_answer_index !== "number" || user_answer_index < 0 || user_answer_index > 3) {
      return NextResponse.json(
        { error: "Invalid payload. Required: question_id, user_answer_index (0-3)" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();

    // Fetch attempt to verify ownership and status
    const { data: attempt, error: attemptError } = await supabase
      .from("user_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    if (attempt.status !== EAttemptStatus.InProgress) {
      return NextResponse.json({ error: "Attempt is not in progress" }, { status: 400 });
    }

    // Fetch the question to get correct answer
    const { data: mcqItem, error: mcqError } = await supabase
      .from("mcq_items")
      .select("correct_index")
      .eq("id", question_id)
      .single();

    if (mcqError || !mcqItem) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Check if answer is correct (computed silently, not returned to user)
    const isCorrect = user_answer_index === mcqItem.correct_index;

    // Update attempt_questions with user's answer
    const { error: updateQuestionError } = await supabase
      .from("attempt_questions")
      .update({
        user_answer_index,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
        time_spent_seconds: time_spent_seconds || null,
      })
      .eq("attempt_id", attemptId)
      .eq("question_id", question_id);

    if (updateQuestionError) {
      console.error("Error updating question answer:", updateQuestionError);
      return NextResponse.json({ error: "Failed to record answer" }, { status: 500 });
    }

    // Update attempt counters
    const newQuestionsAnswered = attempt.questions_answered + 1;
    const newCorrectCount = attempt.correct_count + (isCorrect ? 1 : 0);
    const isComplete = newQuestionsAnswered >= attempt.total_questions;

    const updateData: any = {
      questions_answered: newQuestionsAnswered,
      correct_count: newCorrectCount,
    };

    // If attempt is now complete, update status and completion timestamp
    if (isComplete) {
      updateData.status = EAttemptStatus.Completed;
      updateData.completed_at = new Date().toISOString();
    }

    // Update metadata with session info
    const metadata = attempt.metadata || {};
    updateData.metadata = {
      ...metadata,
      last_session_at: new Date().toISOString(),
    };

    const { error: updateAttemptError } = await supabase
      .from("user_attempts")
      .update(updateData)
      .eq("id", attemptId)
      .eq("user_id", userId);

    if (updateAttemptError) {
      console.error("Error updating attempt:", updateAttemptError);
      return NextResponse.json({ error: "Failed to update attempt" }, { status: 500 });
    }

    // Return progress WITHOUT revealing correctness or score
    return NextResponse.json({
      recorded: true,
      progress: {
        questions_answered: newQuestionsAnswered,
        total_questions: attempt.total_questions,
        is_complete: isComplete,
      },
    });
  } catch (err: any) {
    console.error("Unexpected error in POST /api/evaluate/attempts/:id/answer:", err);
    return NextResponse.json({ error: "Internal server error", message: err?.message }, { status: 500 });
  }
}
