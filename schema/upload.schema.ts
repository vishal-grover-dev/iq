import { z } from "zod";
import {
  EContentCategory,
  EAcademicClass,
  EAcademicSubject,
  EEducationBoard,
  EAcademicResourceType,
  EInterviewStream,
  EInterviewTopic,
  EInterviewIngestType,
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
  z.object({ contentCategory: z.literal(EContentCategory.COMPETITIVE_EXAM) }),
  z.object({ contentCategory: z.literal(EContentCategory.VIDEO_SUBTITLES) }),
  z.object({
    contentCategory: z.literal(EContentCategory.INTERVIEW_STREAMS),
    stream: z.nativeEnum(EInterviewStream).default(EInterviewStream.FRONTEND_REACT),
    items: z
      .array(
        z.object({
          topic: z.nativeEnum(EInterviewTopic),
          subtopic: z.string().min(1, "Subtopic is required"),
          ingestType: z.nativeEnum(EInterviewIngestType),
          url: z.string().url("Enter a valid URL"),
        })
      )
      .min(1, "Add at least one item"),
  }),
]);

export type TFormSchema = z.infer<typeof formSchema>;
