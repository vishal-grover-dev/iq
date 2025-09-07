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
