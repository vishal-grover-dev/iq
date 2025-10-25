import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { EAttemptStatus } from "@/types/evaluate.types";
import { EVALUATE_API_ERROR_MESSAGES } from "@/constants/evaluate.constants";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

/**
 * POST /api/evaluate/attempts
 * Creates a new 60-question evaluation attempt for the current user.
 */
export async function POST() {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    const supabase = getSupabaseServiceRoleClient();

    // Create new attempt with default values
    const { data, error } = await supabase
      .from("user_attempts")
      .insert({
        user_id: userId,
        status: EAttemptStatus.InProgress,
        total_questions: 60,
        questions_answered: 0,
        correct_count: 0,
        metadata: {
          session_count: 1,
          pause_count: 0,
          time_spent_seconds: 0,
          last_session_at: new Date().toISOString(),
        },
      })
      .select("id, total_questions, status")
      .single();

    if (error) {
      logger.error("Error creating attempt:", error);
      return NextResponse.json(
        { error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_CREATE_ATTEMPT, details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempt_id: data.id,
      total_questions: data.total_questions,
      status: data.status,
    });
  } catch (err: unknown) {
    logger.error("Unexpected error creating attempt:", err);
    return NextResponse.json(
      { error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR, message: (err as Error)?.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/evaluate/attempts
 * Fetches list of user's attempts with optional status filter.
 * Query params:
 *   - status: 'in_progress' | 'completed' (optional)
 *   - limit: number (optional, default 10)
 */
export async function GET(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ error: EVALUATE_API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? Math.min(Math.max(1, parseInt(limitStr, 10)), 100) : 10;

    const supabase = getSupabaseServiceRoleClient();

    // Build query
    let query = supabase
      .from("user_attempts")
      .select("id, status, questions_answered, correct_count, started_at, completed_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply status filter if provided
    if (status && (status === "in_progress" || status === "completed")) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Error fetching attempts:", error);
      return NextResponse.json(
        { error: EVALUATE_API_ERROR_MESSAGES.FAILED_TO_FETCH_ATTEMPTS, details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attempts: data || [],
    });
  } catch (err: unknown) {
    logger.error("Unexpected error fetching attempts:", err);
    return NextResponse.json(
      { error: EVALUATE_API_ERROR_MESSAGES.INTERNAL_SERVER_ERROR, message: (err as Error)?.message },
      { status: 500 }
    );
  }
}
