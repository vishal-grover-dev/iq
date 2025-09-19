import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/utils/auth.utils";
import { DEV_DEFAULT_USER_ID } from "@/constants/app.constants";
import { crawlWebsite } from "@/utils/web-crawler.utils";
import { externalGetWithRetry } from "@/services/http.services";
import { suggestCrawlHeuristics } from "@/services/ai.services";
import * as cheerio from "cheerio";

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

    // Optional AI planner: derive includePatterns/depthMap/seeds suggestions
    let incPatterns: string[] | undefined =
      Array.isArray(includePatterns) && includePatterns.length ? includePatterns : undefined;
    let excPatterns: string[] | undefined =
      Array.isArray(excludePatterns) && excludePatterns.length ? excludePatterns : undefined;
    let dmapFinal: Record<string, number> | undefined =
      typeof depthMap === "object" && depthMap && Object.keys(depthMap).length
        ? (depthMap as Record<string, number>)
        : undefined;

    let seedsEffective: string[] | undefined = Array.isArray(seeds) && seeds.length ? seeds : undefined;
    let aiUsed = false;
    if (useAiPlanner || (!incPatterns && !dmapFinal)) {
      const firstSeed = seedsEffective && seedsEffective.length ? seedsEffective[0] : undefined;
      if (firstSeed) {
        const html = await externalGetWithRetry(firstSeed);
        if (html) {
          const $ = cheerio.load(html);
          const navPaths: Array<{ path: string; title?: string | null }> = $("a[href]")
            .map((_, el) => $(el).attr("href") || "")
            .get()
            .filter(Boolean)
            .slice(0, 50)
            .map((href) => {
              try {
                const u = new URL(href, firstSeed);
                return u.hostname.endsWith(domain) ? { path: u.pathname, title: null } : null;
              } catch {
                return null;
              }
            })
            .filter(Boolean) as Array<{ path: string; title?: string | null }>;

          const ai = await suggestCrawlHeuristics({ url: firstSeed, htmlPreview: html, navigationPreview: navPaths });
          if (!incPatterns || incPatterns.length === 0) incPatterns = ai.includePatterns;
          if (!dmapFinal) dmapFinal = ai.depthMap;
          if ((!seedsEffective || seedsEffective.length === 0) && ai.seeds && ai.seeds.length) {
            seedsEffective = ai.seeds;
          }
          // Source-agnostic: do not inject hardcoded seeds or patterns for specific sites
          aiUsed = true;
        }
      }
    }

    const pages = await crawlWebsite({
      seeds: seedsEffective,
      domain,
      prefix: prefix ?? undefined,
      depth,
      maxPages,
      crawlDelayMs,
      includePatterns: incPatterns,
      excludePatterns: excPatterns,
      depthMap: dmapFinal,
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
      debug: { useAiPlanner, aiUsed, topic: topic ?? null, returnAllPages, applyQuotas },
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err?.message ?? "Internal error" }, { status: 500 });
  }
}
