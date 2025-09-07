import { hfClient } from "@/services/http.services";
import { useMutation } from "@tanstack/react-query";
import { IEmbeddingRequestItem, IEmbeddingResultItem } from "@/types/ingest.types";

/**
 * Server-only note:
 * - This service calls Hugging Face with a secret key via axios interceptors.
 * - It MUST be invoked on the server (e.g., API routes) and should not be exposed to the browser directly.
 * - Do not create or export a React Query hook for server-only call sites; use hooks only for client-facing APIs.
 */
/**
 * Calls a Hugging Face-hosted embeddings endpoint that accepts an array of texts
 * and returns embeddings. Assumes 1024-d output (mxbai-embed-large-v1).
 */
export async function getEmbeddingsBatch(items: IEmbeddingRequestItem[]): Promise<IEmbeddingResultItem[]> {
  if (!items || items.length === 0) return [];
  const res = await hfClient.post("", { inputs: items.map((i) => i.text) });
  const data: number[][] = res.data;
  if (!Array.isArray(data)) {
    throw new Error("Unexpected HF embeddings response format");
  }
  if (data.length !== items.length) {
    throw new Error("HF embeddings count mismatch");
  }
  return data.map((emb, idx) => ({ id: items[idx].id, embedding: emb }));
}
