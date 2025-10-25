import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { reviseMcqWithContext } from "@/services/server/mcq-refinement.service";
import type { TMcqRevisionRequest, TRpcContextResult } from "@/types/generation.types";
import { logger } from "@/utils/logger.utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return new NextResponse(API_ERROR_MESSAGES.UNAUTHORIZED, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as TMcqRevisionRequest;
    const { instruction, currentMcq } = body;

    if (!instruction || !currentMcq) {
      return NextResponse.json({ ok: false, message: "Missing instruction or current MCQ" }, { status: 400 });
    }

    logger.info(`[MCQ Revision] User instruction: "${instruction}"`);

    // Get context for the revision (similar to generation but focused on the current topic)
    const supabase = getSupabaseServiceRoleClient();
    const context = await supabase.rpc("retrieval_hybrid_by_labels", {
      p_user_id: userId,
      p_topic: currentMcq.topic,
      p_query_text: `${currentMcq.topic} ${currentMcq.subtopic || ""} fundamentals`,
      p_subtopic: currentMcq.subtopic || null,
      p_version: currentMcq.version || null,
      p_topk: 8,
      p_alpha: 0.5,
    });

    const contextItems = (context.data ?? ([] as TRpcContextResult[])).slice(0, 8).map((r: TRpcContextResult) => ({
      title: r.title as string | null,
      url: r.path as string,
      content: r.content as string,
    }));

    // Revise the MCQ with context
    const revisedItem = await reviseMcqWithContext({
      currentMcq,
      instruction,
      contextItems,
    });

    logger.info(`[MCQ Revision] Successfully revised MCQ with instruction: "${instruction}"`);

    return NextResponse.json({
      ok: true,
      item: revisedItem,
      changes: `Applied instruction: "${instruction}" - Updated question based on your feedback.`,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error("[MCQ Revision] Error:", error);
    return NextResponse.json({ ok: false, message: error.message ?? "Failed to revise MCQ" }, { status: 500 });
  }
}
