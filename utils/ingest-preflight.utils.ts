import fs from "fs";
import path from "path";
import { IIngestCatalogItem, ILogger, TIngestCatalog } from "@/types/interview-streams.types";
import { normalizeUrl } from "@/utils/url.utils";

/**
 * Persist embedded flags to the catalog file for completed ingestions.
 * Updates entries that match completed or related URLs, preventing duplicate ingestion attempts.
 */
export function persistEmbeddedFlags(
  completedUrls: Set<string>,
  logger: ILogger,
  alsoMarkEmbedded?: Set<string>
): void {
  const catalogPath = path.join(process.cwd(), "data", "interview-ingest-catalog.json");
  try {
    const current = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as TIngestCatalog;
    let updates = 0;
    // Local normalizer for comparison
    const norm = (raw: string) => normalizeUrl(raw);
    const completedNorm = new Set<string>(Array.from(completedUrls).map(norm));
    const alsoNorm = new Set<string>(Array.from(alsoMarkEmbedded ?? new Set<string>()).map(norm));
    for (const topicKey of Object.keys(current)) {
      const arr = current[topicKey] ?? [];
      for (const item of arr) {
        const itemNorm = norm(item.url);
        if (!item.embedded && (completedNorm.has(itemNorm) || alsoNorm.has(itemNorm))) {
          (item as IIngestCatalogItem).embedded = true;
          updates++;
        }
      }
    }
    if (updates > 0) {
      fs.writeFileSync(catalogPath, JSON.stringify(current, null, 2) + "\n", "utf-8");
      logger.info("[ingest] catalog updated", { updates, path: catalogPath });
    } else {
      logger.info("[ingest] catalog up-to-date", { path: catalogPath });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error("[ingest] failed to update catalog", { error: err.message });
  }
}
