import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { externalGetWithRetry } from "@/services/http.services";
import { suggestCrawlHeuristics } from "@/services/ai.services";
import * as cheerio from "cheerio";
import { resolvePlannerBootstrap } from "@/utils/ingest-planner.utils";

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

    const planner = await resolvePlannerBootstrap({
      domain,
      seeds,
      includePatterns,
      excludePatterns,
      depthMap,
      useAiPlanner,
    });

    const pages = await crawlWebsite({
      seeds: planner.seeds,
      domain,
      prefix: prefix ?? undefined,
      depth,
      maxPages,
      crawlDelayMs,
      includePatterns: planner.includePatterns,
      excludePatterns: planner.excludePatterns,
      depthMap: planner.depthMap,
    });

    // MDN-specific section counts removed; planner is source-agnostic

    // Quota-applied preview (optional, source-agnostic)
    const quotaPreview = (() => {
      if (!applyQuotas) return undefined;
      const max = Math.max(1, Math.min(maxPages, pages.length));
      return { requested: max };
    })();

    return NextResponse.json({
      ok: true,
      count: pages.length,
      pages: (returnAllPages ? pages : pages.slice(0, 200)).map((p) => ({ url: p.url, title: p.title })),
      sections: undefined,
      quotas: quotaPreview,
      debug: { useAiPlanner, aiUsed: planner.aiUsed, topic: topic ?? null, returnAllPages, applyQuotas },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
