"use client";
import { useState } from "react";
import {
  planRepoIngestion,
  planWebIngestion,
  resumeIngestion,
  retryIngestion,
  downloadRunReport,
} from "@/services/ingest.services";
import {
  EInterviewIngestType,
  type IInterviewIngestItem,
  type TPlanData,
  type TWebPlanData,
} from "@/types/upload.types";
import { type IRepoIngestionPlan, type IWebIngestionPlan } from "@/types/ingestion.types";

export function useInterviewPlanner(items: IInterviewIngestItem[]) {
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
  const [customSubtopic, setCustomSubtopic] = useState<string>("");

  const [planOpen, setPlanOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planData, setPlanData] = useState<TPlanData | null>(null);
  const [webPlanData, setWebPlanData] = useState<TWebPlanData | null>(null);

  async function handlePlan() {
    try {
      setPlanLoading(true);
      const validItems = items.filter((i) => i && (i.url ?? "").trim());
      if (validItems.length === 0) return;

      const repoAgg: TPlanData = { total: 0, batchSize: 200, slices: [], categories: {} };

      const webPagesMap = new Map<string, { url: string; title?: string }>();
      const webGroups: Array<{ label: string; count: number; pages: Array<{ url: string; title?: string }> }> = [];
      let webCount = 0;

      for (const item of validItems) {
        if (item.ingestType === EInterviewIngestType.REPO) {
          const res = (await planRepoIngestion({ repoUrl: item.url, batchSize: 200 })) as
            | IRepoIngestionPlan
            | undefined;
          repoAgg.total += res?.total ?? 0;
          repoAgg.batchSize = res?.batchSize ?? repoAgg.batchSize;
          const repoId = (() => {
            try {
              const u = new URL(item.url);
              return `${u.hostname}${u.pathname}`;
            } catch {
              return item.url;
            }
          })();
          (res?.slices ?? []).forEach((s) => {
            repoAgg.slices.push({ ...s, name: `${repoId} — ${s.name}` });
          });
          Object.entries(res?.categories ?? {}).forEach(([k, v]) => {
            repoAgg.categories[k] = (repoAgg.categories[k] ?? 0) + (v as number);
          });
        } else {
          const u = new URL(item.url);
          const res = (await planWebIngestion({
            seeds: [item.url],
            domain: u.hostname,
            depth: (item.depth ?? 2) as number,
            maxPages: 50,
            crawlDelayMs: 300,
            useAiPlanner: false,
            topic: item.topic,
            returnAllPages: false,
            applyQuotas: false,
          })) as IWebIngestionPlan | undefined;
          webCount += res?.count ?? 0;
          (res?.pages ?? []).forEach((p) => {
            if (!webPagesMap.has(p.url)) webPagesMap.set(p.url, p);
          });
          const label = `${item.topic}${item.subtopic ? ` • ${item.subtopic}` : ""} — ${u.hostname}${u.pathname}`;
          webGroups.push({ label, count: res?.count ?? 0, pages: (res?.pages ?? []).slice(0, 20) });
        }
      }

      const hasRepo = repoAgg.total > 0 || repoAgg.slices.length > 0 || Object.keys(repoAgg.categories).length > 0;
      const webPages = Array.from(webPagesMap.values());
      const hasWeb = webPages.length > 0 || webCount > 0;

      setPlanData(hasRepo ? repoAgg : null);
      setWebPlanData(hasWeb ? { count: webCount, pages: webPages, groups: webGroups } : null);
      setPlanOpen(true);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleResume(ingestionId?: string) {
    if (!ingestionId) return;
    await resumeIngestion(ingestionId);
  }

  async function handleRetry(ingestionId?: string) {
    if (!ingestionId) return;
    await retryIngestion(ingestionId);
  }

  async function handleReport(ingestionId?: string) {
    if (!ingestionId) return;
    await downloadRunReport(ingestionId);
  }

  return {
    planOpen,
    setPlanOpen,
    planLoading,
    planData,
    webPlanData,
    openModalIndex,
    setOpenModalIndex,
    customSubtopic,
    setCustomSubtopic,
    handlePlan,
    handleResume,
    handleRetry,
    handleReport,
  };
}
