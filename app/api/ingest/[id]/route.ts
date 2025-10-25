import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import type { IDocumentRow } from "@/types/ingestion.types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("ingestions")
      .select("id, status, error, created_at, metadata")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (error || !data) return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.NOT_FOUND }, { status: 404 });

    // Derived progress: documentsProcessed, chunksProcessed/vectorsStored, coverage, recent
    // Fetch documents for this ingestion (limited fanout for v1; jobs are capped to <=200 files)
    const { data: documentsRows } = await supabase
      .from("documents")
      .select("id, title, path, labels")
      .eq("ingestion_id", id)
      .limit(1000);

    const documentsProcessed = Array.isArray(documentsRows) ? documentsRows.length : 0;
    const documentIds = (documentsRows ?? ([] as IDocumentRow[])).map((d) => d.id as string);

    // Count chunks for these documents
    let chunksProcessed = 0;
    if (documentIds.length > 0) {
      const { count: chunksCount } = await supabase
        .from("document_chunks")
        .select("id", { count: "exact", head: true })
        .in("document_id", documentIds);
      chunksProcessed = chunksCount ?? 0;
    }

    // Coverage: derive distinct labels seen so far (topic, subtopic, version)
    const topicSet = new Set<string>();
    const subtopicSet = new Set<string>();
    const versionSet = new Set<string>();
    for (const row of documentsRows ?? ([] as IDocumentRow[])) {
      const labels = row?.labels as Record<string, unknown> | null | undefined;
      if (labels && typeof labels === "object") {
        const topic = labels["topic"];
        const subtopic = labels["subtopic"];
        const version = labels["version"];
        if (typeof topic === "string" && topic.length > 0) topicSet.add(topic);
        if (typeof subtopic === "string" && subtopic.length > 0) subtopicSet.add(subtopic);
        if (typeof version === "string" && version.length > 0) versionSet.add(version);
      }
    }

    // Recent: up to 5 documents (best-effort ordering by id desc due to missing created_at on documents)
    const { data: recentDocs } = await supabase
      .from("documents")
      .select("title, path")
      .eq("ingestion_id", id)
      .order("id", { ascending: false })
      .limit(5);

    // Coverage counts
    const coverageCounts = {
      subtopics: Array.from(subtopicSet).reduce<Record<string, number>>((acc, s) => {
        acc[s] = (documentsRows ?? ([] as IDocumentRow[])).filter(
          (d) => (d?.labels as Record<string, unknown> | null)?.["subtopic"] === s
        ).length;
        return acc;
      }, {}),
      versions: Array.from(versionSet).reduce<Record<string, number>>((acc, v) => {
        acc[v] = (documentsRows ?? ([] as IDocumentRow[])).filter(
          (d) => (d?.labels as Record<string, unknown> | null)?.["version"] === v
        ).length;
        return acc;
      }, {}),
    } as const;

    // Recent events (best-effort, last 10)
    const { data: recentEvents } = await supabase
      .from("ingestion_events")
      .select("created_at, stage, level, message")
      .eq("ingestion_id", id)
      .order("created_at", { ascending: false })
      .limit(10);

    const response = {
      ok: true,
      ...data,
      progress: {
        documentsProcessed,
        chunksProcessed,
        vectorsStored: chunksProcessed,
        coverage: {
          topics: Array.from(topicSet),
          subtopics: Array.from(subtopicSet),
          versions: Array.from(versionSet),
          counts: coverageCounts,
        },
        recent: (recentDocs ?? ([] as Array<{ title: string | null; path: string }>)).map((d) => ({
          title: (d?.title as string | null) ?? null,
          path: d?.path as string,
        })),
      },
      inflight: (data?.metadata as Record<string, unknown>)?.["progress"] ?? null,
      events: recentEvents ?? [],
    } as const;

    return NextResponse.json(response);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, message: error.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
