import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getEmbeddings } from "@/services/ai.services";
import { generateMcqRequestSchema, mcqItemSchema } from "@/schema/generation.schema";

export const runtime = "nodejs";

/**
 * POST /api/generate/mcq
 * Body: { filters: { topic, subtopic?, version? }, count, difficulty?, bloomLevels? }
 * Behavior: retrieve candidates by labels, prompt LLM to generate MCQs (omitted here), validate, and persist.
 * Note: For v1 here, we select topK candidates via vector+FTS fusion by labels and synthesize a simple question per chunk.
 */
export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = generateMcqRequestSchema.parse(body);

    const { filters } = parsed;
    const count = Math.min(Math.max(parsed.count ?? 5, 1), 20);
    const supabase = getSupabaseServiceRoleClient();

    // 1) Build a simple query embedding using topic + optional subtopic as the query text
    const queryText = [filters.topic, filters.subtopic, filters.version].filter(Boolean).join(" ");
    const [queryEmbedding] = await getEmbeddings([queryText || filters.topic]);

    // 2) Retrieve candidates via label-based hybrid function (topK = count*3)
    const topK = Math.min(count * 3, 60);
    const { data: rows, error } = await supabase.rpc("retrieval_hybrid_by_labels", {
      p_user_id: userId,
      p_topic: filters.topic,
      p_subtopic: filters.subtopic ?? null,
      p_version: filters.version ?? null,
      p_query_embedding: queryEmbedding as unknown as any,
      p_query_text: queryText,
      p_topk: topK,
      p_alpha: 0.5,
    });
    if (error) return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    const candidates = (rows ?? []).slice(0, topK);

    // 3) Synthesize minimal MCQs (placeholder v1). In a later step, replace with LLM prompt over batched context.
    const items = candidates.slice(0, count).map((r: any) => {
      const question = `According to the docs, what best describes this topic: ${filters.topic}?`;
      const options = ["Definition/overview", "Unrelated concept", "Incorrect detail", "Trick option"];
      const correctIndex = 0;
      const explanation = "Derived from retrieved documentation chunk.";
      return mcqItemSchema.parse({
        question,
        options,
        correctIndex,
        explanation,
        citations: [
          {
            documentId: r.document_id as string,
            chunkIndex: r.chunk_index as number,
            bucket: r.bucket as string,
            path: r.path as string,
          },
        ],
        labels: {
          difficulty: parsed.difficulty ?? "Easy",
          bloom: (parsed.bloomLevels && parsed.bloomLevels[0]) || "Understand",
          topic: filters.topic,
          subtopic: filters.subtopic,
          version: filters.version,
        },
      });
    });

    // 4) Persist to mcq_items + mcq_explanations
    const itemIds: string[] = [];
    for (const it of items) {
      const { data: insertItem, error: insertErr } = await supabase
        .from("mcq_items")
        .insert({
          user_id: userId,
          topic: it.labels.topic,
          subtopic: it.labels.subtopic ?? null,
          version: it.labels.version ?? null,
          difficulty: it.labels.difficulty,
          bloom_level: it.labels.bloom,
          question: it.question,
          options: it.options,
          correct_index: it.correctIndex,
          citations: it.citations as any,
          labels: it.labels as any,
        })
        .select("id")
        .single();
      if (insertErr) continue;
      const mcqId = insertItem!.id as string;
      itemIds.push(mcqId);
      await supabase.from("mcq_explanations").insert({ mcq_id: mcqId, explanation: it.explanation });
    }

    return NextResponse.json({ ok: true, stored: itemIds.length, itemIds });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
