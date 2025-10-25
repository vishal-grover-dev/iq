import { apiClient } from "@/services/http.services";
import { getSupabaseServiceRoleClient } from "@/services/supabase.services";
import { getEmbeddings } from "@/services/ai/embedding.service";
import { buildMcqEmbeddingText } from "@/utils/mcq.utils";
import type { IMcqItemView } from "@/types/mcq.types";
import type { IContextRow, INeighborRow, IRecentQuestionRow } from "@/types/app.types";
import { useMutation, useQuery, type QueryKey } from "@tanstack/react-query";
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

export function useRetrievalQuery(key: QueryKey, enabled: boolean, fn: () => Promise<IRetrievalResponse>) {
  return useQuery({ queryKey: key, queryFn: fn, enabled });
}

export function useRetrievalMutations() {
  const retrieve = useMutation({ mutationFn: postRetrievalQuery });
  const enhance = useMutation({ mutationFn: postRetrievalEnhanceQuery });
  return { retrieve, enhance };
}

/**
 * Section: MCQ Retrieval Helpers
 * Consolidated from utils/mcq-retrieval.utils.ts; service layer owns external API/database access.
 */

export async function retrieveContextByLabels(args: {
  userId: string;
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  query: string;
  topK?: number;
}): Promise<Array<{ title?: string | null; url: string; content: string }>> {
  const supabase = getSupabaseServiceRoleClient();
  const [embedding] = await getEmbeddings([args.query]);
  const { data: rows, error } = await supabase.rpc("retrieval_hybrid_by_labels", {
    p_user_id: args.userId,
    p_topic: args.topic,
    p_query_embedding: embedding as unknown as number[],
    p_query_text: args.query,
    p_subtopic: args.subtopic ?? null,
    p_version: args.version ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
    p_alpha: 0.5,
  });
  if (error) throw new Error(error.message);
  return (rows ?? []).map((r: IContextRow) => ({
    title: r.title,
    url: r.path,
    content: r.content,
  }));
}

export async function retrieveNeighbors(args: {
  userId: string;
  topic: string;
  subtopic?: string | null;
  mcq: IMcqItemView;
  topK?: number;
}): Promise<Array<{ question: string; options: [string, string, string, string]; score: number }>> {
  const supabase = getSupabaseServiceRoleClient();
  const [emb] = await getEmbeddings([buildMcqEmbeddingText(args.mcq)]);
  const { data, error } = await supabase.rpc("retrieval_mcq_neighbors", {
    p_user_id: args.userId,
    p_topic: args.topic,
    p_embedding: emb as unknown as number[],
    p_subtopic: args.subtopic ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: INeighborRow) => ({
    question: r.question,
    options: (r.options ?? []).slice(0, 4) as [string, string, string, string],
    score: Number(r.score ?? 0),
  }));
}

export async function getRecentQuestions(args: {
  userId: string;
  topic: string;
  subtopic?: string | null;
  limit?: number;
}): Promise<string[]> {
  const supabase = getSupabaseServiceRoleClient();
  const q = supabase
    .from("mcq_items")
    .select("question, subtopic, topic")
    .eq("user_id", args.userId)
    .eq("topic", args.topic)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(args.limit ?? 12, 50)));
  if (args.subtopic) q.eq("subtopic", args.subtopic);
  const { data, error } = await q;
  if (error) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const s = String((r as IRecentQuestionRow)?.question || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  out.push(
    "What will happen when the button in the following code is clicked? Will it update the displayed count on the button?"
  );
  return out.slice(0, Math.max(1, Math.min(args.limit ?? 12, 50)));
}
