import path from "node:path";
import { load } from "cheerio";
import robotsParser, { type Robot } from "robots-parser";
import type { IGitHubTreeResponse, IWebPageItem } from "@/types/ingestion.types";
import { EIngestionMode } from "@/types/ingestion.types";
import { externalGetWithRetry } from "@/services/http.services";
import { normalizeUrl } from "@/utils/url.utils";
import { extractMainContent, assessContentQuality } from "@/services/server/source-intelligence.service";

/**
 * Repo Utilities
 */

export function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  try {
    const url = new URL(repoUrl);
    const [, owner, repo] = url.pathname.replace(/\.git$/, "").split("/");
    if (!owner || !repo) throw new Error("Invalid repo URL");
    return { owner, repo };
  } catch {
    throw new Error("Invalid GitHub repository URL");
  }
}

export async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) throw new Error(`Failed to resolve default branch: ${res.status}`);
  const data = (await res.json()) as { default_branch?: string };
  return data?.default_branch ?? "main";
}

export async function listMarkdownPaths(
  owner: string,
  repo: string,
  branch: string,
  prefixes: string[] = []
): Promise<string[]> {
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (!treeRes.ok) throw new Error(`Failed to list repo tree: ${treeRes.status}`);
  const tree = (await treeRes.json()) as IGitHubTreeResponse;
  const allPaths: string[] = Array.isArray(tree?.tree)
    ? tree.tree.filter((t) => t?.type === "blob").map((t) => String(t?.path))
    : [];
  const isMd = (p: string) => p.toLowerCase().endsWith(".md") || p.toLowerCase().endsWith(".mdx");
  const prefixFilter = (p: string) => prefixes.length === 0 || prefixes.some((pre) => p.startsWith(pre));
  return allPaths.filter((p) => isMd(p) && prefixFilter(p));
}

export async function fetchRawFile(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${filePath}: ${res.status}`);
  return await res.text();
}

export function deriveTitleFromMarkdown(filePath: string, content: string): string {
  const lines = content.split(/\r?\n/);
  const h1 = lines.find((l) => /^#\s+/.test(l));
  if (h1) return h1.replace(/^#\s+/, "").trim();
  return path.basename(filePath).replace(/\.(md|mdx)$/i, "");
}

export interface IRepoMarkdownFile {
  path: string;
  content: string;
  title: string;
}

export async function getRepoMarkdownFiles(
  repoUrl: string,
  paths: string[] = [],
  maxFiles: number = 200
): Promise<IRepoMarkdownFile[]> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const branch = await getDefaultBranch(owner, repo);
  const mdPaths = (await listMarkdownPaths(owner, repo, branch, paths)).slice(0, maxFiles);
  const results: IRepoMarkdownFile[] = [];
  for (const p of mdPaths) {
    const content = await fetchRawFile(owner, repo, branch, p);
    const title = deriveTitleFromMarkdown(p, content);
    results.push({ path: p, content, title });
  }
  return results;
}

/**
 * Web Crawling Utilities
 */

interface IWebCrawlConfig {
  seeds?: string[];
  domain: string;
  prefix?: string;
  depth: number;
  maxPages: number;
  crawlDelayMs: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  depthMap?: Record<string, number>;
}

const robotsCache = new Map<string, { robots: Robot | null; timestamp: number }>();
const ROBOTS_CACHE_TTL = 1000 * 60 * 60;

export async function fetchRobots(base: string): Promise<Robot | null> {
  const robotsUrl = new URL("/robots.txt", base).toString();
  const cacheKey = new URL(base).origin;
  const cached = robotsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < ROBOTS_CACHE_TTL) {
    return cached.robots;
  }

  try {
    const txt = await externalGetWithRetry(robotsUrl, { maxRetries: 2, delayMs: 500 });
    if (txt === null) {
      robotsCache.set(cacheKey, { robots: null, timestamp: Date.now() });
      return null;
    }
    const robots = robotsParser(robotsUrl, txt);
    robotsCache.set(cacheKey, { robots, timestamp: Date.now() });
    return robots;
  } catch {
    robotsCache.set(cacheKey, { robots: null, timestamp: Date.now() });
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlWebsite(config: IWebCrawlConfig): Promise<IWebPageItem[]> {
  const { seeds, domain, prefix, depth, maxPages, crawlDelayMs, includePatterns, excludePatterns, depthMap } = config;
  const resolvedSeeds = (seeds && seeds.length > 0 ? seeds : []).map(normalizeUrl);
  if (resolvedSeeds.length === 0) return [];
  const origin = new URL(resolvedSeeds[0]).origin;
  const robots = await fetchRobots(origin);

  const queue: Array<{ url: string; d: number }> = resolvedSeeds.map((s) => ({ url: s, d: 0 }));
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

  while (queue.length > 0 && out.length < maxPages) {
    const { url, d } = queue.shift()!;
    const canonical = normalizeUrl(url);
    if (visited.has(canonical)) continue;
    visited.add(canonical);

    const u = new URL(url);
    if (u.hostname !== domain) continue;
    if (depth > 0) {
      if (prefix && !u.pathname.startsWith(prefix)) continue;
      const matchesInclude = includeRegexes.length === 0 || includeRegexes.some((re) => re.test(u.pathname));
      if (!matchesInclude && d > 0) continue;
      if (combinedExcludeRegexes.some((re) => re.test(u.pathname))) continue;
    }
    if (robots && !robots.isAllowed(url, "*")) continue;

    const html = await externalGetWithRetry(canonical);
    if (!html) continue;

    try {
      const $ = load(html);
      const title = ($("title").first().text() || $("h1").first().text() || url).trim();
      const mainHtml = extractMainContent(html) ?? html;
      const content = mainHtml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const quality = assessContentQuality(content, html);
      const allowThisPage =
        depth === 0
          ? d === 0
          : includeRegexes.length === 0 || includeRegexes.some((re) => re.test(u.pathname)) || d === 0;
      if (content.length > 0 && quality.isAcceptable && allowThisPage) {
        out.push({ url: canonical, title, content, html, depth: d });
      }

      const currentDepthLimit = (() => {
        if (!depthMap) return depth;
        try {
          const best = Object.keys(depthMap)
            .filter((k) => u.pathname.startsWith(k))
            .sort((a, b) => b.length - a.length)[0];
          return typeof best === "string" ? depthMap[best] ?? depth : depth;
        } catch {
          return depth;
        }
      })();

      if (d < currentDepthLimit && depth > 0) {
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
            if (includeRegexes.length > 0 && d >= 1 && !includeRegexes.some((re) => re.test(lnUrl.pathname))) continue;
            if (combinedExcludeRegexes.some((re) => re.test(lnUrl.pathname))) continue;
          } catch {
            // ignore invalid url
          }
          if (!visited.has(ln)) queue.push({ url: ln, d: d + 1 });
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

export function isRepoMode(mode: EIngestionMode): boolean {
  return mode === EIngestionMode.REPO;
}

export function isWebMode(mode: EIngestionMode): boolean {
  return mode === EIngestionMode.WEB;
}
