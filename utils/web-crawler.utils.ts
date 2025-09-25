import robotsParser from "robots-parser";
import * as cheerio from "cheerio";
import { assessContentQuality, extractMainContent } from "@/utils/intelligent-web-adapter.utils";
import { externalGetWithRetry } from "@/services/http.services";
import { normalizeUrl } from "@/utils/url.utils";
function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// normalizeUrl is centralized in utils/url.utils.ts

// Content quality is now centralized via assessContentQuality() in intelligent-web-adapter.utils

export interface IWebCrawlConfig {
  seeds?: string[];
  domain: string; // e.g., developer.mozilla.org
  prefix?: string; // e.g., /en-US/docs/Web/JavaScript/
  depth: number; // default depth for unspecified paths
  maxPages: number;
  crawlDelayMs: number;
  includePatterns?: string[]; // regex strings
  excludePatterns?: string[]; // regex strings
  depthMap?: Record<string, number>; // pathname prefix -> depth override
}

export interface IWebPageItem {
  url: string;
  title: string;
  content: string;
  html?: string;
  depth: number;
}

// Simple in-memory cache for robots.txt
const robotsCache = new Map<string, { robots: any | null; timestamp: number }>();
const ROBOTS_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function fetchRobots(base: string) {
  const robotsUrl = new URL("/robots.txt", base).toString();
  const cacheKey = new URL(base).origin;

  // Check cache first
  const cached = robotsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ROBOTS_CACHE_TTL) {
    return cached.robots;
  }

  try {
    const txt = await externalGetWithRetry(robotsUrl, { maxRetries: 2, delayMs: 500 });
    if (txt === null) {
      // Cache negative result
      robotsCache.set(cacheKey, { robots: null, timestamp: Date.now() });
      return null;
    }
    const robots = robotsParser(robotsUrl, txt);

    // Cache the result
    robotsCache.set(cacheKey, { robots, timestamp: Date.now() });
    return robots;
  } catch {
    // Cache negative result on error
    robotsCache.set(cacheKey, { robots: null, timestamp: Date.now() });
    return null;
  }
}

// fetchWithRetry is centralized in utils/http.utils.ts

export async function crawlWebsite(config: IWebCrawlConfig): Promise<IWebPageItem[]> {
  const { seeds, domain, prefix, depth, maxPages, crawlDelayMs, includePatterns, excludePatterns, depthMap } = config;
  const resolvedSeeds = (seeds && seeds.length > 0 ? seeds : []).map(normalizeUrl);
  if (resolvedSeeds.length === 0) return [];
  const origin = new URL(resolvedSeeds[0]).origin;
  const robots = await fetchRobots(origin);

  const q: Array<{ url: string; d: number }> = resolvedSeeds.map((s) => ({ url: s, d: 0 }));
  const visited = new Set<string>();
  const out: IWebPageItem[] = [];

  const includeRegexes = (includePatterns ?? [])
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as RegExp[];
  // Default excludes to reduce noise (e.g., non-article assets)
  const defaultExcludeRegexes: RegExp[] = [/contributors\.txt$/i];
  const excludeRegexes = (excludePatterns ?? [])
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as RegExp[];
  const combinedExcludeRegexes = [...defaultExcludeRegexes, ...excludeRegexes];

  while (q.length > 0 && out.length < maxPages) {
    const { url, d } = q.shift()!;
    const canonical = normalizeUrl(url);
    if (visited.has(canonical)) continue;
    visited.add(canonical);

    const u = new URL(url);
    if (u.hostname !== domain) continue;
    if (prefix && !u.pathname.startsWith(prefix)) continue;
    // Allow fetching the root seed even if it doesn't match include patterns, so we can discover links.
    const matchesInclude = includeRegexes.length === 0 || includeRegexes.some((re) => re.test(u.pathname));
    if (!matchesInclude && d > 0) continue;
    if (combinedExcludeRegexes.length > 0 && combinedExcludeRegexes.some((re) => re.test(u.pathname))) continue;
    if (robots && !robots.isAllowed(url, "*")) continue;

    const html = await externalGetWithRetry(canonical);
    if (!html) continue;

    try {
      const $ = cheerio.load(html);
      const title = ($("title").first().text() || $("h1").first().text() || url).trim();
      const mainHtml = extractMainContent(html) ?? html;
      const content = mainHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Apply content quality filters using centralized heuristic
      const quality = assessContentQuality(content, html);
      // Always include depth 0 (seed) if it's acceptable quality, even if includePatterns
      // do not match. This prevents zero-coverage runs when planner patterns are narrow.
      if (content.length > 0 && quality.isAcceptable && (matchesInclude || d === 0)) {
        out.push({ url: canonical, title, content, html, depth: d });
      }

      const currentDepthLimit = (() => {
        if (!depthMap) return depth;
        // Find the longest matching prefix in depthMap
        let best: number | null = null;
        let bestLen = -1;
        for (const key of Object.keys(depthMap)) {
          if (u.pathname.startsWith(key) && key.length > bestLen) {
            best = depthMap[key]!;
            bestLen = key.length;
          }
        }
        return best ?? depth;
      })();

      if (d < currentDepthLimit) {
        // Discover links from the entire document instead of only the main/article root.
        // Many documentation sites place navigational links (sidebars/menus) outside of main,
        // which are essential for breadth-first traversal. Using the whole document here
        // significantly improves coverage while content extraction above still prefers main/article.
        const links = $("a[href]")
          .map((_, el) => $(el).attr("href") || "")
          .get()
          .filter(Boolean)
          .map((href) => {
            try {
              return new URL(href, canonical).toString();
            } catch {
              return "";
            }
          })
          .filter(Boolean)
          .map(normalizeUrl);
        for (const ln of links) {
          try {
            const lnUrl = new URL(ln);
            if (lnUrl.hostname !== domain) continue;
            if (prefix && !lnUrl.pathname.startsWith(prefix)) continue;
            // Loosen include filtering at shallow depth to avoid empty crawls when patterns are too narrow
            if (includeRegexes.length > 0 && d >= 1 && !includeRegexes.some((re) => re.test(lnUrl.pathname))) continue;
            if (combinedExcludeRegexes.length > 0 && combinedExcludeRegexes.some((re) => re.test(lnUrl.pathname)))
              continue;
          } catch {
            // ignore invalid url
          }
          if (!visited.has(ln)) q.push({ url: ln, d: d + 1 });
        }
      }
    } catch {
      // swallow and continue
    }

    if (out.length >= maxPages) break;
    if (crawlDelayMs > 0) await sleep(crawlDelayMs);
  }

  return out.slice(0, maxPages);
}

// MDN-specific section helpers removed to keep the crawler source-agnostic
