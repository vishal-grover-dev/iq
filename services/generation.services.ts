import { apiClient } from "@/services/http.services";
import { useMutation } from "@tanstack/react-query";
import { generateMcqRequestSchema, generateMcqResponseSchema, TGenerateMcqRequest } from "@/schema/generation.schema";

/**
 * postGenerateMcq
 * Client service to request MCQ generation and persistence on the server.
 */
export async function postGenerateMcq(payload: TGenerateMcqRequest) {
  // Basic client-side validation (non-secret)
  const parsed = generateMcqRequestSchema.parse(payload);
  const res = await apiClient.post(`/api/generate/mcq`, parsed);
  return generateMcqResponseSchema.parse(res.data);
}

export function useGenerateMcqMutations() {
  return useMutation({
    mutationKey: ["generateMcq"],
    mutationFn: (payload: TGenerateMcqRequest) => postGenerateMcq(payload),
  });
}
