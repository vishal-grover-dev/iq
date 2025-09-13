import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { crawlWebsite } from "@/utils/web-crawler.utils";

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
      seedUrl,
      seeds,
      domain,
      prefix,
      depth = 2,
      maxPages = 50,
      crawlDelayMs = 300,
      includePatterns = [],
      excludePatterns = [],
      depthMap = {},
    } = body ?? {};

    if (!seedUrl && (!Array.isArray(seeds) || seeds.length === 0)) {
      return NextResponse.json({ ok: false, message: "Provide seedUrl or seeds[]" }, { status: 400 });
    }
    if (!domain) return NextResponse.json({ ok: false, message: "domain is required" }, { status: 400 });

    const pages = await crawlWebsite({
      seedUrl: seedUrl ?? undefined,
      seeds: Array.isArray(seeds) ? seeds : undefined,
      domain,
      prefix: prefix ?? undefined,
      depth,
      maxPages,
      crawlDelayMs,
      includePatterns: Array.isArray(includePatterns) ? includePatterns : undefined,
      excludePatterns: Array.isArray(excludePatterns) ? excludePatterns : undefined,
      depthMap: typeof depthMap === "object" && depthMap ? (depthMap as Record<string, number>) : undefined,
    });

    return NextResponse.json({
      ok: true,
      count: pages.length,
      pages: pages.map((p) => ({ url: p.url, title: p.title })).slice(0, 200),
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
