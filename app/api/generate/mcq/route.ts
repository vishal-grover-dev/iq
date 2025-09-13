import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getEmbeddings, rerank, generateMcqsFromContexts } from "@/services/ai.services";
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

    // 1) Build a query embedding using topic/subtopic/version as query text
    const queryText = [filters.topic, filters.subtopic, filters.version].filter(Boolean).join(" ");
    const [queryEmbedding] = await getEmbeddings([queryText || filters.topic]);

    // 2) Retrieve candidates via label-based hybrid function (topK = count*3) and apply reranker
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

    // Rerank by LLM (optional best-effort)
    const rerankScores = await rerank(
      queryText,
      candidates.map((c: any) => c.content as string)
    );
    const ranked = candidates
      .map((c: any, i: number) => ({ ...c, rerankScore: rerankScores[i] ?? 0 }))
      .sort((a: any, b: any) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0));

    // 3) RAG-based MCQ generation via LLM using top contexts
    const topContexts = ranked
      .slice(0, Math.max(count * 2, 6))
      .map((r: any) => ({ content: r.content as string, title: r.title as string | null }));
    const llmItems = await generateMcqsFromContexts({
      query: queryText || filters.topic,
      contexts: topContexts,
      count,
      difficulty: parsed.difficulty,
      bloomLevels: parsed.bloomLevels,
      topic: filters.topic,
      subtopic: filters.subtopic ?? null,
      version: filters.version ?? null,
    });

    const items = llmItems.map((it, idx) => {
      // Map citation indices back to ranked rows
      const primaryIdx = it.citationIndices[0] ?? 0;
      const r = ranked[Math.min(primaryIdx, ranked.length - 1)];
      return mcqItemSchema.parse({
        question: it.question,
        options: it.options,
        correctIndex: it.correctIndex,
        explanation: it.explanation,
        citations: it.citationIndices.map((ci) => {
          const ref = ranked[Math.min(ci, ranked.length - 1)];
          return {
            documentId: ref.document_id as string,
            chunkIndex: ref.chunk_index as number,
            bucket: ref.bucket as string,
            path: ref.path as string,
          };
        }),
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
