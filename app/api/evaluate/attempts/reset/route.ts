import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";

export const runtime = "nodejs";

/**
 * DELETE /api/evaluate/attempts/reset
 * Resets all attempts for DEV_DEFAULT_USER_ID only.
 * This endpoint is only available for development/testing purposes.
 */
export async function DELETE() {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";

    // Only allow reset for DEV_DEFAULT_USER_ID
    if (!userId || userId !== DEV_DEFAULT_USER_ID) {
      return NextResponse.json({ error: "Reset is only available for development user" }, { status: 403 });
    }

    const supabase = getSupabaseServiceRoleClient();

    // Get all attempt IDs for this user
    const { data: attempts } = await supabase.from("user_attempts").select("id").eq("user_id", userId);

    if (attempts && attempts.length > 0) {
      const attemptIds = attempts.map((a) => a.id);

      // Delete attempt_questions first (foreign key constraint)
      await supabase.from("attempt_questions").delete().in("attempt_id", attemptIds);
    }

    // Delete all user_attempts
    const { error } = await supabase.from("user_attempts").delete().eq("user_id", userId);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      deleted_count: attempts?.length || 0,
    });
  } catch (error) {
    console.error("Reset attempts error:", error);
    return NextResponse.json({ error: "Failed to reset attempts" }, { status: 500 });
  }
}
