"use client";

import CompletionModal from "@/components/upload/completionModal.component";
import InterviewSection from "@/components/upload/interviewSection.component";
import Loader from "@/components/common/loader.component";
import useInterviewIngestion from "@/hooks/useInterviewIngestion.hook";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormLabel } from "@/components/ui/form-label";
import { formSchema } from "@/schema/upload.schema";
import { INTERVIEW_DEFAULT_STREAM, INTERVIEW_SUBTOPICS } from "@/constants/interview-streams.constants";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  EContentCategory as ContentCategory,
  type TUploadState as UploadState,
  EInterviewStream as InterviewStream,
  EInterviewTopic as InterviewTopic,
  EInterviewIngestType as InterviewIngestType,
  type IInterviewStreamsFormValues,
  type IInterviewIngestItem,
} from "@/types/upload.types";

export default function UploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");

  const { startIngestions, isProcessing: isIngesting } = useInterviewIngestion();
  const [completionModal, setCompletionModal] = useState<{
    open: boolean;
    topics: string[];
    subtopics: string[];
    ingestionIds: string[];
  }>({ open: false, topics: [], subtopics: [], ingestionIds: [] });

  const defaultValues: IInterviewStreamsFormValues = {
    contentCategory: ContentCategory.INTERVIEW_STREAMS,
    stream: InterviewStream.FRONTEND_REACT,
    items: [
      {
        topic: InterviewTopic.REACT,
        subtopic: "",
        ingestType: InterviewIngestType.REPO,
        url: "",
        depth: 3,
      },
    ],
  } as const;

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IInterviewStreamsFormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues,
    mode: "onBlur",
  });

  const contentCategory = watch("contentCategory");
  const stream = watch("stream");
  const items = (watch("items") as IInterviewIngestItem[]) || [];

  const contentCategoryOptions = [
    { label: ContentCategory.INTERVIEW_STREAMS, value: ContentCategory.INTERVIEW_STREAMS },
  ];

  const isInterview = contentCategory === ContentCategory.INTERVIEW_STREAMS;

  const handleCategoryChange = useCallback(
    (val: ContentCategory) => {
      setValue("contentCategory", val, { shouldValidate: true, shouldTouch: true });
      if (val === ContentCategory.INTERVIEW_STREAMS) {
        // initialize stream/items if switching from Academic
        setValue("stream", stream ?? INTERVIEW_DEFAULT_STREAM, { shouldValidate: true });
        if (!items || items.length === 0) {
          setValue(
            "items",
            [
              {
                topic: InterviewTopic.REACT,
                subtopic: INTERVIEW_SUBTOPICS[InterviewTopic.REACT][0],
                ingestType: InterviewIngestType.REPO,
                url: "",
              },
            ],
            { shouldValidate: true }
          );
        }
      }
    },
    [setValue, stream, items]
  );

  const onSubmit: SubmitHandler<IInterviewStreamsFormValues> = async (_data) => {
    try {
      setUploadState("processing");
      if (isInterview) {
        try {
          toast.success("Ingestions started. Tracking progress…");
          const { ingestionIds, coverage } = await startIngestions(
            items,
            ({ ingestionId, inflightStep, processed, totalPlanned, currentPathOrUrl }) => {
              if (inflightStep) {
                toast.message(`Ingestion ${ingestionId.slice(0, 8)}: ${inflightStep}`, {
                  description: [
                    typeof processed === "number" && typeof totalPlanned === "number"
                      ? `${processed}/${totalPlanned}`
                      : undefined,
                    currentPathOrUrl ? `Current: ${currentPathOrUrl}` : undefined,
                  ]
                    .filter(Boolean)
                    .join(" · "),
                });
              }
            }
          );

          setCompletionModal({
            open: true,
            topics: coverage.topics,
            subtopics: coverage.subtopics,
            ingestionIds,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Failed to create ingestion(s)";
          toast.error(message);
          setUploadState("failed");
          return;
        }
      }
      setUploadState("completed");
    } catch (e) {
      setUploadState("failed");
    }
  };

  const disabled = uploadState === "submitting" || uploadState === "processing" || isIngesting;
  const submitDisabled = disabled || !isInterview || items.length === 0 || items.some((r) => !r.url || !r.topic);

  if (uploadState === "processing") {
    return <Loader />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='grid gap-4'>
        <div className='grid gap-2 sm:max-w-sm'>
          <FormLabel required>Content category</FormLabel>
          <Combobox
            value={contentCategory}
            onChange={(val) => handleCategoryChange(val as ContentCategory)}
            options={contentCategoryOptions}
            placeholder='Select category'
            searchPlaceholder='Search category...'
            emptyMessage='No category found.'
            disabled={disabled}
          />
          {errors?.contentCategory && <ErrorMessage message={errors.contentCategory.message as unknown as string} />}
        </div>

        {isInterview && (
          <InterviewSection
            items={items}
            stream={stream}
            disabled={disabled}
            setValue={
              setValue as unknown as (
                name:
                  | "contentCategory"
                  | "stream"
                  | "items"
                  | `items.${number}`
                  | `items.${number}.url`
                  | `items.${number}.topic`
                  | `items.${number}.subtopic`
                  | `items.${number}.ingestType`,
                value: unknown,
                options?: { shouldValidate?: boolean; shouldTouch?: boolean }
              ) => void
            }
          />
        )}
      </div>

      <div className='flex items-center gap-3 justify-end'>
        <Button type='submit' size='lg' disabled={submitDisabled} className='sm:min-w-44'>
          Submit
        </Button>

        {uploadState === "completed" && <span className='text-sm text-green-700'>Upload completed.</span>}
        {uploadState === "failed" && <span className='text-sm text-red-600'>Something went wrong. Please retry.</span>}
      </div>

      <CompletionModal
        open={completionModal.open}
        topics={completionModal.topics}
        subtopics={completionModal.subtopics}
        onOpenChange={(v) => setCompletionModal((p) => ({ ...p, open: v }))}
      />
    </form>
  );
}
