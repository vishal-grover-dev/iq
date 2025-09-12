import { NextRequest, NextResponse } from "next/server";
import { retrievalRequestSchema } from "@/schema/retrieval.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getEmbeddings, rerank } from "@/services/ai.services";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) {
        userId = DEV_DEFAULT_USER_ID;
      } else {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const parsed = retrievalRequestSchema.parse(body);

    const { filters, query } = parsed;
    const topK = Math.min(Math.max(parsed.topK ?? 8, 1), 50);
    const alpha = parsed.alpha ?? 0.5;

    // 1) Compute query embedding (1536-d)
    const t0 = Date.now();
    const [queryEmbedding] = await getEmbeddings([query]);
    const vectorMs = Date.now() - t0;

    // 2) Call hybrid retrieval RPC
    const supabase = getSupabaseServiceRoleClient();
    const { data: rows, error } = await supabase.rpc("retrieval_hybrid", {
      p_user_id: userId,
      p_board: filters.board,
      p_grade: filters.grade,
      p_subject: filters.subject,
      p_query_embedding: queryEmbedding as unknown as any,
      p_query_text: query,
      p_resource_type: filters.resourceType ?? null,
      p_chapter_number: filters.chapterNumber ?? null,
      p_chapter_name: filters.chapterName ?? null,
      p_topk: topK,
      p_alpha: alpha,
    });
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
    const fusedItems = (rows ?? []).map((r: any) => ({
      documentId: r.document_id as string,
      chunkIndex: r.chunk_index as number,
      content: r.content as string,
      tokens: r.tokens as number,
      score: r.score as number,
      title: r.title as string | null,
      bucket: r.bucket as string,
      path: r.path as string,
      fusedScore: r.score as number,
    }));

    // 3) Optional reranking with OpenAI (LLM-as-reranker) with timeout and safe fallback
    let reranked = fusedItems;
    let rerankMs: number | undefined = undefined;
    try {
      const texts = fusedItems.map((it: { content: string }) => it.content);
      if (texts.length > 0) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const t1 = Date.now();
        // rerank does not accept AbortSignal currently; best-effort timeout via race
        const scoresPromise = rerank(query, texts);
        const scores = await Promise.race([
          scoresPromise,
          new Promise<number[]>((_, reject) =>
            controller.signal.addEventListener("abort", () => reject(new Error("RERANK_TIMEOUT")))
          ) as Promise<number[]>,
        ]);
        clearTimeout(timeout);
        rerankMs = Date.now() - t1;
        // Apply scores
        reranked = fusedItems
          .map((it: any, i: number) => ({ ...it, rerankScore: typeof scores[i] === "number" ? scores[i] : 0 }))
          .sort((a: any, b: any) => (b.rerankScore ?? 0) - (a.rerankScore ?? 0));
      }
    } catch {
      // Fallback to fused order silently
    }

    return NextResponse.json({
      ok: true,
      items: reranked,
      debug: {
        vectorMs,
        rerankMs,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
