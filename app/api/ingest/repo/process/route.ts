import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import {
  parseRepoUrl,
  getDefaultBranch,
  listMarkdownPaths,
  fetchRawFile,
  deriveTitleFromMarkdown,
} from "@/services/server/source-fetcher.service";
import { chunkTextLC } from "@/utils/langchain.utils";
import { getEmbeddings } from "@/services/server/embedding.service";
import { resolveLabels, getLabelResolverMetrics, resetLabelResolverMetrics } from "@/services/server/labeling.service";
import { EIngestionMode } from "@/types/ingestion.types";

export const runtime = "nodejs";

interface IIngestionMetadata {
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  mode: string;
  repoUrl: string;
  paths?: string[];
  maxFiles?: number;
  batchSize?: number;
  overrideSubtopic?: boolean;
  batch?: {
    totalPlanned?: number;
    nextStart?: number;
    batchSize?: number;
  };
  progress?: Record<string, unknown>;
}

interface IRepoFile {
  path: string;
  content: string;
  title: string;
}

interface IBatchRow {
  documentId: string;
  path: string;
  chunks: Array<{ index: number; content: string; tokens: number }>;
  labels: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  let ingestionIdParam: string | undefined;
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const { ingestionId } = (await req.json()) as { ingestionId?: string };
    if (!ingestionId) return NextResponse.json({ ok: false, message: "ingestionId is required" }, { status: 400 });
    ingestionIdParam = ingestionId;

    const supabase = getSupabaseServiceRoleClient();

    const { data: ingestion, error: loadErr } = await supabase
      .from("ingestions")
      .select("id, user_id, status, metadata")
      .eq("id", ingestionId)
      .single();
    if (loadErr || !ingestion)
      return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.NOT_FOUND }, { status: 404 });
    if (ingestion.user_id !== userId)
      return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.FORBIDDEN }, { status: 403 });

    const meta = (ingestion.metadata as IIngestionMetadata) || {};
    if (meta.mode !== EIngestionMode.REPO || !meta.repoUrl)
      return NextResponse.json({ ok: false, message: "Ingestion is not a repo mode" }, { status: 400 });

    const topic: string = meta.topic;
    const userSubtopic: string | null = (meta.subtopic ?? "").trim() === "" ? null : meta.subtopic ?? null;
    const overrideSubtopic: boolean = Boolean(meta?.overrideSubtopic ?? false);
    const version: string | null = meta.version ?? null;
    const repoUrl: string = meta.repoUrl;
    const maxFiles: number = meta.maxFiles ?? 200;
    const defaultBatchSize: number = Math.max(1, Math.min(Number(meta.batchSize ?? maxFiles), maxFiles));

    const updateProgress = async (progress: Record<string, unknown>) => {
      const nextMeta = {
        ...(ingestion.metadata as IIngestionMetadata),
        progress: {
          ...((ingestion.metadata as IIngestionMetadata)?.progress ?? {}),
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
      meta?: Record<string, unknown>
    ) => {
      await supabase
        .from("ingestion_events")
        .insert({ ingestion_id: ingestionId, stage, level, message, meta: meta ?? null });
    };

    await supabase.from("ingestions").update({ status: "processing" }).eq("id", ingestionId);
    await updateProgress({ step: "validating", errorsCount: 0 });
    await writeEvent("start", "Repo ingestion started", "info", { repoUrl });
    resetLabelResolverMetrics();

    // Basic validation
    try {
      const url = new URL(repoUrl);
      if (url.hostname !== "github.com") throw new Error("Only GitHub repos are supported in v1");
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      await supabase
        .from("ingestions")
        .update({ status: "failed", error: error.message ?? "Invalid repository URL" })
        .eq("id", ingestionId);
      await writeEvent("error", error.message ?? "Invalid repository URL", "error");
      return NextResponse.json({ ok: false, message: error.message ?? "Invalid repository URL" }, { status: 400 });
    }

    await updateProgress({ step: "planning" });
    const specifiedPaths: string[] = (meta.paths as string[]) ?? [];
    const { owner, repo } = parseRepoUrl(repoUrl);
    const branch = await getDefaultBranch(owner, repo);
    const allMdPaths = await listMarkdownPaths(owner, repo, branch, specifiedPaths);
    // Cursor persisted in metadata.batch
    const batchMeta = ((ingestion.metadata as IIngestionMetadata)?.batch ?? {}) as {
      totalPlanned?: number;
      nextStart?: number;
      batchSize?: number;
    };
    const totalPlanned = Number(batchMeta.totalPlanned ?? allMdPaths.length);
    const nextStart = Number(batchMeta.nextStart ?? 0);
    const batchSize = Number(batchMeta.batchSize ?? defaultBatchSize);
    const start = Math.min(nextStart, allMdPaths.length);
    const endExclusive = Math.min(start + batchSize, allMdPaths.length);
    await updateProgress({ totalPlanned, processed: start, step: "planning" });
    await writeEvent("planning", `Planned slice ${start + 1}-${endExclusive} of ${allMdPaths.length}`);

    let totalChunks = 0;
    let totalVectors = 0;

    // Label derivation from MDN repo paths (dynamic across HTML/CSS/JavaScript)
    // dynamic label resolution replaces local MDN-specific helper

    // If no more files to process, complete
    if (start >= allMdPaths.length) {
      await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
      await updateProgress({ step: "completed" });
      await writeEvent("complete", "Repo ingestion completed");
      return NextResponse.json({
        ok: true,
        ingestionId,
        message: "Repo ingestion completed",
        chunks: 0,
        vectors: 0,
        completed: true,
      });
    }

    // Optional parallel fetch of raw files with a small concurrency limit
    const FETCH_CONCURRENCY = 5;
    const FILES_PER_EMBEDDING_BATCH = 5; // files per embedding API call batch

    await writeEvent(
      "batch",
      `Processing batch ${Math.floor(start / batchSize) + 1} (${start + 1}-${endExclusive} of ${allMdPaths.length})`
    );
    const results: IRepoFile[] = new Array(endExclusive - start);
    let fetchIndex = 0;
    async function fetchWorker() {
      while (true) {
        const idx = fetchIndex++;
        if (idx >= results.length) break;
        const p = allMdPaths[start + idx]!;
        const content = await fetchRawFile(owner, repo, branch, p);
        const title = deriveTitleFromMarkdown(p, content);
        results[idx] = { path: p, content, title };
      }
    }
    await Promise.all(Array.from({ length: Math.min(FETCH_CONCURRENCY, results.length) }, () => fetchWorker()));

    // Batch embeddings across multiple files to reduce API calls
    const batchRows: IBatchRow[] = [];
    for (let i = 0; i < results.length; i++) {
      const f = results[i]!;
      await updateProgress({ step: "chunking", currentPathOrUrl: f.path, processed: start + i });
      await writeEvent("fetch", `Fetched ${f.path}`);

      const resolved = await resolveLabels({
        source: EIngestionMode.REPO,
        path: f.path,
        title: f.title,
        topicHint: topic,
        subtopicHint: overrideSubtopic ? userSubtopic : undefined,
        versionHint: version ?? undefined,
        repoOwner: owner,
        repoName: repo,
      });
      const labels = { topic: resolved.topic, subtopic: resolved.subtopic ?? null, version: resolved.version ?? null };

      // Idempotent document upsert and chunk replace
      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .upsert(
          [
            {
              ingestion_id: ingestionId,
              bucket: "repo",
              path: f.path,
              mime_type: "text/markdown",
              title: f.title ?? null,
              labels,
            },
          ],
          { onConflict: "bucket,path" }
        )
        .select("id")
        .single();
      if (docError || !docInsert) throw new Error(docError?.message ?? "Failed to upsert document");

      const documentId = docInsert.id as string;
      await supabase.from("document_chunks").delete().eq("document_id", documentId);
      const chunks = await chunkTextLC(f.content, { chunkSize: 1800, overlap: 200 });
      totalChunks += chunks.length;
      batchRows.push({ documentId, path: f.path, chunks, labels });

      if (batchRows.length >= FILES_PER_EMBEDDING_BATCH || i === results.length - 1) {
        await updateProgress({ step: "embedding" });
        const allContents = batchRows.flatMap((item) => item.chunks.map((c) => c.content));
        const embeddings = await getEmbeddings(allContents);
        let offset = 0;
        for (const item of batchRows) {
          const rows = item.chunks.map((c, idx) => ({
            document_id: item.documentId,
            chunk_index: c.index,
            content: c.content,
            tokens: c.tokens,
            embedding: embeddings[offset + idx] as unknown as number[],
            labels: item.labels,
          }));
          const { error: insertErr } = await supabase.from("document_chunks").insert(rows);
          if (insertErr) throw new Error(insertErr.message);
          totalVectors += rows.length;
          offset += rows.length;
          await writeEvent("ingest", `Inserted ${rows.length} chunks`, "info", { path: item.path });
        }
        const m = getLabelResolverMetrics();
        await writeEvent("labels", "Classifier metrics snapshot", "info", m as Record<string, unknown>);
        batchRows.length = 0;
      }
    }

    // Advance cursor and persist
    const newNextStart = endExclusive;
    const completed = newNextStart >= allMdPaths.length;
    const nextMeta = {
      ...(ingestion.metadata as IIngestionMetadata),
      batch: { totalPlanned, nextStart: newNextStart, batchSize },
      progress: {
        ...((ingestion.metadata as IIngestionMetadata)?.progress ?? {}),
        step: completed ? "completed" : "awaiting_next_batch",
        processed: newNextStart,
        totalPlanned,
        lastUpdatedAt: new Date().toISOString(),
      },
    };
    await supabase
      .from("ingestions")
      .update({ metadata: nextMeta, status: completed ? "completed" : "processing" })
      .eq("id", ingestionId);
    if (completed) {
      const finalMetrics = getLabelResolverMetrics();
      await writeEvent("labels", "Classifier metrics final", "info", finalMetrics as Record<string, unknown>);
      await writeEvent("complete", "Repo ingestion completed");
    } else await writeEvent("awaiting_next_batch", `Next start ${newNextStart} of ${totalPlanned}`);

    return NextResponse.json({
      ok: true,
      ingestionId,
      message: completed ? "Repo ingestion completed" : "Batch processed; call again for next batch",
      chunks: totalChunks,
      vectors: totalVectors,
      completed,
      processed: newNextStart,
      total: totalPlanned,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    try {
      const supabase = getSupabaseServiceRoleClient();
      if (ingestionIdParam) {
        await supabase
          .from("ingestions")
          .update({ status: "failed", error: error.message ?? "Internal error" })
          .eq("id", ingestionIdParam);
        await supabase.from("ingestion_events").insert({
          ingestion_id: ingestionIdParam,
          stage: "error",
          level: "error",
          message: error.message ?? "Internal error",
        });
      }
    } catch {}
    return NextResponse.json({ ok: false, message: error.message ?? "Internal error" }, { status: 500 });
  }
}
