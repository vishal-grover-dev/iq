import { z } from "zod";
import {
  EContentCategory,
  EAcademicClass,
  EAcademicSubject,
  EEducationBoard,
  EAcademicResourceType,
} from "@/types/upload.types";
export const baseSchema = z.object({
  files: z
    .array(
      z.instanceof(File, {
        message: "Invalid file",
      })
    )
    .min(1, "Please add at least one file"),
});

export const academicSchema = baseSchema.extend({
  contentCategory: z.literal(EContentCategory.ACADEMIC),
  board: z.enum(Object.values(EEducationBoard) as [string, ...string[]]),
  grade: z.enum(Object.values(EAcademicClass) as [string, ...string[]]),
  subject: z.enum(Object.values(EAcademicSubject) as [string, ...string[]]),
  resourceType: z.enum([EAcademicResourceType.TEXTBOOK, EAcademicResourceType.PREVIOUS_YEAR_PAPER]),
  chapterNumber: z.string().optional(),
  chapterName: z.string().optional(),
});

export const formSchema = z.discriminatedUnion("contentCategory", [
  academicSchema,
  baseSchema.extend({ contentCategory: z.literal(EContentCategory.COMPETITIVE_EXAM) }),
  baseSchema.extend({ contentCategory: z.literal(EContentCategory.VIDEO_SUBTITLES) }),
]);

export type TFormSchema = z.infer<typeof formSchema>;
