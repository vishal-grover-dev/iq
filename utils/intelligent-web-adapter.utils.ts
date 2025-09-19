export interface IIntelligentLabelResult {
  topic: string;
  subtopic: string | null;
  version: string | null;
}

/**
 * Intelligently derive labels from any URL using universal patterns
 * Works across documentation sites, not tied to specific frameworks
 */
export function deriveLabelsFromUrl(url: string, fallbackTopic?: string): IIntelligentLabelResult {
  const u = new URL(url);
  const path = u.pathname || "/";
  const segments = path.split("/").filter(Boolean);
  const hostname = u.hostname.toLowerCase();

  let topic = fallbackTopic || "Unknown";
  let subtopic: string | null = null;
  let version: string | null = null;

  // Universal topic detection from hostname
  if (hostname.includes("react")) topic = "React";
  else if (hostname.includes("angular")) topic = "Angular";
  else if (hostname.includes("vue")) topic = "Vue";
  else if (hostname.includes("typescript")) topic = "TypeScript";
  else if (hostname.includes("javascript") || hostname.includes("mdn")) topic = "JavaScript";
  else if (hostname.includes("nodejs") || hostname.includes("node")) topic = "Node.js";
  else if (hostname.includes("nextjs") || hostname.includes("next")) topic = "Next.js";

  // Universal subtopic patterns (generic buckets filtered below)
  const commonPatterns = {
    // Documentation structure patterns
    learn: "Learn",
    tutorial: "Tutorial",
    guide: "Guide",
    reference: "Reference",
    api: "API",
    docs: "Documentation",

    // Technical concept patterns
    hooks: "Hooks",
    components: "Components",
    routing: "Routing",
    state: "State Management",
    testing: "Testing",
    performance: "Performance",
    security: "Security",
    deployment: "Deployment",

    // Language/framework patterns
    async: "Async Programming",
    promises: "Promises",
    modules: "Modules",
    types: "Type System",
    generics: "Generics",
    interfaces: "Interfaces",
  } as const;

  const GENERIC_BUCKETS = new Set(["Learn", "Guide", "Documentation", "Tutorial", "Docs"]);

  // Site-specific refinement: react.dev
  if (hostname.includes("react.dev")) {
    // reference pages → Reference/<leaf>
    const refIdx = segments.indexOf("reference");
    if (refIdx !== -1) {
      // Use the last segment as the specific API (e.g., useState)
      const leaf = segments.length > refIdx + 1 ? segments[segments.length - 1] : undefined;
      if (leaf) {
        subtopic = `Reference/${leaf}`;
      } else {
        subtopic = "Reference";
      }
    } else {
      // Avoid setting generic "Learn" for /learn/*; keep null so explicit metadata can fill it
      // Leave subtopic unset for learn pages unless other patterns match later
    }
  }

  // Look for subtopic patterns in path segments
  if (!subtopic) {
    for (const segment of segments) {
      const lowerSegment = segment.toLowerCase().replace(/[-_]/g, "");
      for (const [pattern, label] of Object.entries(commonPatterns)) {
        if (lowerSegment.includes(pattern)) {
          subtopic = label as string;
          break;
        }
      }
      if (subtopic) break;
    }
  }

  // Enhanced subtopic for reference sections
  if (subtopic === "Reference" && segments.length > 1) {
    const nextSegment = segments[segments.findIndex((s) => s.toLowerCase().includes("reference")) + 1];
    if (nextSegment) {
      subtopic = `Reference/${nextSegment}`;
    }
  }

  // Filter out generic buckets unless nothing else is available
  if (subtopic && GENERIC_BUCKETS.has(subtopic)) {
    subtopic = null;
  }

  // Universal version detection
  const versionPatterns = [
    /v?(\d+)\.(\d+)(?:\.(\d+))?/i, // v1.2.3 or 1.2.3
    /(?:^|\D)(1[89]|2[0-9])(?!\d)/, // Version numbers like 18, 19, 20
    /es(\d+)/i, // ES6, ES2020, etc.
    /node[_-]?(\d+)/i, // node14, node-16
  ];

  const fullPath = path + u.search;
  for (const pattern of versionPatterns) {
    const match = fullPath.match(pattern);
    if (match) {
      version = match[1] || match[0];
      break;
    }
  }

  return { topic, subtopic, version };
}

/**
 * Intelligently extract main content from any HTML page
 * Uses universal content detection heuristics
 */
export function extractMainContent(html?: string | null): string | null {
  if (!html) return null;

  try {
    const { load } = require("cheerio");
    const $ = load(html);

    // Remove noise elements universally
    $("script, style, nav, footer, header, aside, .sidebar, .navigation, .menu, .ads, .advertisement").remove();

    // Priority order for content containers (universal patterns)
    const contentSelectors = [
      "main",
      "article",
      "[role='main']",
      ".main-content",
      ".content",
      ".documentation",
      ".docs-content",
      "#content",
      "#main",
      ".post-content",
      ".entry-content",
    ];

    // Try each selector in priority order
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length && element.text().trim().length > 200) {
        return element.html()?.trim() ?? null;
      }
    }

    // Fallback: find the largest text container
    let bestElement = $("body");
    let maxTextLength = 0;

    $("div, section, article").each((_: number, el: unknown) => {
      const $el = $(el as any);
      const textLength = $el.text().trim().length;
      if (textLength > maxTextLength && textLength > 200) {
        maxTextLength = textLength;
        bestElement = $el;
      }
    });

    return bestElement.html()?.trim() ?? null;
  } catch {
    return null;
  }
}

/**
 * Assess content quality using universal heuristics
 */
export function assessContentQuality(
  content: string,
  html?: string
): {
  isAcceptable: boolean;
  reasons: string[];
  score: number;
} {
  const reasons: string[] = [];
  let score = 100;

  // Length check
  if (content.length < 100) {
    reasons.push("Content too short");
    score -= 30;
  }

  // Content-to-noise ratio
  if (html) {
    const textLength = content.length;
    const htmlLength = html.length;
    const ratio = textLength / htmlLength;

    if (ratio < 0.1) {
      reasons.push("Low content-to-markup ratio");
      score -= 20;
    }
  }

  // Error page detection
  const errorIndicators = [
    /404|not found|page not found/i,
    /error|something went wrong/i,
    /access denied|forbidden/i,
    /under construction|coming soon/i,
  ];

  for (const pattern of errorIndicators) {
    if (pattern.test(content)) {
      reasons.push("Appears to be error page");
      score -= 50;
      break;
    }
  }

  // Language detection (simple heuristic)
  const englishWords = /\b(the|and|or|but|in|on|at|to|for|of|with|by)\b/gi;
  const englishMatches = content.match(englishWords)?.length || 0;
  const wordCount = content.split(/\s+/).length;
  const englishRatio = englishMatches / wordCount;

  if (englishRatio < 0.05) {
    reasons.push("Likely non-English content");
    score -= 25;
  }

  return {
    isAcceptable: score >= 50,
    reasons,
    score,
  };
}
