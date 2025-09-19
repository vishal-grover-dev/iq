import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { chunkTextLC } from "@/utils/langchain.utils";
import { getEmbeddings } from "@/services/ai.services";
import { deriveLabelsFromUrl, extractMainContent, assessContentQuality } from "@/utils/intelligent-web-adapter.utils";
import { createHash } from "crypto";
import { externalGetWithRetry } from "@/services/http.services";
import { suggestCrawlHeuristics } from "@/services/ai.services";
import * as cheerio from "cheerio";

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
    await updateProgress({ step: "crawling", errorsCount: 0 });
    await writeEvent("start", "Web ingestion started", "info", { meta });

    // AI planner suggestions (optional). Use if meta.useAiPlanner or when no include/depthMap provided.
    let incPatterns: string[] | undefined =
      Array.isArray(meta.includePatterns) && meta.includePatterns.length
        ? (meta.includePatterns as string[])
        : undefined;
    let excPatterns: string[] | undefined =
      Array.isArray(meta.excludePatterns) && meta.excludePatterns.length
        ? (meta.excludePatterns as string[])
        : undefined;
    let dmapFinal: Record<string, number> | undefined =
      meta.depthMap && Object.keys(meta.depthMap).length ? (meta.depthMap as Record<string, number>) : undefined;
    let seedsEffective: string[] | undefined =
      Array.isArray(meta.seeds) && meta.seeds.length ? (meta.seeds as string[]) : undefined;
    if (meta.useAiPlanner || (!incPatterns && !dmapFinal)) {
      const firstSeed = seedsEffective && seedsEffective.length ? seedsEffective[0] : undefined;
      if (firstSeed) {
        const html = await externalGetWithRetry(firstSeed);
        if (html) {
          const $ = cheerio.load(html);
          const navPaths: Array<{ path: string; title?: string | null }> = $("a[href]")
            .map((_, el) => $(el).attr("href") || "")
            .get()
            .filter(Boolean)
            .slice(0, 50)
            .map((href) => {
              try {
                const u = new URL(href, firstSeed);
                return u.hostname.endsWith(meta.domain) ? { path: u.pathname, title: null } : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as Array<{ path: string; title?: string | null }>;
          const ai = await suggestCrawlHeuristics({ url: firstSeed, htmlPreview: html, navigationPreview: navPaths });
          if (!incPatterns || incPatterns.length === 0) incPatterns = ai.includePatterns;
          if (!dmapFinal) dmapFinal = ai.depthMap;
          if ((!seedsEffective || seedsEffective.length === 0) && ai.seeds && ai.seeds.length) {
            seedsEffective = ai.seeds;
          }
          // Source-agnostic: do not inject hardcoded seeds or patterns for specific sites
        }
      }
    }

    const pages = await crawlWebsite({
      seeds: seedsEffective,
      domain: meta.domain,
      prefix: meta.prefix ?? undefined,
      depth: meta.depth ?? 2,
      maxPages: meta.maxPages ?? 50,
      crawlDelayMs: meta.crawlDelayMs ?? 300,
      includePatterns: incPatterns,
      excludePatterns: excPatterns,
      depthMap: dmapFinal,
    });
    await updateProgress({ totalPlanned: pages.length, processed: 0 });
    await writeEvent("planning", `Planned ${pages.length} pages`);

    // Selection is source-agnostic: take up to maxPages
    const selectedPages = pages.slice(0, meta.maxPages ?? pages.length);

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

    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      await updateProgress({ step: "chunking", currentPathOrUrl: p.url, processed: i });
      await writeEvent("fetch", `Fetched ${p.url}`, "info", { title: p.title });

      // Content quality assessment
      const qualityCheck = assessContentQuality(p.content, p.html);
      if (!qualityCheck.isAcceptable) {
        await writeEvent("quality", `Skipped low-quality page: ${qualityCheck.reasons.join(", ")}`, "info", {
          url: p.url,
          score: qualityCheck.score,
        });
        continue;
      }

      // Dedup by content hash
      const normalized = p.content.replace(/\s+/g, " ").trim();
      const hashHex = createHash("sha256").update(normalized).digest("hex");
      if (seenHashes.has(hashHex)) {
        await writeEvent("dedup", "Skipped duplicate page (hash)", "info", { url: p.url });
        continue;
      }

      // Near-duplicate (similarity-lite) using 5-word shingles and Jaccard similarity
      const tokens = normalized
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      const shingles: string[] = [];
      for (let j = 0; j + 4 < tokens.length; j++) shingles.push(tokens.slice(j, j + 5).join(" "));
      const shingleSet = new Set(shingles);
      let isNearDup = false;
      for (const prior of shinglesList) {
        // Jaccard
        let inter = 0;
        for (const s of shingleSet) if (prior.has(s)) inter++;
        const union = prior.size + shingleSet.size - inter;
        const jaccard = union > 0 ? inter / union : 0;
        if (jaccard >= 0.9) {
          isNearDup = true;
          break;
        }
      }
      if (isNearDup) {
        await writeEvent("dedup", "Skipped near-duplicate page (jaccard >= 0.9)", "info", { url: p.url });
        continue;
      }
      seenHashes.add(hashHex);
      shinglesList.push(shingleSet);
      const { data: docInsert, error: docError } = await supabase
        .from("documents")
        .insert([
          {
            ingestion_id: ingestionId,
            bucket: "web",
            path: p.url,
            mime_type: "text/html",
            title: p.title,
            labels: (() => {
              const derivedLabels = deriveLabelsFromUrl(p.url, topic);
              return {
                topic: derivedLabels.topic,
                subtopic: derivedLabels.subtopic ?? subtopic,
                version: derivedLabels.version ?? version,
              };
            })(),
          },
        ])
        .select("id")
        .single();
      if (docError || !docInsert) throw new Error(docError?.message ?? "Failed to create document");
      const documentId = docInsert.id as string;

      const mainHtml = extractMainContent(p.html);
      const textForChunking = mainHtml
        ? mainHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : p.content;
      const chunks = await chunkTextLC(textForChunking, { chunkSize: 1800, overlap: 200 });
      totalChunks += chunks.length;

      // Add to batch for embedding processing
      embeddingBatch.push({ documentId, chunks, url: p.url });

      // Process batch when it reaches BATCH_SIZE or at the end
      if (embeddingBatch.length >= BATCH_SIZE || i === pages.length - 1) {
        await updateProgress({ step: "embedding" });

        // Collect all chunks for batch embedding
        const allChunksForEmbedding = embeddingBatch.flatMap((item) => item.chunks.map((c) => c.content));
        const embeddings = await getEmbeddings(allChunksForEmbedding);

        let embeddingIndex = 0;
        for (const batchItem of embeddingBatch) {
          const rows = batchItem.chunks.map((c, idx) => ({
            document_id: batchItem.documentId,
            chunk_index: c.index,
            content: c.content,
            tokens: c.tokens,
            embedding: embeddings[embeddingIndex + idx] as unknown as any,
            labels: (() => {
              const derivedLabels = deriveLabelsFromUrl(batchItem.url, topic);
              return {
                topic: derivedLabels.topic,
                subtopic: derivedLabels.subtopic ?? subtopic,
                version: derivedLabels.version ?? version,
              };
            })(),
          }));

          const { error: insertErr } = await supabase.from("document_chunks").insert(rows);
          if (insertErr) throw new Error(insertErr.message);
          totalVectors += rows.length;
          embeddingIndex += batchItem.chunks.length;
          await writeEvent("ingest", `Inserted ${rows.length} chunks`, "info", { url: batchItem.url });
        }

        // Clear the batch
        embeddingBatch.length = 0;
      }

      await updateProgress({ processed: i + 1 });
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);
    await updateProgress({ step: "completed" });
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
