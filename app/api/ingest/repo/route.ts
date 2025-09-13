import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestRepoRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";

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
    const parsed = ingestRepoRequestSchema.parse(body);

    // Basic validation for GitHub URL
    try {
      const u = new URL(parsed.repoUrl);
      if (u.hostname !== "github.com") throw new Error("Only GitHub repos are supported in v1");
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
            repoUrl: parsed.repoUrl,
            paths: parsed.paths ?? [],
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
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
