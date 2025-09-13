import { z } from "zod";
import { EBloomLevel } from "@/types/retrieval.types";

export const mcqDifficultyValues = ["Easy", "Medium", "Hard"] as const;
export const mcqDifficultySchema = z.enum(mcqDifficultyValues);
export type TMcqDifficulty = (typeof mcqDifficultyValues)[number];

export const mcqCitationSchema = z.object({
  url: z.string().url().optional(),
  sectionTitle: z.string().optional(),
  documentId: z.string().uuid().optional(),
  chunkIndex: z.number().int().nonnegative().optional(),
  bucket: z.string().optional(),
  path: z.string().optional(),
});

export const mcqItemSchema = z.object({
  question: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1),
  citations: z.array(mcqCitationSchema).default([]),
  labels: z.object({
    difficulty: mcqDifficultySchema,
    bloom: z.nativeEnum(EBloomLevel),
    topic: z.string().min(1),
    subtopic: z.string().optional(),
    version: z.string().optional(),
  }),
});

export const generateMcqFiltersSchema = z.object({
  topic: z.string().min(1),
  subtopic: z.string().optional(),
  version: z.string().optional(),
});

export const generateMcqRequestSchema = z.object({
  filters: generateMcqFiltersSchema,
  count: z.number().int().positive().max(20),
  difficulty: mcqDifficultySchema.optional(),
  bloomLevels: z.array(z.nativeEnum(EBloomLevel)).optional(),
});

export const generateMcqResponseSchema = z.object({
  ok: z.literal(true),
  stored: z.number().int().nonnegative(),
  itemIds: z.array(z.string().uuid()),
});

export type TGenerateMcqRequest = z.infer<typeof generateMcqRequestSchema>;
export type TGenerateMcqResponse = z.infer<typeof generateMcqResponseSchema>;
export type TMcqItem = z.infer<typeof mcqItemSchema>;
