import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { resolvePlannerBootstrap } from "@/utils/ingest-planner.utils";
import { resolveLabels } from "@/utils/label-resolver.utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    let userId = await getAuthenticatedUserId();
    if (!userId) {
      if (DEV_DEFAULT_USER_ID) userId = DEV_DEFAULT_USER_ID;
      else return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as any;
    const {
      seeds,
      domain,
      prefix,
      depth = 2,
      maxPages = 50,
      crawlDelayMs = 300,
      includePatterns = [],
      excludePatterns = [],
      depthMap = {},
      useAiPlanner = false,
      topic,
      returnAllPages = false,
      applyQuotas = false,
    } = body ?? {};

    if (!Array.isArray(seeds) || seeds.length === 0) {
      return NextResponse.json({ ok: false, message: "Provide seeds[]" }, { status: 400 });
    }
    if (!domain) return NextResponse.json({ ok: false, message: "domain is required" }, { status: 400 });

    // Downward-only plan from the exact seed path
    const planner = { seeds } as any;

    const pages = await crawlWebsite({
      seeds: planner.seeds,
      domain,
      prefix: (() => {
        try {
          const u = new URL(seeds[0]);
          return u.pathname || "/";
        } catch {
          return undefined;
        }
      })(),
      depth,
      maxPages,
      crawlDelayMs,
      includePatterns: undefined,
      excludePatterns: undefined,
      depthMap: undefined,
    });

    // Optional preflight dry-run labeling on a small sample to expose distribution and low-confidence
    const sampleSize = Math.min(1, pages.length);
    const sample = pages.slice(0, sampleSize);
    const distribution: Record<string, number> = {};
    let lowConfidence = 0;
    for (const p of sample) {
      const labeled = await resolveLabels({
        source: "web",
        url: p.url,
        title: p.title ?? undefined,
        topicHint: topic ?? undefined,
      });
      const key = `${labeled.topic}|${labeled.subtopic ?? "(null)"}`;
      distribution[key] = (distribution[key] ?? 0) + 1;
      if ((labeled.subtopic ?? null) === null) lowConfidence += 1;
    }

    // MDN-specific section counts removed; planner is source-agnostic

    // Quota-applied preview (optional, source-agnostic)
    const quotaPreview = undefined;

    return NextResponse.json({
      ok: true,
      count: pages.length,
      pages: (returnAllPages ? pages : pages.slice(0, 200)).map((p) => ({ url: p.url, title: p.title })),
      sections: undefined,
      quotas: quotaPreview,
      debug: { useAiPlanner: false, aiUsed: false, topic: topic ?? null, returnAllPages, applyQuotas },
      preflight: {
        sampled: sampleSize,
        lowConfidenceRate: sampleSize > 0 ? lowConfidence / sampleSize : 0,
        distribution,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
