import { z } from "zod";
import { EContentCategory, EInterviewStream, EInterviewTopic, EInterviewIngestType } from "@/types/upload.types";
export const formSchema = z.discriminatedUnion("contentCategory", [
  z.object({
    contentCategory: z.literal(EContentCategory.INTERVIEW_STREAMS),
    stream: z.nativeEnum(EInterviewStream).default(EInterviewStream.FRONTEND_REACT),
    items: z
      .array(
        z.object({
          topic: z.nativeEnum(EInterviewTopic),
          subtopic: z.string().optional(),
          ingestType: z.nativeEnum(EInterviewIngestType),
          url: z.string().url("Enter a valid URL"),
        })
      )
      .min(1, "Add at least one item"),
  }),
]);

export type TFormSchema = z.infer<typeof formSchema>;
