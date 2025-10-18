import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestRepoRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) {
        userId = DEV_DEFAULT_USER_ID;
      } else {
        return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
      }
    }

    const body = await req.json();
    const parsed = ingestRepoRequestSchema.parse(body);

    // Basic validation for GitHub URL and auto-derive paths if a GitHub tree subdirectory URL was provided
    let resolvedRepoUrl = parsed.repoUrl;
    let resolvedPaths: string[] = Array.isArray(parsed.paths) ? parsed.paths : [];
    try {
      const u = new URL(parsed.repoUrl);
      if (u.hostname !== "github.com") throw new Error("Only GitHub repos are supported in v1");
      // Example: https://github.com/mdn/content/tree/main/files/en-us/web/javascript
      const segments = u.pathname.split("/").filter(Boolean);
      const treeIdx = segments.indexOf("tree");
      if (treeIdx !== -1 && segments.length > treeIdx + 2) {
        const owner = segments[0];
        const repo = segments[1];
        const subdir = segments.slice(treeIdx + 2).join("/");
        resolvedRepoUrl = `https://github.com/${owner}/${repo}`;
        if ((resolvedPaths?.length ?? 0) === 0 && subdir) {
          resolvedPaths = [subdir];
        }
      }
    } catch (e: any) {
      return NextResponse.json({ ok: false, message: e?.message ?? "Invalid repository URL" }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();

    // Create ingestion row in pending state. Client will call /api/ingest/repo/process to execute.
    const { data: row, error } = await supabase
      .from("ingestions")
      .insert([
        {
          user_id: userId,
          content_category: "interview-docs",
          metadata: {
            topic: parsed.topic,
            subtopic: parsed.subtopic ?? null,
            version: parsed.version ?? null,
            mode: "repo",
            // Store canonical repo URL and any derived paths from a /tree/<branch>/<subdir> input
            repoUrl: resolvedRepoUrl,
            paths: resolvedPaths ?? [],
            maxFiles: parsed.maxFiles ?? 200,
          },
          objects: [],
          status: "pending",
        },
      ])
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create ingestion");

    return NextResponse.json({
      ok: true,
      ingestionId: row.id as string,
      message: "Ingestion created",
      chunks: 0,
      vectors: 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
