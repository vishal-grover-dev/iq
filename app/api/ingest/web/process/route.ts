import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { getEmbeddings } from "@/services/ai.services";
import { prefilterExistingWebPages, assessAndPreparePage, insertChunksBatch } from "@/utils/ingest-web-process.utils";
import { getLabelResolverMetrics, resetLabelResolverMetrics } from "@/utils/label-resolver.utils";
import { resolvePlannerBootstrap } from "@/utils/ingest-planner.utils";

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
    resetLabelResolverMetrics();
    await updateProgress({ step: "crawling", errorsCount: 0 });
    await writeEvent("start", "Web ingestion started", "info", { meta });

    const planner = await resolvePlannerBootstrap({
      domain: meta.domain,
      seeds: meta.seeds,
      includePatterns: meta.includePatterns,
      excludePatterns: meta.excludePatterns,
      depthMap: meta.depthMap,
      useAiPlanner: meta.useAiPlanner,
    });

    const pages = await crawlWebsite({
      seeds: planner.seeds,
      domain: meta.domain,
      prefix: meta.prefix ?? undefined,
      depth: meta.depth ?? 2,
      maxPages: meta.maxPages ?? 50,
      crawlDelayMs: meta.crawlDelayMs ?? 300,
      includePatterns: planner.includePatterns,
      excludePatterns: planner.excludePatterns,
      depthMap: planner.depthMap,
    });
    const { selectedPages, existingCount } = await prefilterExistingWebPages(supabase, pages, meta.maxPages);
    await updateProgress({ totalPlanned: selectedPages.length, processed: 0 });
    await writeEvent(
      "planning",
      `Planned ${pages.length} pages; ${existingCount} already ingested; ${selectedPages.length} to process`
    );

    let totalChunks = 0;
    let totalVectors = 0;
    const topic: string = meta.topic;
    const subtopic: string | null = (meta.subtopic ?? "").trim() === "" ? null : meta.subtopic;
    const version: string | null = meta.version ?? null;
    const seenHashes = new Set<string>();
    const shinglesList: Array<Set<string>> = [];

    // Batch processing for better performance
    const BATCH_SIZE = 5; // Process 5 pages at a time
    const embeddingBatch: Array<{ documentId: string; chunks: any[]; url: string }> = [];

    for (let i = 0; i < selectedPages.length; i++) {
      const p = selectedPages[i];
      await updateProgress({ step: "chunking", currentPathOrUrl: p.url, processed: i });
      await writeEvent("fetch", `Fetched ${p.url}`, "info", { title: p.title });

      const assessed = await assessAndPreparePage(
        supabase,
        ingestionId,
        p,
        { topic, subtopic, version },
        seenHashes,
        shinglesList
      );
      if (assessed.kind === "skip") {
        const reason = assessed.reason;
        await writeEvent(
          reason === "low_quality" ? "quality" : "dedup",
          reason === "low_quality"
            ? "Skipped low-quality page"
            : reason === "near_duplicate"
            ? "Skipped near-duplicate page (jaccard >= 0.9)"
            : "Skipped duplicate page (hash)",
          "info",
          { url: p.url }
        );
        continue;
      }
      totalChunks += assessed.item.chunks.length;
      embeddingBatch.push({
        documentId: assessed.item.documentId,
        chunks: assessed.item.chunks,
        url: assessed.item.url,
      });

      // Process batch when it reaches BATCH_SIZE or at the end
      if (embeddingBatch.length >= BATCH_SIZE || i === selectedPages.length - 1) {
        await updateProgress({ step: "embedding" });
        const { inserted, perItem } = await insertChunksBatch(
          supabase,
          embeddingBatch,
          { topic, subtopic, version },
          (inputs) => getEmbeddings(inputs)
        );
        totalVectors += inserted;
        for (let bi = 0; bi < embeddingBatch.length; bi++) {
          const item = embeddingBatch[bi]!;
          await writeEvent("ingest", `Inserted ${perItem[bi]} chunks`, "info", { url: item.url });
        }
        // Emit classifier metrics snapshot periodically
        const m = getLabelResolverMetrics();
        await writeEvent("labels", "Classifier metrics snapshot", "info", m as any);
        embeddingBatch.length = 0;
      }

      await updateProgress({ processed: i + 1 });
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
    await updateProgress({ step: "completed" });
    // Final classifier metrics
    const finalMetrics = getLabelResolverMetrics();
    await writeEvent("labels", "Classifier metrics final", "info", finalMetrics as any);
    await writeEvent("complete", "Web ingestion completed");

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
