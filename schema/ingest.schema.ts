import { z } from "zod";
import { EInterviewTopic } from "@/types/upload.types";

// Use z.enum over the enum's values (avoids deprecated z.nativeEnum)
const interviewTopicValues = Object.values(EInterviewTopic) as [EInterviewTopic, ...EInterviewTopic[]];
export const InterviewTopicSchema = z.enum(interviewTopicValues);

export const ingestResponseSchema = z.object({
  ok: z.boolean(),
  ingestionId: z.string().uuid(),
  message: z.string(),
  chunks: z.number().int().nonnegative(),
  vectors: z.number().int().nonnegative(),
  // Batch-per-call optional fields (repo process)
  completed: z.boolean().optional(),
  processed: z.number().int().nonnegative().optional(),
  total: z.number().int().nonnegative().optional(),
});

export type TIngestResponse = z.infer<typeof ingestResponseSchema>;

// Repo/Web ingestion (Interview Questions v1)
export const ingestRepoRequestSchema = z.object({
  mode: z.literal("repo"),
  repoUrl: z.string().url(),
  paths: z.array(z.string()).default([]),
  topic: InterviewTopicSchema,
  subtopic: z.string().optional(),
  version: z.string().optional(),
  maxFiles: z.number().int().positive().max(200).default(200),
});

export const ingestWebRequestSchema = z.object({
  mode: z.literal("web"),
  seeds: z.array(z.string().url()).min(1),
  domain: z.string().min(1),
  // Downward-only crawl from the seed path; depth controls how far to descend
  depth: z.number().int().min(0).max(4).default(2),
  maxPages: z.number().int().positive().max(200).default(50),
  crawlDelayMs: z.number().int().min(0).max(5000).default(300),
  topic: InterviewTopicSchema,
  subtopic: z.string().optional(),
  version: z.string().optional(),
});

export const ingestRepoOrWebRequestSchema = z.discriminatedUnion("mode", [
  ingestRepoRequestSchema,
  ingestWebRequestSchema,
]);

export type TIngestRepoRequest = z.infer<typeof ingestRepoRequestSchema>;
export type TIngestWebRequest = z.infer<typeof ingestWebRequestSchema>;
export type TIngestRepoOrWebRequest = z.infer<typeof ingestRepoOrWebRequestSchema>;
