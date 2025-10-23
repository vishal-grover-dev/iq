import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/services/supabase.services";
import { EAttemptStatus } from "@/types/evaluate.types";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

/**
 * POST /api/evaluate/attempts/:id/fix
 * Simple endpoint to fix broken attempts by resetting them to in_progress
 * This allows users to continue from where they left off
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId) return NextResponse.json({ error: "Attempt ID required" }, { status: 400 });

    const supabase = getSupabaseServiceRoleClient();

    // Fetch attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("user_attempts")
      .select("*")
      .eq("id", attemptId)
      .eq("user_id", userId)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Get actual assigned questions count
    const { data: assignedQuestions, error: questionsError } = await supabase
      .from("attempt_questions")
      .select("id", { count: "exact" })
      .eq("attempt_id", attemptId);

    if (questionsError) {
      logger.error("Error counting assigned questions:", questionsError);
      return NextResponse.json({ error: "Failed to count questions" }, { status: 500 });
    }

    const actualAssignedCount = assignedQuestions?.length || 0;
    const expectedCount = attempt.total_questions;
    const hasGaps = actualAssignedCount < expectedCount;

    logger.log("fix_attempt_analysis", {
      attempt_id: attemptId,
      status: attempt.status,
      questions_answered: attempt.questions_answered,
      total_questions: attempt.total_questions,
      actual_assigned: actualAssignedCount,
      has_gaps: hasGaps,
      gaps: expectedCount - actualAssignedCount,
    });

    // If attempt is completed but has gaps, reset to in_progress
    if (attempt.status === EAttemptStatus.Completed && hasGaps) {
      const { error: updateError } = await supabase
        .from("user_attempts")
        .update({
          status: EAttemptStatus.InProgress,
          completed_at: null,
          // Reset the questions_answered to match actual assigned count
          questions_answered: actualAssignedCount,
          // Recalculate correct_count based on actual answered questions
          correct_count: 0, // Will be recalculated when user continues
        })
        .eq("id", attemptId)
        .eq("user_id", userId);

      if (updateError) {
        logger.error("Error fixing attempt:", updateError);
        return NextResponse.json({ error: "Failed to fix attempt" }, { status: 500 });
      }

      return NextResponse.json({
        fixed: true,
        message: "Attempt has been reset to in_progress. You can now continue from where you left off.",
        analysis: {
          previous_status: "completed",
          new_status: "in_progress",
          questions_answered: actualAssignedCount,
          total_questions: attempt.total_questions,
          gaps_fixed: expectedCount - actualAssignedCount,
          can_continue: true,
        },
      });
    }

    // If attempt is already in progress or properly completed, no fix needed
    return NextResponse.json({
      fixed: false,
      message:
        attempt.status === EAttemptStatus.InProgress
          ? "Attempt is already in progress"
          : "Attempt is properly completed with no gaps",
      analysis: {
        status: attempt.status,
        questions_answered: attempt.questions_answered,
        total_questions: attempt.total_questions,
        actual_assigned: actualAssignedCount,
        has_gaps: hasGaps,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Unexpected error in POST /api/evaluate/attempts/:id/fix:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
