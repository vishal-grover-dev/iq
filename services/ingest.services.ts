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
