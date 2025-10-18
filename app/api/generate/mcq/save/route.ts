import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import type { IMcqItemView } from "@/types/mcq.types";
import { buildMcqEmbeddingText, computeMcqContentKey, validateMcq } from "@/utils/mcq.utils";
import { getEmbeddings } from "@/services/ai/embeddings.service";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) userId = DEV_DEFAULT_USER_ID || "";
    if (!userId) return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });

    // Accept both shapes: { item: IMcqItemView, requireCode?: boolean } or IMcqItemView directly
    const body = (await req.json().catch(() => ({}))) as any;
    const payload = (body?.item ?? body) as IMcqItemView;
    const requireCode: boolean = Boolean(body?.requireCode);

    // Minimal guard to avoid runtime errors
    if (!payload || typeof payload?.question !== "string" || !Array.isArray(payload?.options)) {
      return NextResponse.json({ ok: false, message: "Invalid payload" }, { status: 400 });
    }

    // Centralized validation
    const validation = validateMcq(payload, requireCode);
    if (!validation.ok) {
      return NextResponse.json(
        { ok: false, message: "Validation failed", errors: validation.reasons },
        { status: 400 }
      );
    }

    const contentKey = computeMcqContentKey(payload);
    const [emb] = await getEmbeddings([buildMcqEmbeddingText(payload)]);

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("mcq_items")
      .insert({
        user_id: userId,
        topic: payload.topic,
        subtopic: payload.subtopic ?? null,
        version: payload.version ?? null,
        difficulty: payload.difficulty,
        bloom_level: payload.bloomLevel,
        question: payload.question,
        code: payload.code ?? null,
        options: payload.options,
        correct_index: payload.correctIndex,
        citations: payload.citations ?? [],
        labels: { topic: payload.topic, subtopic: payload.subtopic ?? null, version: payload.version ?? null },
        embedding: emb as unknown as any,
        content_key: contentKey,
      })
      .select("id")
      .single();

    if (error) {
      const msg = (error as any)?.message?.toLowerCase?.() || "";
      if (msg.includes("uq_mcq_items_content_key")) {
        return NextResponse.json(
          { ok: false, duplicate: true, message: "Duplicate content (near-identical question)." },
          { status: 409 }
        );
      }
      return NextResponse.json({ ok: false, message: error.message }, { status: 400 });
    }

    // Optionally persist explanation in separate table if present
    try {
      const explanationText = (() => {
        const lines: string[] = [];
        if (payload.explanation && typeof payload.explanation === "string") lines.push(payload.explanation);
        if (Array.isArray(payload.explanationBullets) && payload.explanationBullets.length > 0) {
          for (const b of payload.explanationBullets) {
            if (typeof b === "string" && b.trim().length > 0) lines.push(`- ${b}`);
          }
        }
        return lines.join("\n");
      })();
      if (data?.id && explanationText) {
        await supabase.from("mcq_explanations").insert({ mcq_id: data.id, explanation: explanationText });
      }
    } catch {
      // Non-blocking: do not fail the request if explanation write fails
    }

    return NextResponse.json({ ok: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
