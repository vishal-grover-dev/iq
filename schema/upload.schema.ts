import { z } from "zod";
import {
  ContentCategory,
  AcademicClass,
  AcademicSubject,
  EducationBoard,
  AcademicResourceType,
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
  contentCategory: z.literal(ContentCategory.ACADEMIC),
  board: z.enum(Object.values(EducationBoard) as [string, ...string[]]),
  grade: z.enum(Object.values(AcademicClass) as [string, ...string[]]),
  subject: z.enum(Object.values(AcademicSubject) as [string, ...string[]]),
  resourceType: z.enum([AcademicResourceType.TEXTBOOK, AcademicResourceType.PREVIOUS_YEAR_PAPER]),
});

export const formSchema = z.discriminatedUnion("contentCategory", [
  academicSchema,
  baseSchema.extend({ contentCategory: z.literal(ContentCategory.COMPETITIVE_EXAM) }),
  baseSchema.extend({ contentCategory: z.literal(ContentCategory.VIDEO_SUBTITLES) }),
]);

export type FormSchema = z.infer<typeof formSchema>;
