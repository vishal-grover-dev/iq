import { getSupabaseBrowserClient } from "@/utils/supabase.utils";
import { buildAcademicDirectoryPath, fileNameWithTimestamp } from "@/utils/upload.utils";
import { IAcademicPathContext } from "@/types/upload.types";
import { SUPABASE_ACADEMICS_BUCKET } from "@/constants/app.constants";

/**
 * Uploads a batch of Academic files into Supabase Storage using a deterministic
 * directory structure derived from the provided context. Uses anon browser client.
 * Returns uploaded object paths for downstream processing.
 */
export async function uploadAcademicFiles(
  ctx: IAcademicPathContext,
  files: File[]
): Promise<{ path: string; fullPath: string }[]> {
  if (!files || files.length === 0) return [];

  const client = getSupabaseBrowserClient();

  const baseDir = buildAcademicDirectoryPath({
    board: ctx.board,
    grade: ctx.grade,
    subject: ctx.subject,
    resourceType: ctx.resourceType,
    chapterNumber: ctx.chapterNumber,
    chapterName: ctx.chapterName,
  });

  const results: { path: string; fullPath: string }[] = [];

  for (const file of files) {
    const objectName = `${baseDir}/${fileNameWithTimestamp(file.name)}`;
    const { error } = await client.storage.from(SUPABASE_ACADEMICS_BUCKET).upload(objectName, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (error) {
      throw new Error(`Upload failed for ${file.name}: ${error.message}`);
    }
    results.push({ path: objectName, fullPath: `${SUPABASE_ACADEMICS_BUCKET}/${objectName}` });
  }

  return results;
}
