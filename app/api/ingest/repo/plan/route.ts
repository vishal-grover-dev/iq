import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { API_ERROR_MESSAGES } from "@/constants/api.constants";
import { parseRepoUrl, getDefaultBranch, listMarkdownPaths } from "@/utils/repo.utils";
import { resolveLabels } from "@/utils/label-resolver.utils";
import type { IRepoPlanRequest } from "@/types/ingestion.types";

export const runtime = "nodejs";

/**
 * POST /api/ingest/repo/plan
 * Input: { repoUrl: string, paths?: string[], batchSize?: number }
 * - Supports GitHub tree URLs; derives paths automatically when not provided
 * Output: { ok, total, batchSize, slices: Array<{ name, start, end, count }>, categories }
 */
export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: API_ERROR_MESSAGES.UNAUTHORIZED }, { status: 401 });
    }

    const body = (await req.json()) as IRepoPlanRequest;
    let { repoUrl, paths, batchSize } = body ?? {};
    if (!repoUrl || typeof repoUrl !== "string")
      return NextResponse.json({ ok: false, message: "repoUrl is required" }, { status: 400 });
    batchSize = Math.max(1, Math.min(Number(batchSize ?? 200), 200));

    // Normalize GitHub tree URL → base repo + derived path
    try {
      const u = new URL(repoUrl);
      if (u.hostname !== "github.com") throw new Error("Only GitHub repos are supported in v1");
      const segs = u.pathname.split("/").filter(Boolean);
      const idx = segs.indexOf("tree");
      if (idx !== -1 && segs.length > idx + 2) {
        const owner = segs[0];
        const repo = segs[1];
        const subdir = segs.slice(idx + 2).join("/");
        repoUrl = `https://github.com/${owner}/${repo}`;
        if ((!Array.isArray(paths) || paths.length === 0) && subdir) paths = [subdir];
      }
    } catch (e: unknown) {
      const error = e instanceof Error ? e : new Error(String(e));
      return NextResponse.json({ ok: false, message: error.message ?? "Invalid repository URL" }, { status: 400 });
    }

    const { owner, repo } = parseRepoUrl(repoUrl);
    const branch = await getDefaultBranch(owner, repo);
    const mdPaths = await listMarkdownPaths(owner, repo, branch, Array.isArray(paths) ? paths : []);

    // Group by category (mdn js typical): guide/*, reference/<cat>/*, otherwise first segment
    const basePrefix = Array.isArray(paths) && paths[0] ? paths[0] + "/" : "";
    const toTitle = (s: string) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
    const categories: Record<string, number> = {};
    for (const p of mdPaths) {
      const rel = basePrefix && p.startsWith(basePrefix) ? p.slice(basePrefix.length) : p;
      const segs = rel.split("/").filter(Boolean);
      let key = segs[0] ?? "(root)";
      if (segs[0] === "reference" && segs[1]) key = `reference/${segs[1]}`;
      categories[key] = (categories[key] ?? 0) + 1;
    }

    // Build batch slices: preserve original order and chunk into batchSize
    const slices: Array<{ name: string; start: number; end: number; count: number }> = [];
    for (let i = 0; i < mdPaths.length; i += batchSize) {
      const end = Math.min(i + batchSize, mdPaths.length);
      slices.push({ name: `Batch ${Math.floor(i / batchSize) + 1}`, start: i, end, count: end - i });
    }

    // Preflight dry-run: sample first N paths and classify
    const sampleSize = Math.min(30, mdPaths.length);
    const sample = mdPaths.slice(0, sampleSize);
    const distribution: Record<string, number> = {};
    let lowConfidence = 0;
    for (const p of sample) {
      const labeled = await resolveLabels({
        source: "repo",
        path: p,
        topicHint: undefined,
        title: undefined,
        repoOwner: owner,
        repoName: repo,
      });
      const key = `${labeled.topic}|${labeled.subtopic ?? "(null)"}`;
      distribution[key] = (distribution[key] ?? 0) + 1;
      if ((labeled.subtopic ?? null) === null) lowConfidence += 1;
    }

    return NextResponse.json({
      ok: true,
      total: mdPaths.length,
      batchSize,
      slices,
      categories: Object.fromEntries(Object.entries(categories).map(([k, v]) => [toTitle(k.replace("/", "/")), v])),
      preflight: {
        sampled: sampleSize,
        lowConfidenceRate: sampleSize > 0 ? lowConfidence / sampleSize : 0,
        distribution,
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    return NextResponse.json(
      { ok: false, message: error.message ?? API_ERROR_MESSAGES.INTERNAL_ERROR },
      { status: 500 }
    );
  }
}
