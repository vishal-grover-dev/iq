/**
 * Utilities for extracting chapter-like metadata from filenames and document text.
 * Heuristics support common synonyms such as Chapter, Lesson, Unit, Module, Topic, and Section.
 */

export interface IChapterExtractionResult {
  label?: string;
  chapterNumber?: string;
  chapterName?: string;
}

const LABELS = ["chapter", "lesson", "unit", "module", "topic", "section", "part"];

function normalizeWhitespace(input: string): string {
  return input
    .replace(/[\t\n\r]+/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function stripExtension(name: string): string {
  const dotIdx = name.lastIndexOf(".");
  return dotIdx > -1 ? name.slice(0, dotIdx) : name;
}

function toTitleCase(input: string): string {
  return input
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(" ");
}

/**
 * Attempts to extract chapter number/name from a filename.
 * Handles patterns like:
 * - "Chapter 5 - Fractions.pdf"
 * - "Lesson 2: The Solar System"
 * - "Unit-03 Algebraic Expressions"
 * - "5. Fractions" (fallback when label is missing)
 */
export function extractChapterFromFilename(filename: string): IChapterExtractionResult {
  const base = stripExtension(filename);
  const source = normalizeWhitespace(base.replace(/[._-]+/g, " "));

  const labelGroup = LABELS.join("|");
  const patterns: RegExp[] = [
    // Label + number + separator + name
    new RegExp(`\\b(${labelGroup})\\s*(\\d{1,3})\\s*[:\\-–\\.]\\s*(.+)$`, "i"),
    // Label + number + name (no explicit separator)
    new RegExp(`\\b(${labelGroup})\\s*(\\d{1,3})\\s+(.+)$`, "i"),
    // Number + separator + name (no label)
    /^\s*(\d{1,3})\s*[:\-–\.]\s*(.+)$/i,
  ];

  for (const rx of patterns) {
    const m = source.match(rx);
    if (m) {
      if (m.length === 4) {
        const [, rawLabel, num, name] = m;
        return {
          label: toTitleCase(rawLabel),
          chapterNumber: String(parseInt(num, 10)),
          chapterName: toTitleCase(name.trim()),
        };
      }
      if (m.length === 3) {
        const [, num, name] = m;
        return {
          label: "Chapter",
          chapterNumber: String(parseInt(num, 10)),
          chapterName: toTitleCase(name.trim()),
        };
      }
    }
  }

  return {};
}

/**
 * Attempts to extract chapter-like metadata from the first page(s) of text.
 * Searches for common heading patterns and also supports two-line headings like:
 * "Chapter 3" on one line and the title on the next line.
 */
export function extractChapterFromText(text: string): IChapterExtractionResult {
  if (!text) return {};
  const window = text.slice(0, 4000);
  const lines = window
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^\d+$/.test(l));

  const labelGroup = LABELS.join("|");
  const linePatterns: RegExp[] = [
    new RegExp(`^(${labelGroup})\\s*(\\d{1,3})\\s*[:\\-–\\.]\\s*(.+)$`, "i"),
    new RegExp(`^(${labelGroup})\\s*(\\d{1,3})\\b\s*(.*)$`, "i"),
  ];

  for (const line of lines) {
    for (const rx of linePatterns) {
      const m = line.match(rx);
      if (m) {
        const rawLabel = m[1];
        const num = m[2];
        const rest = (m[3] ?? "").trim();
        if (rest) {
          return {
            label: toTitleCase(rawLabel),
            chapterNumber: String(parseInt(num, 10)),
            chapterName: toTitleCase(rest),
          };
        }
      }
    }
  }

  // Two-line heading: "Chapter 5" then title on next line
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    const m = line.match(new RegExp(`^(${labelGroup})\\s*(\\d{1,3})$`, "i"));
    if (m && next) {
      return {
        label: toTitleCase(m[1]),
        chapterNumber: String(parseInt(m[2], 10)),
        chapterName: toTitleCase(next.trim()),
      };
    }
  }

  // Fallback: Number + title without explicit label (e.g., "5. Fractions")
  for (const line of lines.slice(0, 30)) {
    const simple = line.match(/^\s*(\d{1,3})\s*[:\-–\.]\s*(.+)$/i);
    if (simple) {
      const [, num, name] = simple;
      return {
        label: "Chapter",
        chapterNumber: String(parseInt(num, 10)),
        chapterName: toTitleCase(name.trim()),
      };
    }
  }

  return {};
}

/**
 * Builds a human-friendly title string from an extraction result.
 */
export function buildChapterTitle(extraction: IChapterExtractionResult): string | null {
  if (!extraction.chapterName && !extraction.chapterNumber) return null;
  const label = extraction.label || "Chapter";
  const num = extraction.chapterNumber ? `${extraction.chapterNumber}` : "";
  const name = extraction.chapterName || "";
  if (num && name) return `${label} ${num}: ${name}`.trim();
  if (num) return `${label} ${num}`.trim();
  return name || null;
}
