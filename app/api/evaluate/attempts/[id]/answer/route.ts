import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { EAttemptStatus, IUserAttempt } from "@/types/evaluate.types";
import { EVALUATE_API_ERROR_MESSAGES } from "@/constants/evaluate.constants";
import { logger } from "@/utils/logger.utils";

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
    if (!userId) return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId)
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_ID_REQUIRED }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const { question_id, user_answer_index, time_spent_seconds } = body;

    // Validate payload
    if (!question_id || typeof user_answer_index !== "number" || user_answer_index < 0 || user_answer_index > 3) {
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.INVALID_ANSWER_INDEX }, { status: 400 });
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
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_NOT_FOUND }, { status: 404 });
    }

    if (attempt.status !== EAttemptStatus.InProgress) {
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_ALREADY_COMPLETED }, { status: 400 });
    }

    // Fetch the question to get correct answer
    const { data: mcqItem, error: mcqError } = await supabase
      .from("mcq_items")
      .select("correct_index")
      .eq("id", question_id)
      .single();

    if (mcqError || !mcqItem) {
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.QUESTION_NOT_FOUND }, { status: 404 });
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
      logger.error("Error updating question answer:", updateQuestionError);
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_RECORD_ANSWER }, { status: 500 });
    }

    // Update attempt counters
    const newQuestionsAnswered = attempt.questions_answered + 1;
    const newCorrectCount = attempt.correct_count + (isCorrect ? 1 : 0);

    // CRITICAL FIX: Validate that all questions are actually assigned before marking complete
    // Check if we have reached the target number of answered questions
    const hasReachedTarget = newQuestionsAnswered >= attempt.total_questions;

    // If we've reached the target, verify that all questions are actually assigned
    let isComplete = false;
    if (hasReachedTarget) {
      // Count actual assigned questions to verify completion
      const { data: assignedQuestions, error: countError } = await supabase
        .from("attempt_questions")
        .select("id", { count: "exact" })
        .eq("attempt_id", attemptId);

      if (countError) {
        logger.error("Error counting assigned questions:", countError);
        return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_VERIFY_COMPLETION }, { status: 500 });
      }

      const actualAssignedCount = assignedQuestions?.length || 0;
      isComplete = actualAssignedCount >= attempt.total_questions;

      // Log completion validation for debugging
      logger.log("completion_validation", {
        attempt_id: attemptId,
        questions_answered: newQuestionsAnswered,
        total_questions: attempt.total_questions,
        actual_assigned: actualAssignedCount,
        is_complete: isComplete,
        has_gaps: actualAssignedCount < attempt.total_questions,
      });

      // If there are gaps, don't mark as complete and log the issue
      if (!isComplete) {
        logger.warn("attempt_completion_blocked", {
          attempt_id: attemptId,
          reason: "insufficient_assigned_questions",
          expected: attempt.total_questions,
          actual: actualAssignedCount,
          gaps: attempt.total_questions - actualAssignedCount,
        });
      }
    }

    const updateData: Partial<IUserAttempt> = {
      questions_answered: newQuestionsAnswered,
      correct_count: newCorrectCount,
    };

    // If attempt is now complete, update status and completion timestamp
    if (isComplete) {
      updateData.status = EAttemptStatus.Completed;
      updateData.completed_at = new Date().toISOString();
    }

    // Update metadata with session info and accumulate time spent
    const metadata = attempt.metadata || {};
    const currentTotalTime = (metadata.time_spent_seconds as number) || 0;
    const questionTime = time_spent_seconds || 0;
    const newTotalTime = currentTotalTime + questionTime;

    updateData.metadata = {
      ...metadata,
      time_spent_seconds: newTotalTime,
      last_session_at: new Date().toISOString(),
    };

    const { error: updateAttemptError } = await supabase
      .from("user_attempts")
      .update(updateData)
      .eq("id", attemptId)
      .eq("user_id", userId);

    if (updateAttemptError) {
      logger.error("Error updating attempt:", updateAttemptError);
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_UPDATE_ATTEMPT }, { status: 500 });
    }

    // Return progress WITHOUT revealing correctness or score
    return NextResponse.json({
      recorded: true,
      progress: {
        questions_answered: newQuestionsAnswered,
        total_questions: attempt.total_questions,
        is_complete: isComplete,
        // Include validation info for debugging
        validation: hasReachedTarget
          ? {
              actual_assigned: newQuestionsAnswered, // This will be the count from the validation above
              has_gaps: !isComplete && hasReachedTarget,
            }
          : null,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Unexpected error in POST /api/evaluate/attempts/:id/answer:", error);
    return NextResponse.json(
      { error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR, message: error.message },
      { status: 500 }
    );
  }
}
