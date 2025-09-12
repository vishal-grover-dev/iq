import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestRepoOrWebRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getEmbeddings } from "@/services/ai.services";
import { chunkTextLC } from "@/utils/langchain.utils";
import { getRepoMarkdownFiles } from "@/utils/repo.utils";

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
    const parsed = ingestRepoOrWebRequestSchema.parse(body);

    // For v1, only support mode === 'repo' here. Web will be a separate endpoint soon.
    if (parsed.mode !== "repo") {
      return NextResponse.json({ ok: false, message: "Use /api/ingest/repo for repo mode" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    // Create ingestion row (pending → processing)
    const { data: ingestionInsert, error: ingestionError } = await supabase
      .from("ingestions")
      .insert([
        {
          user_id: userId,
          content_category: "interview-docs",
          metadata: { topic: parsed.topic, version: parsed.version ?? null, mode: "repo", repoUrl: parsed.repoUrl },
          objects: [],
          status: "processing",
        },
      ])
      .select("id")
      .single();
    if (ingestionError || !ingestionInsert) {
      throw new Error(ingestionError?.message ?? "Failed to create ingestion");
    }
    const ingestionId = ingestionInsert.id as string;

    // v1: Fetch files via GitHub raw requests for whitelisted paths (simple approach)
    // Note: Implemented in a separate util in the next step; placeholder minimal inline for now
    // We only process up to maxFiles and only markdown/mdx

    const files = await getRepoMarkdownFiles(parsed.repoUrl, parsed.paths ?? [], parsed.maxFiles ?? 200);

    let totalChunks = 0;
    let totalVectors = 0;

    // Insert a single document placeholder per file path
    for (const f of files) {
      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            ingestion_id: ingestionId,
            bucket: "repo",
            path: f.path,
            mime_type: "text/markdown",
            title: f.title ?? null,
            labels: { topic: parsed.topic, version: parsed.version ?? null },
          },
        ])
        .select("id")
        .single();
      if (docError || !docInsert) {
        throw new Error(docError?.message ?? "Failed to create document");
      }
      const documentId = docInsert.id as string;

      const chunks = await chunkTextLC(f.content, { chunkSize: 1800, overlap: 200 });
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
      const { error: chunksError } = await supabase.from("document_chunks").insert(rows);
      if (chunksError) throw new Error(chunksError.message);
      totalVectors += rows.length;
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);

    return NextResponse.json({
      ok: true,
      ingestionId,
      message: "Repo ingestion completed",
      chunks: totalChunks,
      vectors: totalVectors,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
