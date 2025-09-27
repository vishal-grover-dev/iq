import { ingestResponseSchema, TIngestRepoOrWebRequest } from "@/schema/ingest.schema";
import { apiClient } from "@/services/http.services";
import { useMutation } from "@tanstack/react-query";

/**
 * Client helper for repo/web ingestion (server performs fetch/parse/chunk/embed).
 */
export async function ingestRepoOrWeb(payload: TIngestRepoOrWebRequest) {
  const path = payload.mode === "repo" ? "/api/ingest/repo" : "/api/ingest/web";
  const res = await apiClient.post(path, payload);
  return ingestResponseSchema.parse(res.data);
}

export function useIngestRepoWebMutations() {
  return useMutation({
    mutationKey: ["ingestRepoWeb"],
    mutationFn: (payload: TIngestRepoOrWebRequest) => ingestRepoOrWeb(payload),
  });
}

/**
 * Poll an ingestion by id to get status details.
 */
export async function getIngestionStatus(ingestionId: string) {
  const res = await apiClient.get(`/api/ingest/${ingestionId}`);
  return res.data as {
    ok: boolean;
    id: string;
    status: string;
    error?: string | null;
    created_at: string;
    metadata: any;
    progress?: any;
    inflight?: any;
  };
}

/**
 * Trigger processing for a created ingestion. Endpoint differs by mode.
 */
export async function processIngestion(mode: "repo" | "web", ingestionId: string) {
  const path = mode === "repo" ? "/api/ingest/repo/process" : "/api/ingest/web/process";
  const res = await apiClient.post(path, { ingestionId });
  return ingestResponseSchema.parse(res.data);
}

/**
 * Repo planning endpoint - counts files and proposes batch slices.
 */
export async function planRepoIngestion(params: { repoUrl: string; paths?: string[]; batchSize?: number }) {
  const res = await apiClient.post("/api/ingest/repo/plan", params);
  return res.data as {
    ok: boolean;
    total: number;
    batchSize: number;
    slices: Array<{ name: string; start: number; end: number; count: number }>;
    categories: Record<string, number>;
  };
}

/**
 * Web planning endpoint - crawls seeds with constraints and returns preview.
 */
export async function planWebIngestion(params: {
  seeds: string[];
  domain: string;
  prefix?: string | null;
  depth?: number;
  maxPages?: number;
  crawlDelayMs?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
  depthMap?: Record<string, number>;
  useAiPlanner?: boolean;
  topic?: string;
  returnAllPages?: boolean;
  applyQuotas?: boolean;
}) {
  const res = await apiClient.post("/api/ingest/web/plan", params);
  return res.data as {
    ok: boolean;
    count: number;
    pages: Array<{ url: string; title?: string }>
  } & {
    sections?: any;
    quotas?: { requested: number } | undefined;
    debug?: any;
  };
}

/**
 * Control endpoints (placeholders for future worker controls).
 */
export async function pauseIngestion(_id: string) {
  return { ok: true } as const;
}
export async function resumeIngestion(id: string) {
  // For repo, resuming = call process again
  return processIngestion("repo", id);
}
export async function retryIngestion(id: string) {
  return processIngestion("repo", id);
}
export async function downloadRunReport(_id: string) {
  // Placeholder: UI can call status endpoint and generate client-side CSV/JSON
  return { ok: true } as const;
}
