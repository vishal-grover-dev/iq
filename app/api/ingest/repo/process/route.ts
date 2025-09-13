import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getRepoMarkdownFiles } from "@/utils/repo.utils";
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

    const { data: ingestion, error: loadErr } = await supabase
      .from("ingestions")
      .select("id, user_id, status, metadata")
      .eq("id", ingestionId)
      .single();
    if (loadErr || !ingestion) return NextResponse.json({ ok: false, message: "Ingestion not found" }, { status: 404 });
    if (ingestion.user_id !== userId) return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });

    const meta = (ingestion.metadata as any) || {};
    if (meta.mode !== "repo" || !meta.repoUrl)
      return NextResponse.json({ ok: false, message: "Ingestion is not a repo mode" }, { status: 400 });

    const topic: string = meta.topic;
    const subtopic: string | null = (meta.subtopic ?? "").trim() === "" ? null : meta.subtopic;
    const version: string | null = meta.version ?? null;
    const repoUrl: string = meta.repoUrl;
    const maxFiles: number = meta.maxFiles ?? 200;

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

    const writeEvent = async (
      stage: string,
      message: string,
      level: "info" | "warn" | "error" = "info",
      meta?: Record<string, any>
    ) => {
      await supabase
        .from("ingestion_events")
        .insert({ ingestion_id: ingestionId, stage, level, message, meta: meta ?? null });
    };

    await supabase.from("ingestions").update({ status: "processing" }).eq("id", ingestionId);
    await updateProgress({ step: "validating", errorsCount: 0 });
    await writeEvent("start", "Repo ingestion started", "info", { repoUrl });

    // Basic validation
    try {
      const url = new URL(repoUrl);
      if (url.hostname !== "github.com") throw new Error("Only GitHub repos are supported in v1");
    } catch (e: any) {
      await supabase
        .from("ingestions")
        .update({ status: "failed", error: e?.message ?? "Invalid repository URL" })
        .eq("id", ingestionId);
      await writeEvent("error", e?.message ?? "Invalid repository URL", "error");
      return NextResponse.json({ ok: false, message: e?.message ?? "Invalid repository URL" }, { status: 400 });
    }

    await updateProgress({ step: "planning" });
    const files = await getRepoMarkdownFiles(repoUrl, (meta.paths as string[]) ?? [], maxFiles);
    await updateProgress({ totalPlanned: files.length, processed: 0 });
    await writeEvent("planning", `Planned ${files.length} files`);

    let totalChunks = 0;
    let totalVectors = 0;

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      await updateProgress({ step: "chunking", currentPathOrUrl: f.path, processed: i });
      await writeEvent("fetch", `Fetched ${f.path}`);

      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            ingestion_id: ingestionId,
            bucket: "repo",
            path: f.path,
            mime_type: "text/markdown",
            title: f.title ?? null,
            labels: { topic, subtopic, version },
          },
        ])
        .select("id")
        .single();
      if (docError || !docInsert) throw new Error(docError?.message ?? "Failed to create document");

      const documentId = docInsert.id as string;
      const chunks = await chunkTextLC(f.content, { chunkSize: 1800, overlap: 200 });
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
      await writeEvent("ingest", `Inserted ${rows.length} chunks`, "info", { path: f.path });
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
    await updateProgress({ step: "completed" });
    await writeEvent("complete", "Repo ingestion completed");

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
