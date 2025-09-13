import robotsParser from "robots-parser";
import * as cheerio from "cheerio";

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = ""; // drop anchors
    return u.toString();
  } catch {
    return url;
  }
}

function isContentQualityAcceptable(content: string, title: string): boolean {
  // Minimum content length (excluding whitespace)
  const cleanContent = content.trim();
  if (cleanContent.length < 100) return false;

  // Check for English content (basic heuristic)
  const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
  const matches = cleanContent.match(englishWords);
  if (!matches || matches.length < 3) return false;

  // Avoid pages that are mostly navigation or error pages
  const lowQualityIndicators = [
    /404.*not.*found/i,
    /page.*not.*found/i,
    /error.*occurred/i,
    /access.*denied/i,
    /under.*construction/i,
    /coming.*soon/i,
  ];

  const titleAndContent = (title + " " + cleanContent).toLowerCase();
  if (lowQualityIndicators.some((pattern) => pattern.test(titleAndContent))) {
    return false;
  }

  // Check content-to-noise ratio (avoid pages with too many repeated phrases)
  const words = cleanContent.toLowerCase().split(/\s+/);
  const uniqueWords = new Set(words);
  const uniqueRatio = uniqueWords.size / words.length;
  if (uniqueRatio < 0.3) return false; // Too repetitive

  return true;
}

export interface IWebCrawlConfig {
  seedUrl?: string;
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
    const res = await fetchWithRetry(robotsUrl, 2, 500);
    if (!res) {
      // Cache negative result
      robotsCache.set(cacheKey, { robots: null, timestamp: Date.now() });
      return null;
    }

    const txt = await res.text();
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

async function fetchWithRetry(url: string, maxRetries: number = 3, delay: number = 1000): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "iq-crawler" } as any,
        timeout: 10000, // 10 second timeout
      });
      if (res.ok) return res;
      if (res.status === 429) {
        // Rate limited, wait longer
        await sleep(delay * attempt * 2);
        continue;
      }
      if (res.status >= 400 && res.status < 500) {
        // Client error, don't retry
        return null;
      }
    } catch (error) {
      if (attempt === maxRetries) return null;
      await sleep(delay * attempt);
    }
  }
  return null;
}

export async function crawlWebsite(config: IWebCrawlConfig): Promise<IWebPageItem[]> {
  const { seedUrl, seeds, domain, prefix, depth, maxPages, crawlDelayMs, includePatterns, excludePatterns, depthMap } =
    config;
  const resolvedSeeds = (seeds && seeds.length > 0 ? seeds : seedUrl ? [seedUrl] : []).map(normalizeUrl);
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
  const excludeRegexes = (excludePatterns ?? [])
    .map((p) => {
      try {
        return new RegExp(p);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as RegExp[];

  while (q.length > 0 && out.length < maxPages) {
    const { url, d } = q.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const u = new URL(url);
    if (u.hostname !== domain) continue;
    if (prefix && !u.pathname.startsWith(prefix)) continue;
    if (includeRegexes.length > 0 && !includeRegexes.some((re) => re.test(u.pathname))) continue;
    if (excludeRegexes.length > 0 && excludeRegexes.some((re) => re.test(u.pathname))) continue;
    if (robots && !robots.isAllowed(url, "*")) continue;

    const res = await fetchWithRetry(url);
    if (!res) continue;

    try {
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = ($("title").first().text() || $("h1").first().text() || url).trim();
      const main = $("main");
      const article = $("article");
      const root = main.length ? main : article.length ? article : $("body");
      // Remove scripts/styles/navs/footers
      root.find("script,style,nav,footer,header").remove();
      const content = root.text().replace(/\s+/g, " ").trim();

      // Apply content quality filters
      if (content.length > 0 && isContentQualityAcceptable(content, title)) {
        out.push({ url, title, content, html });
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
        const links = root
          .find("a[href]")
          .map((_, el) => $(el).attr("href") || "")
          .get()
          .filter(Boolean)
          .map((href) => {
            try {
              return new URL(href, url).toString();
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
            if (includeRegexes.length > 0 && !includeRegexes.some((re) => re.test(lnUrl.pathname))) continue;
            if (excludeRegexes.length > 0 && excludeRegexes.some((re) => re.test(lnUrl.pathname))) continue;
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
