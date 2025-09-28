import * as cheerio from "cheerio";
import { externalGetWithRetry } from "@/services/http.services";
import { suggestCrawlHeuristics } from "@/services/ai.services";

export interface IPlannerBootstrapArgs {
  domain: string;
  seeds?: string[] | null;
  includePatterns?: string[] | null;
  excludePatterns?: string[] | null;
  depthMap?: Record<string, number> | null;
  useAiPlanner?: boolean;
  maxNavLinks?: number;
}

export interface IPlannerBootstrapResult {
  seeds?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  depthMap?: Record<string, number>;
  aiUsed: boolean;
}

function normalizeArray(values?: string[] | null): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const filtered = values.map((v) => String(v).trim()).filter((v) => v.length > 0);
  return filtered.length ? filtered : undefined;
}

function normalizeDepthMap(depthMap?: Record<string, number> | null): Record<string, number> | undefined {
  if (!depthMap) return undefined;
  const entries = Object.entries(depthMap).filter(([key, value]) => typeof key === "string" && Number.isFinite(value));
  if (!entries.length) return undefined;
  return Object.fromEntries(entries);
}

export async function resolvePlannerBootstrap(
  args: IPlannerBootstrapArgs
): Promise<IPlannerBootstrapResult> {
  const includePatterns = normalizeArray(args.includePatterns);
  const excludePatterns = normalizeArray(args.excludePatterns);
  const depthMap = normalizeDepthMap(args.depthMap);
  const seedsCandidate = normalizeArray(args.seeds);

  let seeds = seedsCandidate;
  let incPatterns = includePatterns;
  let depthMapFinal = depthMap;
  let aiUsed = false;

  const needsAiBootstrap = false; // Exact URL mode: disable AI bootstrap

  if (needsAiBootstrap) {
    const firstSeed = seeds && seeds.length ? seeds[0] : undefined;
    if (firstSeed) {
      const html = await externalGetWithRetry(firstSeed);
      if (html) {
        const $ = cheerio.load(html);
        const limit = Math.max(1, Math.min(args.maxNavLinks ?? 50, 200));
        const navPaths: Array<{ path: string; title?: string | null }> = $("a[href]")
          .map((_, el) => $(el).attr("href") || "")
          .get()
          .filter(Boolean)
          .slice(0, limit)
          .map((href) => {
            try {
              const resolved = new URL(href, firstSeed);
              return resolved.hostname.endsWith(args.domain) ? { path: resolved.pathname, title: null } : null;
            } catch {
              return null;
            }
          })
          .filter(Boolean) as Array<{ path: string; title?: string | null }>;

        const ai = await suggestCrawlHeuristics({
          url: firstSeed,
          htmlPreview: html,
          navigationPreview: navPaths,
        });
        if (!incPatterns || incPatterns.length === 0) incPatterns = normalizeArray(ai.includePatterns) ?? incPatterns;
        if (!depthMapFinal && ai.depthMap && Object.keys(ai.depthMap).length) {
          depthMapFinal = ai.depthMap;
        }
        if ((!seeds || seeds.length === 0) && ai.seeds && ai.seeds.length) {
          seeds = normalizeArray(ai.seeds) ?? seeds;
        }
        aiUsed = true;
      }
    }
  }

  return {
    seeds,
    includePatterns: incPatterns,
    excludePatterns,
    depthMap: depthMapFinal,
    aiUsed,
  };
}
