import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { chunkTextLC } from "@/utils/langchain.utils";
import { getEmbeddings } from "@/services/ai.services";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { ingestionId } = (await req.json()) as { ingestionId?: string };
    if (!ingestionId) return NextResponse.json({ ok: false, message: "ingestionId is required" }, { status: 400 });

    const supabase = getSupabaseServiceRoleClient();
    const { data: ingestion, error } = await supabase
      .from("ingestions")
      .select("id, user_id, status, metadata")
      .eq("id", ingestionId)
      .single();
    if (error || !ingestion) return NextResponse.json({ ok: false, message: "Ingestion not found" }, { status: 404 });
    if (ingestion.user_id !== userId) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

    const meta = ingestion.metadata as any;
    if (meta.mode !== "web") return NextResponse.json({ ok: false, message: "Not a web ingestion" }, { status: 400 });

    const updateProgress = async (progress: Record<string, any>) => {
      const nextMeta = {
        ...(ingestion.metadata as any),
        progress: {
          ...((ingestion.metadata as any)?.progress ?? {}),
          ...progress,
          lastUpdatedAt: new Date().toISOString(),
        },
      };
      await supabase.from("ingestions").update({ metadata: nextMeta }).eq("id", ingestionId);
    };

    await supabase.from("ingestions").update({ status: "processing" }).eq("id", ingestionId);
    await updateProgress({ step: "crawling", errorsCount: 0 });

    const pages = await crawlWebsite({
      seedUrl: meta.seedUrl,
      domain: meta.domain,
      prefix: meta.prefix ?? undefined,
      depth: meta.depth ?? 2,
      maxPages: meta.maxPages ?? 50,
      crawlDelayMs: meta.crawlDelayMs ?? 300,
    });
    await updateProgress({ totalPlanned: pages.length, processed: 0 });

    let totalChunks = 0;
    let totalVectors = 0;
    const topic: string = meta.topic;
    const subtopic: string | null = (meta.subtopic ?? "").trim() === "" ? null : meta.subtopic;
    const version: string | null = meta.version ?? null;

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      await updateProgress({ step: "chunking", currentPathOrUrl: p.url, processed: i });
      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            ingestion_id: ingestionId,
            bucket: "web",
            path: p.url,
            mime_type: "text/html",
            title: p.title,
            labels: { topic, subtopic, version },
          },
        ])
        .select("id")
        .single();
      if (docError || !docInsert) throw new Error(docError?.message ?? "Failed to create document");
      const documentId = docInsert.id as string;

      const chunks = await chunkTextLC(p.content, { chunkSize: 1800, overlap: 200 });
      totalChunks += chunks.length;
      await updateProgress({ step: "embedding" });
      const embeddings = await getEmbeddings(chunks.map((c) => c.content));
      const rows = chunks.map((c, idx) => ({
        document_id: documentId,
        chunk_index: c.index,
        content: c.content,
        tokens: c.tokens,
        embedding: embeddings[idx] as unknown as any,
        labels: { topic, subtopic, version },
      }));
      const { error: insertErr } = await supabase.from("document_chunks").insert(rows);
      if (insertErr) throw new Error(insertErr.message);
      totalVectors += rows.length;
      await updateProgress({ processed: i + 1 });
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
    await updateProgress({ step: "completed" });

    return NextResponse.json({
      ok: true,
      ingestionId,
      message: "Web ingestion completed",
      chunks: totalChunks,
      vectors: totalVectors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
