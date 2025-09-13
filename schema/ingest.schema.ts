import { z } from "zod";
import {
  EContentCategory,
  EAcademicClass,
  EAcademicSubject,
  EEducationBoard,
  EAcademicResourceType,
} from "@/types/upload.types";

export const uploadedObjectSchema = z.object({
  originalFileName: z.string().min(1),
  storagePath: z.string().min(1),
  bucket: z.string().min(1),
  mimeType: z.string().optional(),
});

export const academicMetadataSchema = z.object({
  board: z.nativeEnum(EEducationBoard),
  grade: z.nativeEnum(EAcademicClass),
  subject: z.nativeEnum(EAcademicSubject),
  resourceType: z.nativeEnum(EAcademicResourceType),
  chapterNumber: z.string().optional(),
  chapterName: z.string().optional(),
});

export const ingestAcademicRequestSchema = z.object({
  contentCategory: z.literal(EContentCategory.ACADEMIC),
  metadata: academicMetadataSchema,
  uploadedObjects: z.array(uploadedObjectSchema).min(1),
});

export type TIngestAcademicRequest = z.infer<typeof ingestAcademicRequestSchema>;

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
  seedUrl: z.string().url(),
  domain: z.string().min(1),
  prefix: z.string().optional(),
  depth: z.number().int().min(0).max(4).default(2),
  maxPages: z.number().int().positive().max(200).default(200),
  crawlDelayMs: z.number().int().min(0).max(5000).default(500),
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
