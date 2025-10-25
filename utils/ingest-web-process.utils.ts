import type { SupabaseClient } from "@supabase/supabase-js";
import type { IWebPageItem } from "@/types/ingestion.types";
import { extractMainContent, assessContentQuality } from "@/services/server/source-intelligence.service";
import { resolveLabels } from "@/services/server/labeling.service";
import { EIngestionMode } from "@/types/ingestion.types";
import { chunkTextLC } from "@/utils/langchain.utils";
import { createHash } from "crypto";

export type TChunk = { index: number; content: string; tokens: number };

export interface IPreparedBatchItem {
  documentId: string;
  chunks: TChunk[];
  url: string;
}

export async function prefilterExistingWebPages(
  supabase: SupabaseClient,
  pages: IWebPageItem[],
  maxPages?: number
): Promise<{ selectedPages: IWebPageItem[]; existingCount: number }> {
  const plannedUrls = pages.map((p) => p.url);
  const { data: existingDocs } = await supabase
    .from("documents")
    .select("path")
    .eq("bucket", "web")
    .in("path", plannedUrls);
  const existingSet = new Set<string>((existingDocs ?? []).map((d: { path: string }) => d.path));
  const freshPages = pages.filter((p) => !existingSet.has(p.url));
  const selectedPages = freshPages.slice(0, maxPages ?? freshPages.length);
  return { selectedPages, existingCount: existingSet.size };
}

export interface IAssessContext {
  topic: string | null | undefined;
  subtopic: string | null | undefined;
  version: string | null | undefined;
}

export type TAssessResult =
  | { kind: "skip"; reason: string; meta?: Record<string, number | string> }
  | { kind: "prepared"; item: IPreparedBatchItem };

export async function assessAndPreparePage(
  supabase: SupabaseClient,
  ingestionId: string,
  page: IWebPageItem,
  ctx: IAssessContext,
  seenHashes: Set<string>,
  shinglesList: Array<Set<string>>
): Promise<TAssessResult> {
  // Content quality assessment
  const qualityCheck = assessContentQuality(page.content, page.html);
  if (!qualityCheck.isAcceptable) {
    return { kind: "skip", reason: "low_quality", meta: { score: qualityCheck.score } };
  }

  // Dedup by content hash
  const normalized = page.content.replace(/\s+/g, " ").trim();
  const hashHex = createHash("sha256").update(normalized).digest("hex");
  if (seenHashes.has(hashHex)) {
    return { kind: "skip", reason: "duplicate_hash" };
  }

  // Near-duplicate via 5-word shingles + Jaccard
  const tokens = normalized
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const shingles: string[] = [];
  for (let j = 0; j + 4 < tokens.length; j++) shingles.push(tokens.slice(j, j + 5).join(" "));
  const shingleSet = new Set(shingles);
  for (const prior of shinglesList) {
    let inter = 0;
    for (const s of shingleSet) if (prior.has(s)) inter++;
    const union = prior.size + shingleSet.size - inter;
    const jaccard = union > 0 ? inter / union : 0;
    if (jaccard >= 0.9) {
      return { kind: "skip", reason: "near_duplicate", meta: { jaccard } };
    }
  }

  // Persist dedupe state
  seenHashes.add(hashHex);
  shinglesList.push(shingleSet);

  // Upsert document and get id
  let documentId: string | null = null;
  const upsertRes = await supabase
    .from("documents")
    .upsert(
      [
        {
          ingestion_id: ingestionId,
          bucket: "web",
          path: page.url,
          mime_type: "text/html",
          title: page.title,
          labels: await (async () => {
            const resolved = await resolveLabels({
              source: EIngestionMode.WEB,
              url: page.url,
              title: page.title ?? undefined,
              topicHint: ctx.topic ?? undefined,
              subtopicHint: ctx.subtopic ?? undefined,
              versionHint: ctx.version ?? undefined,
            });
            return { topic: resolved.topic, subtopic: resolved.subtopic, version: resolved.version };
          })(),
        },
      ],
      { onConflict: "bucket,path", ignoreDuplicates: true }
    )
    .select("id");
  if (upsertRes.error) {
    throw new Error(upsertRes.error.message);
  }
  if (upsertRes.data && upsertRes.data.length > 0) {
    documentId = (upsertRes.data[0] as { id: string }).id;
  } else {
    const { data: existingDoc, error: selErr } = await supabase
      .from("documents")
      .select("id")
      .eq("bucket", "web")
      .eq("path", page.url)
      .single();
    if (selErr || !existingDoc) throw new Error(selErr?.message ?? "Failed to get existing document id");
    documentId = (existingDoc as { id: string }).id;
  }

  // Extract main content and chunk
  const mainHtml = extractMainContent(page.html);
  const textForChunking = mainHtml
    ? mainHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    : page.content;
  const chunks = await chunkTextLC(textForChunking, { chunkSize: 1800, overlap: 200 });

  // Persist num_pages proxy
  try {
    await supabase.from("documents").update({ num_pages: chunks.length }).eq("id", documentId);
  } catch {}

  return { kind: "prepared", item: { documentId, chunks, url: page.url } };
}

export async function insertChunksBatch(
  supabase: SupabaseClient,
  batch: IPreparedBatchItem[],
  ctx: IAssessContext,
  getEmbeddingsFn: (inputs: string[]) => Promise<number[][]>
): Promise<{ inserted: number; perItem: number[] }> {
  const allChunks = batch.flatMap((item) => item.chunks.map((c) => c.content));
  const embeddings = await getEmbeddingsFn(allChunks);

  let offset = 0;
  const perItem: number[] = [];
  for (const item of batch) {
    const resolved = await resolveLabels({
      source: EIngestionMode.WEB,
      url: item.url,
      topicHint: ctx.topic ?? undefined,
      subtopicHint: ctx.subtopic ?? undefined,
      versionHint: ctx.version ?? undefined,
    });
    const rows = item.chunks.map((c, idx) => ({
      document_id: item.documentId,
      chunk_index: c.index,
      content: c.content,
      tokens: c.tokens,
      embedding: embeddings[offset + idx] as number[],
      labels: { topic: resolved.topic, subtopic: resolved.subtopic, version: resolved.version },
    }));
    const { error: insertErr } = await supabase.from("document_chunks").insert(rows);
    if (insertErr) throw new Error(insertErr.message);
    perItem.push(rows.length);
    offset += rows.length;
  }

  return { inserted: allChunks.length, perItem };
}
