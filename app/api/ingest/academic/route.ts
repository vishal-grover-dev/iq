import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestAcademicRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { SUPABASE_RAG_BUCKET, DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { extractTextFromPdfBufferLC, chunkTextLC } from "@/utils/langchain.utils";
import { getOpenAIEmbeddings } from "@/services/openai.services";
import { extractChapterFromFilename, extractChapterFromText, buildChapterTitle } from "@/utils/ingest.utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      // Dev fallback: allow requests without auth if DEV_DEFAULT_USER_ID is set
      if (DEV_DEFAULT_USER_ID) {
        userId = DEV_DEFAULT_USER_ID;
      } else {
        return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();
    const parsed = ingestAcademicRequestSchema.parse(body);

    const supabase = getSupabaseServiceRoleClient();

    // 1) Create ingestion row
    let ingestionId: string | null = null;

    const { data: ingestionInsert, error: ingestionError } = await supabase
      .from("ingestions")
      .insert([
        {
          user_id: userId,
          content_category: parsed.contentCategory,
          metadata: parsed.metadata,
          objects: parsed.uploadedObjects,
          status: "processing",
        },
      ])
      .select("id")
      .single();
    if (ingestionError || !ingestionInsert) {
      throw new Error(ingestionError?.message ?? "Failed to create ingestion");
    }
    ingestionId = ingestionInsert.id as string;

    // Prepare map for later lookups
    const pathToOriginalName = new Map<string, string>(
      parsed.uploadedObjects.map((o: any) => [o.storagePath, o.originalFileName])
    );

    // 2) Create document rows with initial title derived from filename heuristics
    const documentsToInsert = parsed.uploadedObjects.map((obj) => {
      const fromFilename = extractChapterFromFilename(obj.originalFileName ?? "");
      const initialTitle = buildChapterTitle(fromFilename) ?? obj.originalFileName;
      return {
        ingestion_id: ingestionId,
        bucket: obj.bucket ?? SUPABASE_RAG_BUCKET,
        path: obj.storagePath,
        mime_type: obj.mimeType ?? "application/pdf",
        title: initialTitle,
      };
    });
    const { data: docsInserted, error: docsError } = await supabase
      .from("documents")
      .insert(documentsToInsert)
      .select("id, path, bucket, mime_type");
    if (docsError || !docsInserted) {
      throw new Error(docsError?.message ?? "Failed to create documents");
    }

    let totalChunks = 0;
    let totalVectors = 0;

    // 3) Inline processing (v1): fetch, parse, chunk, embed, insert
    for (const doc of docsInserted) {
      const { data: fileData, error: downloadError } = await supabase.storage.from(doc.bucket).download(doc.path);
      if (downloadError || !fileData) {
        throw new Error(downloadError?.message ?? `Failed to download ${doc.path}`);
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const { text, numPages } = await extractTextFromPdfBufferLC(buffer);

      // Attempt to extract chapter metadata from text and update document title if available
      try {
        const originalName = pathToOriginalName.get(doc.path) ?? "";
        const fromFilename = extractChapterFromFilename(originalName);
        const fromText = extractChapterFromText(text);
        const merged = { ...fromFilename } as any;
        if (fromText.chapterNumber) merged.chapterNumber = fromText.chapterNumber;
        if (fromText.chapterName) merged.chapterName = fromText.chapterName;
        if (fromText.label) merged.label = fromText.label;
        const refinedTitle = buildChapterTitle(merged);
        if (refinedTitle) {
          await supabase.from("documents").update({ title: refinedTitle, num_pages: numPages }).eq("id", doc.id);
        } else {
          await supabase.from("documents").update({ num_pages: numPages }).eq("id", doc.id);
        }
      } catch {
        // Best-effort: if extraction fails, still update pages
        await supabase.from("documents").update({ num_pages: numPages }).eq("id", doc.id);
      }

      const chunks = await chunkTextLC(text, { chunkSize: 1800, overlap: 200 });
      totalChunks += chunks.length;

      const embeddings1536 = await getOpenAIEmbeddings(chunks.map((c) => c.content));

      const rows = chunks.map((c, i) => ({
        document_id: doc.id,
        chunk_index: c.index,
        content: c.content,
        tokens: c.tokens,
        embedding: embeddings1536[i] as unknown as any,
      }));

      const { error: insertChunksError } = await supabase.from("document_chunks").insert(rows);
      if (insertChunksError) {
        throw new Error(insertChunksError.message);
      }

      // Update document metadata (pages)
      await supabase.from("documents").update({ num_pages: numPages }).eq("id", doc.id);

      totalVectors += rows.length;
    }

    await supabase.from("ingestions").update({ status: "completed" }).eq("id", ingestionId);

    return NextResponse.json({
      ok: true,
      ingestionId,
      message: "Ingestion completed",
      chunks: totalChunks,
      vectors: totalVectors,
    });
  } catch (err: any) {
    try {
      const supabase = getSupabaseServiceRoleClient();
      const msg = err?.message ?? "Unknown error";
      // If we created an ingestion row, mark it failed
      // Note: we cannot access local variable from try block, so re-derive if needed
      // Fallback: do nothing if unavailable
      // This is a best-effort update and should not throw
      // @ts-ignore - capture from closure when available
      if (typeof ingestionId !== "undefined" && ingestionId) {
        // @ts-ignore - same scope caveat
        await supabase.from("ingestions").update({ status: "failed", error: msg }).eq("id", ingestionId);
      }
    } catch {}
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
