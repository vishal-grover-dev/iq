import { apiClient } from "@/services/http.services";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  TRetrievalRequest as IRetrievalRequest,
  TRetrievalResponse as IRetrievalResponse,
  TRetrievalEnhancementRequest as IRetrievalEnhancementRequest,
  TRetrievalEnhancementResponse as IRetrievalEnhancementResponse,
} from "@/schema/retrieval.schema";

/**
 * Posts a retrieval query to the server. This calls a server API that computes the
 * query embedding on the server (using provider secrets) and performs hybrid search.
 * Returns scored context chunks with provenance to power RAG.
 */
export async function postRetrievalQuery(payload: IRetrievalRequest): Promise<IRetrievalResponse> {
  const { data } = await apiClient.post("/api/retrieval/query", payload);
  return data as IRetrievalResponse;
}

/**
 * Posts a query to the enhancement endpoint. The server may use an LLM to suggest
 * an improved query while preserving user intent and filters.
 */
export async function postRetrievalEnhanceQuery(
  payload: IRetrievalEnhancementRequest
): Promise<IRetrievalEnhancementResponse> {
  const { data } = await apiClient.post("/api/retrieval/enhance-query", payload);
  return data as IRetrievalEnhancementResponse;
}

export function useRetrievalQuery(key: any[], enabled: boolean, fn: () => Promise<IRetrievalResponse>) {
  return useQuery({ queryKey: key, queryFn: fn, enabled });
}

export function useRetrievalMutations() {
  const retrieve = useMutation({ mutationFn: postRetrievalQuery });
  const enhance = useMutation({ mutationFn: postRetrievalEnhanceQuery });
  return { retrieve, enhance };
}

