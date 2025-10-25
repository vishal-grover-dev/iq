import { useState } from "react";
import { useIngestRepoWebMutations, getIngestionStatus, processIngestion } from "@/services/client/ingest.services";
import { IInterviewIngestItem, EInterviewIngestType } from "@/types/upload.types";
import { EIngestionMode, type IIngestionStatusResponse } from "@/types/ingestion.types";
import { type TIngestRepoRequest, type TIngestWebRequest } from "@/schema/ingest.schema";

export interface IIngestionProgressInfo {
  ingestionId: string;
  inflightStep?: string;
  processed?: number;
  totalPlanned?: number;
  currentPathOrUrl?: string;
  topics?: string[];
  subtopics?: string[];
}

/**
 * useInterviewIngestion
 * Encapsulates creation, processing, and polling of Interview Streams ingestions (repo/web).
 * Returns a starter that enqueues jobs and resolves with coverage and ids when processing completes or times out.
 */
export function useInterviewIngestion() {
  const { mutateAsync: ingestRepoWeb } = useIngestRepoWebMutations();
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  async function startIngestions(
    items: IInterviewIngestItem[],
    onProgress?: (info: IIngestionProgressInfo) => void
  ): Promise<{
    ingestionIds: string[];
    coverage: { topics: string[]; subtopics: string[] };
    recent?: Array<{ title: string | null; path: string }>;
  }> {
    setIsProcessing(true);
    try {
      const createdIds: string[] = [];
      const failures: string[] = [];

      // Create ingestion rows
      for (const row of items) {
        try {
          if (row.ingestType === EInterviewIngestType.REPO) {
            // Client-side validation: only GitHub repos supported for repo mode (v1)
            const url = new URL(row.url);
            if (url.hostname !== "github.com") {
              throw new Error("For 'Docs Repo (GitHub)', use a github.com repository URL");
            }
            const payload: TIngestRepoRequest = {
              mode: EIngestionMode.REPO,
              repoUrl: row.url,
              paths: [],
              topic: row.topic,
              subtopic: row.subtopic ?? undefined,
              maxFiles: 200,
            };
            const { ingestionId } = await ingestRepoWeb(payload);
            createdIds.push(ingestionId);
          } else {
            const u = new URL(row.url);
            // Smart, generic defaults derived from the provided URL (no hardcoded domains)
            const payload: TIngestWebRequest = {
              mode: EIngestionMode.WEB,
              seeds: [row.url],
              domain: u.hostname,
              depth: (row.depth ?? 2) as number,
              maxPages: 50,
              crawlDelayMs: 300,
              topic: row.topic,
              subtopic: row.subtopic ?? undefined,
            };

            const { ingestionId } = await ingestRepoWeb(payload);
            createdIds.push(ingestionId);
          }
        } catch (err) {
          failures.push(err instanceof Error ? err.message : "Failed to create ingestion");
        }
      }

      if (createdIds.length === 0) {
        const message = failures[0] ?? "No ingestions could be created";
        throw new Error(message);
      }

      // Kick off processing for each created ingestion (initial batch)
      for (let i = 0; i < items.length; i++) {
        const row = items[i];
        const id = createdIds[i];
        if (!id) continue;
        await processIngestion(row.ingestType === EInterviewIngestType.REPO ? "repo" : "web", id);
      }

      // Poll until all complete/failed; aggregate coverage
      const coverage = { topics: new Set<string>(), subtopics: new Set<string>() } as const;
      const pollIds = [...createdIds];
      const maxWaitMs = 1000 * 60 * 5; // 5 minutes
      const start = Date.now();
      const pending = new Set(pollIds);
      let recent: Array<{ title: string | null; path: string }> = [];
      while (pending.size > 0 && Date.now() - start < maxWaitMs) {
        await new Promise((r) => setTimeout(r, 2000));
        for (const id of [...pending]) {
          try {
            const s = (await getIngestionStatus(id)) as IIngestionStatusResponse;
            const inflightStep = (s.inflight as Record<string, unknown>)?.step as string | undefined;
            const processed = (s.inflight as Record<string, unknown>)?.processed as number | undefined;
            const totalPlanned = (s.inflight as Record<string, unknown>)?.totalPlanned as number | undefined;
            const currentPathOrUrl = (s.inflight as Record<string, unknown>)?.currentPathOrUrl as string | undefined;
            const topics = (s.progress as Record<string, unknown>)?.coverage as Record<string, unknown> | undefined;
            const topicsList = (topics?.topics as string[]) || undefined;
            const subtopicsList = (topics?.subtopics as string[]) || undefined;
            const recentItems = (s.progress as Record<string, unknown>)?.recent as
              | Array<{ title: string | null; path: string }>
              | undefined;

            topicsList?.forEach((t) => coverage.topics.add(t));
            subtopicsList?.forEach((t) => coverage.subtopics.add(t));
            if (Array.isArray(recentItems)) recent = recentItems;

            onProgress?.({
              ingestionId: id,
              inflightStep,
              processed,
              totalPlanned,
              currentPathOrUrl,
              topics: topicsList,
              subtopics: subtopicsList,
            });

            // For repo mode with cursor batching, trigger next batch if awaiting_next_batch
            const isCompleted = s.status === "completed";
            const isFailed = s.status === "failed";
            const inflight = (s.inflight as Record<string, unknown>) || {};
            const progress = (s.progress as Record<string, unknown>) || {};
            const awaitingNext = (inflight.step ?? progress.step) === "awaiting_next_batch";
            if (awaitingNext) {
              await processIngestion("repo", id);
            }
            if (isCompleted || isFailed) pending.delete(id);
          } catch {
            // ignore and continue polling
          }
        }
      }

      return {
        ingestionIds: createdIds,
        coverage: { topics: Array.from(coverage.topics), subtopics: Array.from(coverage.subtopics) },
        recent,
      };
    } finally {
      setIsProcessing(false);
    }
  }

  return { startIngestions, isProcessing };
}

export default useInterviewIngestion;
