import { z } from "zod";

export const ingestResponseSchema = z.object({
  ok: z.boolean(),
  ingestionId: z.string().uuid(),
  message: z.string(),
  chunks: z.number().int().nonnegative(),
  vectors: z.number().int().nonnegative(),
});

export type TIngestResponse = z.infer<typeof ingestResponseSchema>;

// Repo/Web ingestion (Interview Questions v1)
export const ingestRepoRequestSchema = z.object({
  mode: z.literal("repo"),
  repoUrl: z.string().url(),
  paths: z.array(z.string()).default([]),
  topic: z.enum(["React", "JavaScript", "TypeScript", "HTML", "CSS"]),
  subtopic: z.string().optional(),
  version: z.string().optional(),
  maxFiles: z.number().int().positive().max(200).default(200),
});

export const ingestWebRequestSchema = z.object({
  mode: z.literal("web"),
  seeds: z.array(z.string().url()).min(1),
  domain: z.string().min(1),
  prefix: z.string().optional(),
  depth: z.number().int().min(0).max(4).default(2),
  maxPages: z.number().int().positive().max(200).default(200),
  crawlDelayMs: z.number().int().min(0).max(5000).default(500),
  includePatterns: z.array(z.string()).default([]).optional(),
  excludePatterns: z.array(z.string()).default([]).optional(),
  depthMap: z.record(z.string(), z.number().int().min(0).max(4)).default({}).optional(),
  autoPlan: z.boolean().default(true),
  topic: z.enum(["React", "JavaScript", "TypeScript", "HTML", "CSS"]),
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
