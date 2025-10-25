import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/services/supabase.services";
import { selectNextQuestionForAttempt } from "@/services/evaluate-selection.service";
import { EAttemptStatus } from "@/types/evaluate.types";
import { EVALUATE_API_ERROR_MESSAGES } from "@/constants/evaluate.constants";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

/**
 * GET /api/evaluate/attempts/:id
 * Fetches attempt details with progress and next question using orchestrated selection pipeline.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    const attemptId = resolvedParams.id;
    if (!attemptId)
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_ID_REQUIRED }, { status: 400 });

    const supabase = getSupabaseServiceRoleClient();

    // Use orchestrator service for question selection
    const result = await selectNextQuestionForAttempt(attemptId, userId, supabase);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Error in GET /api/evaluate/attempts/:id:", error);
    return NextResponse.json(
      {
        error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
        message: error.message,
      },
      { status: 500 }
    );
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
    if (!userId) return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

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
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.ATTEMPT_NOT_FOUND }, { status: 404 });
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
      logger.error("Error pausing attempt:", updateError);
      return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_PAUSE_ATTEMPT }, { status: 500 });
    }

    return NextResponse.json({
      status: EAttemptStatus.InProgress,
      message: "Attempt paused. Resume anytime.",
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("Unexpected error in PATCH /api/evaluate/attempts/:id:", error);
    return NextResponse.json(
      { error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR, message: error.message },
      { status: 500 }
    );
  }
}
