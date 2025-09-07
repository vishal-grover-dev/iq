import { TIngestAcademicRequest, ingestResponseSchema } from "@/schema/ingest.schema";
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
