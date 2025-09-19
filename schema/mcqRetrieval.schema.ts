import { z } from "zod";
import { EBloomLevel } from "@/types/mcq.types";

export const retrievalFiltersSchema = z.object({
  board: z.string().min(1),
  grade: z.string().min(1),
  subject: z.string().min(1),
  resourceType: z.string().optional(),
  chapterNumber: z.string().optional(),
  chapterName: z.string().optional(),
  subjectWide: z.boolean().optional(),
});

export const retrievalRequestSchema = z.object({
  filters: retrievalFiltersSchema,
  query: z.string().min(1),
  topK: z.number().int().positive().max(50).optional(),
  alpha: z.number().min(0).max(1).optional(),
  bloomTargets: z.array(z.nativeEnum(EBloomLevel)).optional(),
  bloomDistribution: z.record(z.nativeEnum(EBloomLevel), z.number().min(0).max(1)).optional(),
});

export const retrievalItemSchema = z.object({
  documentId: z.string().uuid(),
  chunkIndex: z.number().int().nonnegative(),
  content: z.string(),
  tokens: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
  title: z.string().nullable().optional(),
  bucket: z.string(),
  path: z.string(),
  rerankScore: z.number().optional(),
  fusedScore: z.number().optional(),
});

export const retrievalResponseSchema = z.object({
  ok: z.boolean(),
  items: z.array(retrievalItemSchema),
  debug: z
    .object({
      vectorMs: z.number().optional(),
      keywordMs: z.number().optional(),
      rerankMs: z.number().optional(),
      bloomHintApplied: z.boolean().optional(),
    })
    .optional(),
});

export const retrievalEnhancementRequestSchema = z.object({
  rawQuery: z.string().min(1),
  filters: retrievalFiltersSchema,
});

export const retrievalEnhancementResponseSchema = z.object({
  ok: z.boolean(),
  enhancedQuery: z.string().min(1),
  explanations: z.array(z.string()).default([]),
  termHighlights: z.array(z.string()).optional(),
  debug: z.object({ ms: z.number().optional() }).optional(),
});

export type TRetrievalRequest = z.infer<typeof retrievalRequestSchema>;
export type TRetrievalResponse = z.infer<typeof retrievalResponseSchema>;
export type TRetrievalEnhancementRequest = z.infer<typeof retrievalEnhancementRequestSchema>;
export type TRetrievalEnhancementResponse = z.infer<typeof retrievalEnhancementResponseSchema>;
