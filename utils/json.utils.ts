/**
 * parseJsonObject
 * Safely parse a JSON string into an object. Returns fallback on failure.
 */
export function parseJsonObject<T = any>(text: string | null | undefined, fallback: T): T {
  if (typeof text !== "string" || text.trim() === "") return fallback;
  try {
    const parsed = JSON.parse(text);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}
