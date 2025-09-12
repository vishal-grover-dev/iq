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

export interface IWebCrawlConfig {
  seedUrl: string;
  domain: string; // e.g., developer.mozilla.org
  prefix?: string; // e.g., /en-US/docs/Web/JavaScript/
  depth: number; // 0 = only seed
  maxPages: number;
  crawlDelayMs: number;
}

export interface IWebPageItem {
  url: string;
  title: string;
  content: string;
}

export async function fetchRobots(base: string) {
  const robotsUrl = new URL("/robots.txt", base).toString();
  try {
    const res = await fetch(robotsUrl);
    if (!res.ok) return null;
    const txt = await res.text();
    return robotsParser(robotsUrl, txt);
  } catch {
    return null;
  }
}

export async function crawlWebsite(config: IWebCrawlConfig): Promise<IWebPageItem[]> {
  const { seedUrl, domain, prefix, depth, maxPages, crawlDelayMs } = config;
  const origin = new URL(seedUrl).origin;
  const robots = await fetchRobots(origin);

  const q: Array<{ url: string; d: number }> = [{ url: normalizeUrl(seedUrl), d: 0 }];
  const visited = new Set<string>();
  const out: IWebPageItem[] = [];

  while (q.length > 0 && out.length < maxPages) {
    const { url, d } = q.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const u = new URL(url);
    if (u.hostname !== domain) continue;
    if (prefix && !u.pathname.startsWith(prefix)) continue;
    if (robots && !robots.isAllowed(url, "*")) continue;

    try {
      const res = await fetch(url, { headers: { "User-Agent": "iq-crawler" } as any });
      if (!res.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);
      const title = ($("title").first().text() || $("h1").first().text() || url).trim();
      const main = $("main");
      const article = $("article");
      const root = main.length ? main : article.length ? article : $("body");
      // Remove scripts/styles/navs/footers
      root.find("script,style,nav,footer,header").remove();
      const content = root.text().replace(/\s+/g, " ").trim();
      if (content.length > 0) out.push({ url, title, content });

      if (d < depth) {
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
