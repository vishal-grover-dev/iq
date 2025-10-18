import type { IMcqItemView } from "@/types/mcq.types";
import { getSupabaseServiceRoleClient } from "@/utils/supabase.utils";
import { getEmbeddings } from "@/services/ai/embeddings.service";
import { buildMcqEmbeddingText } from "@/utils/mcq.utils";

/**
 * Retrieve context documents by topic, subtopic, and query using hybrid search.
 * Calls the retrieval_hybrid_by_labels RPC for vector + keyword combined search.
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
    p_query_embedding: embedding as unknown as any,
    p_query_text: args.query,
    p_subtopic: args.subtopic ?? null,
    p_version: args.version ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
    p_alpha: 0.5,
  });
  if (error) throw new Error(error.message);
  const items = (rows ?? []).map((r: any) => ({
    title: r.title as string | null,
    url: r.path as string,
    content: r.content as string,
  }));
  return items;
}

/**
 * Retrieve semantically similar MCQs (neighbors) to a given MCQ.
 * Uses pgvector similarity search via the retrieval_mcq_neighbors RPC.
 */
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
    p_embedding: emb as unknown as any,
    p_subtopic: args.subtopic ?? null,
    p_topk: Math.min(Math.max(args.topK ?? 8, 1), 20),
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    question: r.question as string,
    options: (r.options ?? []).slice(0, 4) as [string, string, string, string],
    score: Number(r.score ?? 0),
  }));
}

/**
 * Retrieve recent MCQ questions from the user's saved items.
 * Used as negative examples to avoid repeating similar questions during generation.
 */
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
    const s = String((r as any)?.question || "").trim();
    if (s && !seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  }
  // Add hardcoded banned gist observed repeatedly
  out.push(
    "What will happen when the button in the following code is clicked? Will it update the displayed count on the button?"
  );
  return out.slice(0, Math.max(1, Math.min(args.limit ?? 12, 50)));
}
