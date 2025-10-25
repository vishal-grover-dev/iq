import { load } from "cheerio";

/**
 * Intelligently extract main content from any HTML page
 * Uses universal content detection heuristics
 */
export function extractMainContent(html?: string | null): string | null {
  if (!html) return null;

  try {
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

    $("div, section, article").each(function () {
      const $el = $(this);
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

    // Be more permissive: documentation sites often have heavy markup/scripts.
    if (ratio < 0.03) {
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
    // Slightly relax acceptance threshold to reduce false negatives on docs pages
    isAcceptable: score >= 40,
    reasons,
    score,
  };
}
