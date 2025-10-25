import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { EAttemptStatus } from "@/types/evaluate.types";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

/**
 * POST /api/evaluate/attempts/:id/recover
 * Detects and attempts to fix incomplete attempts with missing questions.
 * This is a recovery mechanism for the critical bug where attempts are marked
 * as completed but have gaps in the question sequence.
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

    // Only process attempts that are marked as completed
    if (attempt.status !== EAttemptStatus.Completed) {
      return NextResponse.json(
        {
          error: "Attempt is not completed",
          message: "Recovery is only needed for completed attempts with gaps",
        },
        { status: 400 }
      );
    }

    // Get all assigned questions for this attempt
    const { data: assignedQuestions, error: questionsError } = await supabase
      .from("attempt_questions")
      .select("question_order, question_id, user_answer_index, answered_at")
      .eq("attempt_id", attemptId)
      .order("question_order", { ascending: true });

    if (questionsError) {
      logger.error("Error fetching assigned questions:", questionsError);
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }

    const assigned = assignedQuestions || [];
    const expectedCount = attempt.total_questions;
    const actualCount = assigned.length;

    // Check for gaps in question sequence
    const assignedOrders = assigned.map((q) => q.question_order).sort((a, b) => a - b);
    const expectedOrders = Array.from({ length: expectedCount }, (_, i) => i + 1);
    const missingOrders = expectedOrders.filter((order) => !assignedOrders.includes(order));

    logger.info("recovery_analysis", {
      attempt_id: attemptId,
      expected_questions: expectedCount,
      actual_assigned: actualCount,
      missing_count: missingOrders.length,
      missing_orders: missingOrders,
      gaps_detected: missingOrders.length > 0,
    });

    // If no gaps found, attempt is actually complete
    if (missingOrders.length === 0) {
      return NextResponse.json({
        recovered: false,
        message: "No gaps detected. Attempt is properly completed.",
        analysis: {
          expected_questions: expectedCount,
          actual_assigned: actualCount,
          gaps: 0,
        },
      });
    }

    // Attempt recovery by generating missing questions
    const recoveryResults = [];
    let recoverySuccess = true;

    for (const missingOrder of missingOrders) {
      try {
        logger.info("recovery_generating_question", {
          attempt_id: attemptId,
          missing_order: missingOrder,
          progress: `${missingOrders.indexOf(missingOrder) + 1}/${missingOrders.length}`,
        });

        // Call the question selection logic to generate a question for this order
        // This will trigger the same logic as the GET /api/evaluate/attempts/:id endpoint
        // Note: Not using these directly in recovery, but left as reference for future enhancement
        // const { getEmbeddings } = await import("@/services/ai/embedding.service");
        // const { weightedRandomIndex, calculateCoverageWeights } = await import("@/utils/selection.utils");
        // const { getStaticTopicList, getStaticSubtopicMap } = await import("@/utils/static-ontology.utils");

        // Build attempt context from existing questions
        // (Simplified for recovery - not needed for basic fallback assignment)
        // const distributions = assigned.reduce(
        //   (acc: TDistributions, _q: any) => acc,
        //   { ... }
        // );

        // For recovery, use a simple fallback approach
        // Generate a basic question assignment without complex logic
        const { data: randomMcq } = await supabase.from("mcq_items").select("id").limit(1).single();

        if (randomMcq) {
          const { error: assignError } = await supabase.from("attempt_questions").insert({
            attempt_id: attemptId,
            question_id: randomMcq.id,
            question_order: missingOrder,
          });

          if (assignError) {
            logger.error("Error assigning recovery question:", assignError);
            recoverySuccess = false;
            recoveryResults.push({
              order: missingOrder,
              success: false,
              error: assignError.message,
            });
          } else {
            recoveryResults.push({
              order: missingOrder,
              success: true,
              question_id: randomMcq.id,
            });
          }
        } else {
          recoverySuccess = false;
          recoveryResults.push({
            order: missingOrder,
            success: false,
            error: "No questions available in bank",
          });
        }
      } catch (recoveryError: unknown) {
        const error = recoveryError instanceof Error ? recoveryError : new Error(String(recoveryError));
        logger.error(`Error during recovery for order ${missingOrder}:`, error);
        recoverySuccess = false;
        recoveryResults.push({
          order: missingOrder,
          success: false,
          error: error.message,
        });
      }
    }

    // Update attempt status if recovery was successful
    if (recoverySuccess) {
      const { error: updateError } = await supabase
        .from("user_attempts")
        .update({
          status: EAttemptStatus.InProgress,
          completed_at: null,
        })
        .eq("id", attemptId)
        .eq("user_id", userId);

      if (updateError) {
        logger.error("Error updating attempt status after recovery:", updateError);
        return NextResponse.json({ error: "Failed to update attempt status" }, { status: 500 });
      }
    }

    return NextResponse.json({
      recovered: recoverySuccess,
      message: recoverySuccess
        ? "Recovery completed successfully. Attempt is now in progress and can be continued."
        : "Recovery partially failed. Some questions could not be assigned.",
      analysis: {
        expected_questions: expectedCount,
        actual_assigned_before: actualCount,
        missing_orders: missingOrders,
        gaps_detected: missingOrders.length,
        recovery_results: recoveryResults,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Unexpected error in POST /api/evaluate/attempts/:id/recover:", error);
    return NextResponse.json({ error: "Internal server error", message: error.message }, { status: 500 });
  }
}
