import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { ingestWebRequestSchema } from "@/schema/ingest.schema";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ingestWebRequestSchema.parse(body);

    const supabase = getSupabaseServiceRoleClient();
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
            mode: "web",
            seeds: parsed.seeds,
            domain: parsed.domain,
            // Downward-only mode: derive prefix strictly from the first seed path
            prefix: (() => {
              try {
                const first = (parsed.seeds ?? [])[0] as string;
                const u = new URL(first);
                return u.pathname || "/";
              } catch {
                return null;
              }
            })(),
            depth: parsed.depth,
            maxPages: parsed.maxPages,
            crawlDelayMs: parsed.crawlDelayMs,
            includePatterns: [],
            excludePatterns: [],
            depthMap: {},
            autoPlan: true,
            useAiPlanner: (body?.useAiPlanner ?? false) as boolean,
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
