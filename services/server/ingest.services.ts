import fs from "fs";
import path from "path";
import { getSupabaseServiceRoleClient } from "@/config/supabase.config";
import { loadIngestCatalog } from "@/utils/catalog.utils";
import { normalizeUrl } from "@/utils/url.utils";
import { EInterviewTopic } from "@/types/upload.types";
import { EIngestionMode } from "@/types/ingestion.types";
import type { IIngestCatalogItem, ILogger, TIngestCatalog, IIngestRunResult } from "@/types/interview-streams.types";
import type { IIngestionStatusResponse } from "@/types/ingestion.types";
import type { TIngestRepoOrWebRequest } from "@/schema/ingest.schema";

/**
 * runCatalogIngestion
 * Server-only: Orchestrates catalog-driven ingestion with concurrency, polling, and logging.
 */
export async function runCatalogIngestion(params?: {
  topic?: string;
  maxConcurrency?: number;
  logger?: ILogger;
  waitUntilComplete?: boolean;
  pollMs?: number;
  timeoutMs?: number;
}): Promise<IIngestRunResult> {
  const logger: ILogger = params?.logger ?? console;
  const catalog = loadIngestCatalog();
  const topicKeys = params?.topic ? [params.topic] : Object.keys(catalog);
  const maxConcurrency = Math.max(1, Math.min(params?.maxConcurrency ?? 4, 8));
  const waitUntilComplete = params?.waitUntilComplete ?? true;
  const pollMs = Math.max(500, params?.pollMs ?? 1500);
  const timeoutMs = Math.max(5_000, params?.timeoutMs ?? 30 * 60 * 1000);

  logger.info("[ingest] starting", { topicKeys, maxConcurrency, waitUntilComplete });

  const seenNormalized = new Set<string>();
  const rawToNormalized = new Map<string, string>();
  const normalizedToRaw = new Map<string, string>();
  const normalizedToRaws = new Map<string, Set<string>>();
  const duplicateRawUrls: string[] = [];

  type TQueueItem = { topic: string; item: IIngestCatalogItem; normalizedUrl: string; host?: string };
  const preliminaryQueue: TQueueItem[] = [];
  for (const topic of topicKeys) {
    const items = catalog[topic] ?? [];
    for (const item of items) {
      if (item.embedded) {
        logger.debug?.("[ingest] skip: already embedded", { topic, url: item.url, subtopic: item.subtopic });
        continue;
      }
      if (!item.url) continue;
      if (item.ingestType === "web") {
        const norm = normalizeUrl(item.url);
        rawToNormalized.set(item.url, norm);
        const bucket = normalizedToRaws.get(norm) ?? new Set<string>();
        bucket.add(item.url);
        normalizedToRaws.set(norm, bucket);
        if (seenNormalized.has(norm)) {
          duplicateRawUrls.push(item.url);
          logger.debug?.("[ingest] skip: duplicate after normalization", { topic, url: item.url, normalized: norm });
          continue;
        }
        seenNormalized.add(norm);
        normalizedToRaw.set(norm, item.url);
        const host = (() => {
          try {
            return new URL(norm).hostname;
          } catch {
            return undefined;
          }
        })();
        preliminaryQueue.push({ topic, item, normalizedUrl: norm, host });
      } else {
        preliminaryQueue.push({ topic, item, normalizedUrl: item.url });
      }
    }
  }

  const supabase = getSupabaseServiceRoleClient();
  const webCandidates = preliminaryQueue.filter((q) => q.item.ingestType === "web");
  const preflightEmbedded = new Set<string>();
  if (webCandidates.length > 0) {
    const paths = webCandidates.map((q) => q.normalizedUrl);
    const { data: existingDocs, error: existingErr } = await supabase
      .from("documents")
      .select("path")
      .eq("bucket", "web")
      .in("path", paths);
    if (existingErr) {
      logger.warn("[ingest] preflight check failed", { error: existingErr.message });
    }
    const existingSet = new Set<string>((existingDocs ?? []).map(({ path }) => path as string));
    for (const q of webCandidates) {
      if (existingSet.has(q.normalizedUrl)) {
        preflightEmbedded.add(q.item.url);
        logger.info("[ingest] preflight-skip: already ingested", { url: q.item.url, normalized: q.normalizedUrl });
      }
    }

    if (preflightEmbedded.size > 0) {
      try {
        persistEmbeddedFlags(new Set<string>(), logger, preflightEmbedded);
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        logger.warn("[ingest] preflight catalog persist failed", { error: errMsg });
      }
    }
  }

  const queue: Array<TQueueItem & { host?: string }> = preliminaryQueue.filter(
    (q) => !(q.item.ingestType === "web" && preflightEmbedded.has(q.item.url))
  );

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  let inFlightCount = 0;

  async function pollUntilDone(mode: EIngestionMode, id: string) {
    const start = Date.now();
    while (true) {
      const st = (await getIngestionStatus(id)) as IIngestionStatusResponse;
      const step = (st.inflight as Record<string, unknown>)?.step ?? st.status;
      const processed = (st.inflight as Record<string, unknown>)?.processed ?? 0;
      const total = (st.inflight as Record<string, unknown>)?.totalPlanned as number | undefined;
      logger.debug?.("[ingest] poll", { id, step, processed, total });
      if (st.status === "completed" || step === "completed") return;
      if (st.status === "failed") throw new Error(st.error ?? "ingestion failed");
      if (Date.now() - start > timeoutMs) throw new Error("timeout waiting for ingestion completion");
      await sleep(pollMs);
    }
  }

  let started = 0;
  const ids: string[] = [];
  const errors: IIngestRunResult["errors"] = [];
  const completedUrls = new Set<string>();
  const hostBusy = new Map<string, boolean>();

  async function worker(workerId: number) {
    logger.debug?.("[ingest] worker ready", { workerId });
    while (true) {
      let nextIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const cand = queue[i];
        if (cand.item.ingestType !== "web") {
          nextIndex = i;
          break;
        }
        const h = cand.host ?? "";
        if (!hostBusy.get(h)) {
          nextIndex = i;
          hostBusy.set(h, true);
          break;
        }
      }
      if (nextIndex === -1) {
        if (queue.length === 0 && inFlightCount === 0) {
          logger.debug?.("[ingest] worker exit: no pending or in-flight items", { workerId });
          return;
        }
        await sleep(50);
        continue;
      }
      const next = queue.splice(nextIndex, 1)[0]!;
      const { topic, item } = next;
      try {
        inFlightCount++;
        const mode = item.ingestType === "repo" ? EIngestionMode.REPO : EIngestionMode.WEB;
        logger.info("[ingest] starting item", {
          workerId,
          mode,
          topic,
          subtopic: item.subtopic,
          url: item.url,
          normalized: next.normalizedUrl,
          baseURL: mode === EIngestionMode.WEB ? new URL(next.normalizedUrl).origin : undefined,
        });
        let payload: TIngestRepoOrWebRequest;
        if (mode === EIngestionMode.WEB) {
          payload = {
            mode: EIngestionMode.WEB,
            seeds: [next.normalizedUrl],
            domain: new URL(next.normalizedUrl).hostname,
            topic: topic as EInterviewTopic,
            subtopic: item.subtopic,
            depth: 1,
            maxPages: 10,
            crawlDelayMs: 500,
          };
        } else {
          payload = {
            mode: EIngestionMode.REPO,
            repoUrl: item.url,
            paths: [],
            topic: topic as EInterviewTopic,
            subtopic: item.subtopic,
            maxFiles: 200,
          };
        }
        const result = await ingestRepoOrWeb(payload);

        const id = result.ingestionId;
        logger.info("[ingest] enqueued", { workerId, mode, id });
        ids.push(id);

        await processIngestion(mode, id);
        logger.debug?.("[ingest] process triggered", { workerId, id });
        if (waitUntilComplete) {
          await pollUntilDone(mode, id);
          try {
            const supabase = getSupabaseServiceRoleClient();
            const { data: docs } = await supabase.from("documents").select("id").eq("ingestion_id", id).limit(1);
            let hasCoverage = !!(docs && docs.length > 0);
            if (!hasCoverage && mode === EIngestionMode.WEB) {
              logger.warn("[ingest] zero coverage; retrying with longer delay", { url: next.normalizedUrl });
              payload = {
                mode: EIngestionMode.WEB,
                seeds: [next.normalizedUrl],
                domain: new URL(next.normalizedUrl).hostname,
                topic: topic as EInterviewTopic,
                subtopic: item.subtopic,
                depth: 2,
                maxPages: 10,
                crawlDelayMs: 1000,
              };
              const retry = await ingestRepoOrWeb(payload);
              await processIngestion(EIngestionMode.WEB, retry.ingestionId);
              await pollUntilDone(EIngestionMode.WEB, retry.ingestionId);
              const { data: docs2 } = await supabase
                .from("documents")
                .select("id")
                .eq("ingestion_id", retry.ingestionId)
                .limit(1);
              hasCoverage = !!(docs2 && docs2.length > 0);
            }
            if (!hasCoverage) {
              const { data: existsByPath } = await supabase
                .from("documents")
                .select("id")
                .eq("bucket", "web")
                .eq("path", next.normalizedUrl)
                .limit(1);
              if (existsByPath && existsByPath.length > 0) {
                hasCoverage = true;
              }
            }
            if (hasCoverage) {
              completedUrls.add(item.url);
              logger.info("[ingest] completed item", { workerId, id });
              try {
                const also = normalizedToRaws.get(next.normalizedUrl) ?? new Set<string>();
                persistEmbeddedFlags(new Set<string>([item.url]), logger, also);
              } catch (e) {
                const errMsg = e instanceof Error ? e.message : String(e);
                logger.warn("[ingest] catalog persist failed", { error: errMsg, url: item.url });
              }
            } else {
              logger.warn("[ingest] completed but no coverage", { workerId, id });
            }
          } catch (verr) {
            const errMsg = verr instanceof Error ? verr.message : String(verr);
            logger.warn("[ingest] verification failed", { error: errMsg });
          }
        }
        started++;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        logger.error("[ingest] failed", { workerId, topic, url: item.url, error: errMsg });
        errors.push({ topic, subtopic: item.subtopic, url: item.url, error: errMsg });
      } finally {
        if (next.item.ingestType === "web") {
          const h = next.host ?? "";
          if (h) hostBusy.set(h, false);
        }
        inFlightCount--;
      }
    }
  }

  const workers = Array.from({ length: maxConcurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  persistEmbeddedFlags(completedUrls, logger, preflightEmbedded);

  logger.info("[ingest] completed", {
    attempted: preliminaryQueue.length - preflightEmbedded.size,
    started,
    errors: errors.length,
    ids: ids.length,
  });
  return {
    attempted: preliminaryQueue.length - preflightEmbedded.size,
    started,
    skippedDuplicateUrl: duplicateRawUrls.length,
    errors,
    ids,
  };
}

/**
 * persistEmbeddedFlags
 * Server-only: Updates catalog JSON file with embedded flags.
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

// Import client functions that are needed for the server functions
import { ingestRepoOrWeb, getIngestionStatus, processIngestion } from "@/services/client/ingest.services";
