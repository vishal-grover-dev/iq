import { TIngestAcademicRequest, ingestResponseSchema, TIngestRepoOrWebRequest } from "@/schema/ingest.schema";
import { apiClient } from "@/services/http.services";
import { useMutation } from "@tanstack/react-query";

/**
 * Client helper to call the ingestion API with typed payload/response.
 */
export async function ingestAcademic(payload: TIngestAcademicRequest) {
  const res = await apiClient.post(`/api/ingest/academic`, payload);
  return ingestResponseSchema.parse(res.data);
}

export function useIngestAcademicMutations() {
  return useMutation({
    mutationKey: ["ingestAcademic"],
    mutationFn: (payload: TIngestAcademicRequest) => ingestAcademic(payload),
  });
}

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
  };
}
