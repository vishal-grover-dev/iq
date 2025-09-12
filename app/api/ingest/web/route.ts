import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestWebRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { getEmbeddings } from "@/services/ai.services";
import { chunkTextLC } from "@/utils/langchain.utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ingestWebRequestSchema.parse(body);

    const supabase = getSupabaseServiceRoleClient();
    const { data: ingestionInsert, error: ingestionError } = await supabase
      .from("ingestions")
      .insert([
        {
          user_id: userId,
          content_category: "interview-docs",
          metadata: {
            topic: parsed.topic,
            version: parsed.version ?? null,
            mode: "web",
            seedUrl: parsed.seedUrl,
            domain: parsed.domain,
            prefix: parsed.prefix ?? null,
          },
          objects: [],
          status: "processing",
        },
      ])
      .select("id")
      .single();
    if (ingestionError || !ingestionInsert) throw new Error(ingestionError?.message ?? "Failed to create ingestion");
    const ingestionId = ingestionInsert.id as string;

    const pages = await crawlWebsite({
      seedUrl: parsed.seedUrl,
      domain: parsed.domain,
      prefix: parsed.prefix,
      depth: parsed.depth,
      maxPages: parsed.maxPages,
      crawlDelayMs: parsed.crawlDelayMs,
    });

    let totalChunks = 0;
    let totalVectors = 0;
    for (const p of pages) {
      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            ingestion_id: ingestionId,
            bucket: "web",
            path: p.url,
            mime_type: "text/html",
            title: p.title,
            labels: { topic: parsed.topic, version: parsed.version ?? null },
          },
        ])
        .select("id")
        .single();
      if (docError || !docInsert) throw new Error(docError?.message ?? "Failed to create document");
      const documentId = docInsert.id as string;

      const chunks = await chunkTextLC(p.content, { chunkSize: 1800, overlap: 200 });
      totalChunks += chunks.length;
      const embeddings = await getEmbeddings(chunks.map((c) => c.content));
      const rows = chunks.map((c, i) => ({
        document_id: documentId,
        chunk_index: c.index,
        content: c.content,
        tokens: c.tokens,
        embedding: embeddings[i] as unknown as any,
        labels: { topic: parsed.topic, version: parsed.version ?? null },
      }));
      const { error: insertErr } = await supabase.from("document_chunks").insert(rows);
      if (insertErr) throw new Error(insertErr.message);
      totalVectors += rows.length;
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
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
