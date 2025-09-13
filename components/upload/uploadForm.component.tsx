"use client";
import Loader from "@/components/common/loader.component";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormLabel } from "@/components/ui/form-label";
import { formSchema } from "@/schema/upload.schema";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  EAcademicResourceType as AcademicResourceType,
  EContentCategory as ContentCategory,
  EAcademicClass as AcademicClass,
  EAcademicSubject as AcademicSubject,
  type TUploadState as UploadState,
  EInterviewStream as InterviewStream,
  EInterviewTopic as InterviewTopic,
  EInterviewIngestType as InterviewIngestType,
} from "@/types/upload.types";
import { uploadAcademicFiles } from "@/services/upload.services";
import { useIngestAcademicMutations } from "@/services/ingest.services";
import { SUPABASE_RAG_BUCKET } from "@/constants/app.constants";
import { INTERVIEW_DEFAULT_STREAM, INTERVIEW_SUBTOPICS } from "@/utils/interview-streams-options.utils";
import InterviewSection from "@/components/upload/interviewSection.component";
import AcademicSection from "@/components/upload/academicSection.component";
import { useGenerateMcqMutations } from "@/services/generation.services";
import CompletionModal from "@/components/upload/completionModal.component";
import useInterviewIngestion from "@/hooks/useInterviewIngestion.hook";

export default function UploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const [hasUploadFailed, setHasUploadFailed] = useState<boolean>(false);
  const [uploadedObjects, setUploadedObjects] = useState<
    { originalFileName: string; storagePath: string; bucket: string; mimeType?: string }[]
  >([]);
  const { mutateAsync: ingestAcademic } = useIngestAcademicMutations();
  const { mutateAsync: generateMcqs, isPending: isGenerating } = useGenerateMcqMutations();
  const { startIngestions, isProcessing: isIngesting } = useInterviewIngestion();
  const [completionModal, setCompletionModal] = useState<{
    open: boolean;
    topics: string[];
    subtopics: string[];
    ingestionIds: string[];
  }>({ open: false, topics: [], subtopics: [], ingestionIds: [] });

  const defaultValues: any = {
    contentCategory: ContentCategory.INTERVIEW_STREAMS,
    stream: InterviewStream.FRONTEND_REACT,
    items: [
      {
        topic: InterviewTopic.REACT,
        subtopic: "",
        ingestType: InterviewIngestType.REPO,
        url: "",
      },
    ],
  } as const;

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<any>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as any,
    mode: "onBlur",
  });

  const contentCategory = watch("contentCategory");
  const files = (watch as any)("files") as File[] | undefined;
  const resourceType = (watch as any)("resourceType") as AcademicResourceType | undefined;
  const grade = (watch as any)("grade") as AcademicClass | undefined;
  const subject = (watch as any)("subject") as AcademicSubject | undefined;
  const chapterNumber = (watch as any)("chapterNumber") as string | undefined;
  const chapterName = (watch as any)("chapterName") as string | undefined;
  const stream = (watch as any)("stream") as InterviewStream | undefined;
  const items = ((watch as any)("items") as any[]) || [];

  const contentCategoryOptions = [
    { label: ContentCategory.INTERVIEW_STREAMS, value: ContentCategory.INTERVIEW_STREAMS },
    { label: ContentCategory.ACADEMIC, value: ContentCategory.ACADEMIC },
    { label: ContentCategory.COMPETITIVE_EXAM, value: ContentCategory.COMPETITIVE_EXAM },
    { label: ContentCategory.VIDEO_SUBTITLES, value: ContentCategory.VIDEO_SUBTITLES },
  ];

  const isAcademic = contentCategory === ContentCategory.ACADEMIC;
  const isInterview = contentCategory === ContentCategory.INTERVIEW_STREAMS;

  const isAcademicRequiredFieldsFilled = useMemo(() => {
    return (
      isAcademic && Boolean((watch as any)("board")) && Boolean(grade) && Boolean(subject) && Boolean(resourceType)
    );
  }, [isAcademic, watch, grade, subject, resourceType]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const existing = watch("files") ?? [];
      const next = [...existing, ...acceptedFiles];
      setValue("files", next as any, { shouldValidate: true });

      if (!isAcademicRequiredFieldsFilled) {
        // should be disabled anyway, but guard
        toast.error("Select required fields first", {
          description: "Board, Class, Subject, and Resource type are required",
        });
        return;
      }

      try {
        setIsUploadingFiles(true);
        setHasUploadFailed(false);
        const results = await uploadAcademicFiles(
          {
            contentCategory: ContentCategory.ACADEMIC,
            board: (watch as any)("board"),
            grade: grade!,
            subject: subject!,
          },
          acceptedFiles
        );
        toast.success("Files uploaded to storage");

        // Persist uploaded object info for ingestion
        setUploadedObjects((prev) => [
          ...prev,
          ...results.map((r, idx) => ({
            originalFileName: acceptedFiles[idx].name,
            storagePath: r.path,
            bucket: SUPABASE_RAG_BUCKET,
            mimeType: acceptedFiles[idx].type || "application/pdf",
          })),
        ]);
      } catch (err: any) {
        setHasUploadFailed(true);
        // Revert optimistic file list addition for the failed batch
        setValue("files", existing as any, { shouldValidate: true });
        toast.error("Upload failed", { description: err?.message ?? "Please retry" });
      } finally {
        setIsUploadingFiles(false);
      }
    },
    [setValue, watch, isAcademicRequiredFieldsFilled, grade, subject, resourceType, chapterNumber, chapterName]
  );

  const handleCategoryChange = useCallback(
    (val: ContentCategory) => {
      setValue("contentCategory", val as any, { shouldValidate: true, shouldTouch: true });
      if (val === ContentCategory.INTERVIEW_STREAMS) {
        // initialize stream/items if switching from Academic
        setValue("stream", (stream ?? INTERVIEW_DEFAULT_STREAM) as any, { shouldValidate: true });
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
            ] as any,
            { shouldValidate: true }
          );
        }
      }
    },
    [setValue, stream, items]
  );

  const onSubmit = async (_data: any) => {
    try {
      setUploadState("processing");
      if (isAcademic) {
        if (!uploadedObjects.length) {
          toast.error("Please upload at least one file before submitting");
          setUploadState("idle");
          return;
        }
        const payload = {
          contentCategory: ContentCategory.ACADEMIC,
          metadata: {
            board: (watch as any)("board"),
            grade: grade!,
            subject: subject!,
            resourceType: resourceType!,
            chapterNumber,
            chapterName,
          },
          uploadedObjects,
        } as any;
        await ingestAcademic(payload);
        toast.success("Ingestion started");
      } else if (isInterview) {
        try {
          toast.success("Ingestions started. Tracking progress…");
          const { ingestionIds, coverage, recent } = await startIngestions(
            items as any,
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
        } catch (err: any) {
          toast.error(err?.message ?? "Failed to create ingestion(s)");
          setUploadState("failed");
          return;
        }
      }
      setUploadState("completed");
    } catch (e) {
      setUploadState("failed");
    }
  };

  const disabled = uploadState === "submitting" || uploadState === "processing" || isUploadingFiles || isIngesting;
  const submitDisabled = isAcademic
    ? disabled || hasUploadFailed || !isAcademicRequiredFieldsFilled || !files || (files as any).length === 0
    : disabled || !isInterview || items.length === 0 || items.some((r) => !r.url || !r.topic);

  if (uploadState === "processing") {
    return <Loader />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='grid gap-4'>
        <div className='grid gap-2 sm:max-w-sm'>
          <FormLabel required>Content category</FormLabel>
          <Combobox
            value={contentCategory as any}
            onChange={(val) => handleCategoryChange(val as ContentCategory)}
            options={contentCategoryOptions}
            placeholder='Select category'
            searchPlaceholder='Search category...'
            emptyMessage='No category found.'
            disabled={disabled}
          />
          {(errors as any).contentCategory && (
            <ErrorMessage message={(errors as any).contentCategory.message as string} />
          )}
        </div>

        {isInterview && (
          <InterviewSection items={items as any} stream={stream} disabled={disabled} setValue={setValue} />
        )}

        {isAcademic && (
          <AcademicSection disabled={disabled} errors={errors} watch={watch} setValue={setValue} onDrop={onDrop} />
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
        isGenerating={isGenerating}
        onOpenChange={(v) => setCompletionModal((p) => ({ ...p, open: v }))}
        onGenerate={async () => {
          try {
            const first = items[0];
            const { stored } = await generateMcqs({
              filters: { topic: first.topic, subtopic: first.subtopic || undefined },
              count: 10,
            } as any);
            toast.success(`Generated ${stored} MCQs`);
            setCompletionModal((p) => ({ ...p, open: false }));
          } catch (err: any) {
            toast.error(err?.message ?? "Failed to generate MCQs");
          }
        }}
      />
    </form>
  );
}
