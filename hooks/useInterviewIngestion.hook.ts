import { useState } from "react";
import { useIngestRepoWebMutations, getIngestionStatus, processIngestion } from "@/services/ingest.services";
import { IInterviewIngestItem, EInterviewIngestType } from "@/types/upload.types";

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
            const { ingestionId } = await ingestRepoWeb({
              mode: "repo",
              repoUrl: row.url,
              paths: [],
              topic: row.topic as any,
              subtopic: row.subtopic,
              maxFiles: 200,
            } as any);
            createdIds.push(ingestionId);
          } else {
            const u = new URL(row.url);
            // Smart, generic defaults derived from the provided URL (no hardcoded domains)
            const payload: any = {
              mode: "web",
              seeds: [row.url],
              domain: u.hostname,
              prefix: undefined,
              depth: 3,
              maxPages: 200,
              crawlDelayMs: 300,
              topic: row.topic as any,
              subtopic: row.subtopic,
            };

            // Heuristic: if the seed path starts with a well-known docs section
            // (e.g., /reference, /docs, /learn, /guide), bias crawling to that section
            // and allow an extra level of depth for that section.
            const pathSegments = u.pathname.split("/").filter(Boolean);
            const localeOrVersion = /^(?:[a-z]{2}-[A-Z]{2}|v?\d+(?:\.\d+)*)$/; // e.g., en-US, v19, 19.1
            const candidate = (() => {
              if (pathSegments.length === 0) return null;
              const first = pathSegments[0];
              if (localeOrVersion.test(first) && pathSegments.length > 1) return pathSegments[1];
              return first;
            })();
            const docsSections = new Set([
              "reference",
              "docs",
              "documentation",
              "learn",
              "guide",
              "guides",
              "handbook",
              "api",
            ]);
            if (candidate && docsSections.has(candidate.toLowerCase())) {
              payload.includePatterns = [`^\/${candidate}`];
              payload.depthMap = { [`/${candidate}`]: 3 };
            }

            const { ingestionId } = await ingestRepoWeb(payload as any);
            createdIds.push(ingestionId);
          }
        } catch (err) {
          failures.push((err as any)?.message ?? "Failed to create ingestion");
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
            const s = await getIngestionStatus(id);
            const inflightStep = (s as any)?.inflight?.step as string | undefined;
            const processed = (s as any)?.inflight?.processed as number | undefined;
            const totalPlanned = (s as any)?.inflight?.totalPlanned as number | undefined;
            const currentPathOrUrl = (s as any)?.inflight?.currentPathOrUrl as string | undefined;
            const topics = (s as any)?.progress?.coverage?.topics as string[] | undefined;
            const subtopics = (s as any)?.progress?.coverage?.subtopics as string[] | undefined;
            const recentItems = (s as any)?.progress?.recent as
              | Array<{ title: string | null; path: string }>
              | undefined;

            topics?.forEach((t) => coverage.topics.add(t));
            subtopics?.forEach((t) => coverage.subtopics.add(t));
            if (Array.isArray(recentItems)) recent = recentItems;

            onProgress?.({
              ingestionId: id,
              inflightStep,
              processed,
              totalPlanned,
              currentPathOrUrl,
              topics,
              subtopics,
            });

            // For repo mode with cursor batching, trigger next batch if awaiting_next_batch
            const isCompleted = (s as any).status === "completed";
            const isFailed = (s as any).status === "failed";
            const awaitingNext = ((s as any)?.inflight?.step ?? (s as any)?.progress?.step) === "awaiting_next_batch";
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
