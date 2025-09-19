/**
 * Converts arbitrary input into a lowercase, URL-safe slug by removing diacritics
 * and collapsing non-alphanumeric sequences into single hyphens.
 */
export function slugify(input: string): string {
  return input
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Produces a deterministic directory path for academic uploads based on contextual
 * metadata (board, class, and subject).
 */
// Academic directory builder removed

/**
 * Appends an ISO timestamp and short random token to the base filename to avoid
 * collisions in object storage, preserving the original file extension if present.
 */
export function fileNameWithTimestamp(originalName: string): string {
  const dotIdx = originalName.lastIndexOf(".");
  const base = dotIdx > -1 ? originalName.slice(0, dotIdx) : originalName;
  const ext = dotIdx > -1 ? originalName.slice(dotIdx) : "";
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${slugify(base)}-${ts}-${rand}${ext}`;
}
