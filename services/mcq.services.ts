import { apiClient } from "@/services/http.services";
import type { IMcqItemView } from "@/types/mcq.types";
import { useMutation, useQuery } from "@tanstack/react-query";
import type {
  TRetrievalRequest as IRetrievalRequest,
  TRetrievalResponse as IRetrievalResponse,
  TRetrievalEnhancementRequest as IRetrievalEnhancementRequest,
  TRetrievalEnhancementResponse as IRetrievalEnhancementResponse,
} from "@/schema/mcqRetrieval.schema";

/**
 * postGenerateMcq
 * Triggers MCQ generation via POST. For streaming, prefer openMcqSse().
 */
export async function postGenerateMcq(payload: unknown): Promise<{ ok: boolean; item: IMcqItemView }> {
  const { data } = await apiClient.post("/api/generate/mcq", payload);
  return data as { ok: boolean; item: IMcqItemView };
}

/**
 * openMcqSse
 * Opens an EventSource to the generation stream endpoint. Returns the EventSource instance
 * so callers can add handlers and close when done.
 */
export function openMcqSse(params?: Record<string, string | number | boolean | undefined>): EventSource {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) search.set(k, String(v));
  });
  const url = "/api/generate/mcq" + (search.toString() ? `?${search.toString()}` : "");
  const es = new EventSource(url);
  return es;
}

/**
 * postReviseMcq
 * Applies a user instruction to the current MCQ and returns an updated version.
 */
export async function postReviseMcq(payload: unknown): Promise<{ ok: boolean; item: IMcqItemView; changes: string }> {
  const { data } = await apiClient.post("/api/generate/mcq/revise", payload);
  return data as { ok: boolean; item: IMcqItemView; changes: string };
}

/**
 * postSaveMcq
 * Persists the finalized MCQ (placeholder until DB wiring is added).
 */
export async function postSaveMcq(
  payload: unknown
): Promise<{ ok: true; id: string } | { ok: false; duplicate?: boolean; message: string }> {
  const { data } = await apiClient.post("/api/generate/mcq/save", payload);
  return data as { ok: true; id: string } | { ok: false; duplicate?: boolean; message: string };
}

export function useMcqMutations() {
  const generate = useMutation({ mutationFn: postGenerateMcq });
  const save = useMutation({ mutationFn: postSaveMcq });
  const revise = useMutation({ mutationFn: postReviseMcq });
  return { generate, save, revise };
}

/**
 * postRetrievalQuery
 * Posts a retrieval query to the server. Computes embeddings server-side and performs hybrid search.
 */
export async function postRetrievalQuery(payload: IRetrievalRequest): Promise<IRetrievalResponse> {
  const { data } = await apiClient.post("/api/retrieval/query", payload);
  return data as IRetrievalResponse;
}

/**
 * postRetrievalEnhanceQuery
 * Calls the enhancement endpoint which may use an LLM to improve the query.
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
