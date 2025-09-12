"use client";
import FileDropzone from "@/components/ui/file-dropzone";
import Loader from "@/components/common/loader.component";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormLabel } from "@/components/ui/form-label";
import { TFormSchema as FormSchema, formSchema } from "@/schema/upload.schema";
import { Input } from "@/components/ui/input";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  EAcademicResourceType as AcademicResourceType,
  EContentCategory as ContentCategory,
  EAcademicClass as AcademicClass,
  EAcademicSubject as AcademicSubject,
  EEducationBoard as EducationBoard,
  type IAcademicUploadFormValues as AcademicUploadFormValues,
  type TUploadState as UploadState,
  EInterviewStream as InterviewStream,
  EInterviewTopic as InterviewTopic,
  EInterviewIngestType as InterviewIngestType,
} from "@/types/upload.types";
import { uploadAcademicFiles } from "@/services/upload.services";
import { useIngestAcademicMutations, useIngestRepoWebMutations } from "@/services/ingest.services";
import { SUPABASE_RAG_BUCKET } from "@/constants/app.constants";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  INTERVIEW_DEFAULT_STREAM,
  INTERVIEW_INGEST_TYPE_OPTIONS,
  INTERVIEW_SUBTOPICS,
  INTERVIEW_TOPIC_OPTIONS,
} from "@/utils/interview-streams-options.utils";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";

const ACCEPTED_MIME_TYPES = { "application/pdf": [".pdf"] } as const;

export default function UploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const [hasUploadFailed, setHasUploadFailed] = useState<boolean>(false);
  const [uploadedObjects, setUploadedObjects] = useState<
    { originalFileName: string; storagePath: string; bucket: string; mimeType?: string }[]
  >([]);
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
  const [customSubtopic, setCustomSubtopic] = useState<string>("");
  const { mutateAsync: ingestAcademic } = useIngestAcademicMutations();
  const { mutateAsync: ingestRepoWeb } = useIngestRepoWebMutations();

  const defaultValues: any = {
    contentCategory: ContentCategory.INTERVIEW_STREAMS,
    stream: InterviewStream.FRONTEND_REACT,
    items: [
      {
        topic: InterviewTopic.REACT,
        subtopic: INTERVIEW_SUBTOPICS[InterviewTopic.REACT][0],
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
  const resourceTypeOptions = [
    { label: AcademicResourceType.TEXTBOOK, value: AcademicResourceType.TEXTBOOK },
    { label: AcademicResourceType.PREVIOUS_YEAR_PAPER, value: AcademicResourceType.PREVIOUS_YEAR_PAPER },
  ];
  const classOptions = (Object.values(AcademicClass) as string[]).map((v) => ({ label: v, value: v }));
  const subjectOptions = (Object.values(AcademicSubject) as string[]).map((v) => ({ label: v, value: v }));
  const boardOptions = (Object.values(EducationBoard) as string[])
    .map((v) => ({ label: v, value: v }))
    .sort((a, b) => a.label.localeCompare(b.label));

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

  const onSubmit = async (data: any) => {
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
        // Fire one job per row
        for (const row of items) {
          try {
            if (row.ingestType === InterviewIngestType.REPO) {
              await ingestRepoWeb({
                mode: "repo",
                repoUrl: row.url,
                paths: [],
                topic: row.topic as any,
                maxFiles: 200,
              } as any);
            } else {
              // derive domain from URL
              const u = new URL(row.url);
              await ingestRepoWeb({
                mode: "web",
                seedUrl: row.url,
                domain: u.hostname,
                prefix: undefined,
                depth: 2,
                maxPages: 50,
                crawlDelayMs: 300,
                topic: row.topic as any,
              } as any);
            }
          } catch (err: any) {
            toast.error("Failed to start ingestion", { description: err?.message ?? "Error" });
          }
        }
        toast.success("Ingestion started for all rows");
      }
      setUploadState("completed");
    } catch (e) {
      setUploadState("failed");
    }
  };

  const disabled = uploadState === "submitting" || uploadState === "processing" || isUploadingFiles;
  const dropzoneDisabled =
    disabled || (contentCategory as any) !== ContentCategory.ACADEMIC || !isAcademicRequiredFieldsFilled;
  const submitDisabled = isAcademic
    ? disabled || hasUploadFailed || !isAcademicRequiredFieldsFilled || !files || (files as any).length === 0
    : disabled || !isInterview || items.length === 0 || items.some((r) => !r.url || !r.subtopic);

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
          <div className='rounded-lg border p-4 shadow-sm bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40'>
            <div className='grid gap-4'>
              <div className='grid gap-2 sm:max-w-sm'>
                <FormLabel>Interview Streams</FormLabel>
                <Combobox
                  value={stream as any}
                  onChange={(val) => setValue("stream", val as any, { shouldValidate: true })}
                  options={[{ label: InterviewStream.FRONTEND_REACT, value: InterviewStream.FRONTEND_REACT }] as any}
                  placeholder='Select stream'
                  disabled={disabled}
                />
              </div>

              <div className='grid gap-3'>
                {items.map((row, idx) => {
                  const subtopicOptions = [
                    ...INTERVIEW_SUBTOPICS[row.topic as InterviewTopic].map((s) => ({ label: s, value: s })),
                    { label: "Other", value: "__other__" },
                  ];
                  return (
                    <div
                      key={idx}
                      className='grid gap-3 sm:grid-cols-[160px_240px_220px_minmax(520px,1fr)_auto] sm:items-start'
                    >
                      <div className='grid gap-1'>
                        <FormLabel>Topic</FormLabel>
                        <Combobox
                          value={row.topic}
                          onChange={(val) => {
                            const next = items.slice();
                            next[idx] = {
                              ...row,
                              topic: val as InterviewTopic,
                              subtopic: INTERVIEW_SUBTOPICS[val as InterviewTopic][0] ?? "",
                            };
                            setValue("items", next as any, { shouldValidate: true });
                          }}
                          options={INTERVIEW_TOPIC_OPTIONS as any}
                          placeholder='Select topic'
                          disabled={disabled}
                        />
                      </div>

                      <div className='grid gap-1'>
                        <FormLabel>Subtopic</FormLabel>
                        <Combobox
                          value={row.subtopic as any}
                          onChange={(val) => {
                            if (val === "__other__") {
                              (document.getElementById(`custom-subtopic-${idx}`) as HTMLInputElement)?.focus();
                              setOpenModalIndex(idx);
                              return;
                            }
                            const next = items.slice();
                            next[idx] = { ...row, subtopic: val };
                            setValue("items", next as any, { shouldValidate: true });
                          }}
                          options={subtopicOptions as any}
                          placeholder='Select subtopic'
                          disabled={disabled}
                        />
                      </div>

                      <div className='grid gap-1'>
                        <FormLabel>Ingest Type</FormLabel>
                        <Combobox
                          value={row.ingestType}
                          onChange={(val) => {
                            const next = items.slice();
                            next[idx] = { ...row, ingestType: val as InterviewIngestType };
                            setValue("items", next as any, { shouldValidate: true });
                          }}
                          options={INTERVIEW_INGEST_TYPE_OPTIONS as any}
                          placeholder='Select ingest type'
                          disabled={disabled}
                        />
                      </div>

                      <div className='grid gap-1'>
                        <FormLabel>URL</FormLabel>
                        <Input
                          value={row.url}
                          onChange={(e) => {
                            const next = items.slice();
                            next[idx] = { ...row, url: e.target.value };
                            setValue("items", next as any, { shouldValidate: true });
                          }}
                          type='url'
                          inputMode='url'
                          placeholder={
                            row.ingestType === InterviewIngestType.REPO
                              ? "https://github.com/owner/repo"
                              : "https://developer.mozilla.org/"
                          }
                          title={
                            row.ingestType === InterviewIngestType.REPO
                              ? "Enter a public GitHub docs repository URL"
                              : "Enter a website seed URL to crawl within the same domain"
                          }
                          aria-label='Source URL'
                          className='w-full'
                          disabled={disabled}
                        />
                      </div>

                      <div className='flex gap-2 pt-6 justify-end'>
                        {idx === 0 ? (
                          <Button
                            type='button'
                            variant='secondary'
                            onClick={() =>
                              setValue(
                                "items",
                                [
                                  ...items,
                                  {
                                    topic: items[items.length - 1]?.topic ?? InterviewTopic.REACT,
                                    subtopic:
                                      items[items.length - 1]?.subtopic ?? INTERVIEW_SUBTOPICS[InterviewTopic.REACT][0],
                                    ingestType: items[items.length - 1]?.ingestType ?? InterviewIngestType.REPO,
                                    url: "",
                                  },
                                ] as any,
                                { shouldValidate: true }
                              )
                            }
                            title='Add row'
                            aria-label='Add row'
                          >
                            <PlusIcon size={16} />
                          </Button>
                        ) : (
                          <Button
                            type='button'
                            variant='destructive'
                            onClick={() => {
                              const next = items.filter((_, i) => i !== idx);
                              setValue("items", next as any, { shouldValidate: true });
                            }}
                            title='Delete row'
                            aria-label='Delete row'
                          >
                            <TrashIcon size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {isAcademic && (
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='grid gap-2'>
              <FormLabel required>Board (India)</FormLabel>
              <Combobox
                value={(watch as any)("board") as any}
                onChange={(val) => setValue("board", val as any, { shouldValidate: true, shouldTouch: true })}
                options={boardOptions}
                placeholder='Select board'
                searchPlaceholder='Search board...'
                emptyMessage='No board found.'
                listMaxHeightClassName='max-h-96'
                disabled={disabled}
              />
              {(errors as any).board && <ErrorMessage message={(errors as any).board.message as string} />}
            </div>

            <div className='grid gap-2'>
              <FormLabel required>Class (Grade)</FormLabel>
              <Combobox
                value={grade as any}
                onChange={(val) => setValue("grade", val as any, { shouldValidate: true, shouldTouch: true })}
                options={classOptions}
                placeholder='Select class'
                searchPlaceholder='Search class...'
                emptyMessage='No class found.'
                disabled={disabled}
              />
              {(errors as any).grade && <ErrorMessage message={(errors as any).grade.message as string} />}
            </div>

            <div className='grid gap-2'>
              <FormLabel required>Subject</FormLabel>
              <Combobox
                value={subject as any}
                onChange={(val) => setValue("subject", val as any, { shouldValidate: true, shouldTouch: true })}
                options={subjectOptions}
                placeholder='Select subject'
                searchPlaceholder='Search subject...'
                emptyMessage='No subject found.'
                disabled={disabled}
              />
              {(errors as any).subject && <ErrorMessage message={(errors as any).subject.message as string} />}
            </div>

            <div className='grid gap-2'>
              <FormLabel required>Resource type</FormLabel>
              <Combobox
                value={resourceType as any}
                onChange={(val) => setValue("resourceType", val as any, { shouldValidate: true, shouldTouch: true })}
                options={resourceTypeOptions}
                placeholder='Select resource type'
                searchPlaceholder='Search resource type...'
                emptyMessage='No type found.'
                disabled={disabled}
              />
              {(errors as any).resourceType && (
                <ErrorMessage message={(errors as any).resourceType.message as string} />
              )}
            </div>

            <div className='grid gap-2'>
              <FormLabel>Chapter Number</FormLabel>
              <Input
                value={chapterNumber ?? ""}
                onChange={(e) => setValue("chapterNumber", e.target.value, { shouldValidate: true, shouldTouch: true })}
                placeholder='e.g., 5'
                disabled={disabled}
              />
              {(errors as any).chapterNumber && (
                <ErrorMessage message={(errors as any).chapterNumber.message as string} />
              )}
            </div>

            <div className='grid gap-2'>
              <FormLabel>Chapter Name</FormLabel>
              <Input
                value={chapterName ?? ""}
                onChange={(e) => setValue("chapterName", e.target.value, { shouldValidate: true, shouldTouch: true })}
                placeholder='e.g., Trigonometric Functions'
                disabled={disabled}
              />
              {(errors as any).chapterName && <ErrorMessage message={(errors as any).chapterName.message as string} />}
            </div>
          </div>
        )}

        {isAcademic && (
          <div className='grid gap-2'>
            <FormLabel required>Files</FormLabel>
            <FileDropzone
              onDrop={onDrop}
              accept={ACCEPTED_MIME_TYPES as any}
              multiple={true}
              disabled={dropzoneDisabled}
              description='Drag and drop PDF files here, or click to browse'
              hint='Only PDF files are accepted'
            />
            {(errors as any).files && <ErrorMessage message={(errors as any).files.message as string} />}

            {files && files.length > 0 && (
              <ul className='mt-2 space-y-1'>
                {files.map((file, idx) => (
                  <li key={`${file.name}-${idx}`} className='text-xs'>
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Modal for custom subtopic */}
      <Dialog open={openModalIndex !== null} onOpenChange={(v) => !v && setOpenModalIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom subtopic</DialogTitle>
          </DialogHeader>
          <Input
            id={openModalIndex !== null ? `custom-subtopic-${openModalIndex}` : undefined}
            value={customSubtopic}
            onChange={(e) => setCustomSubtopic(e.target.value)}
            placeholder='Enter subtopic name'
          />
          <DialogFooter>
            <Button
              type='button'
              onClick={() => {
                if (openModalIndex === null) return;
                const next = items.slice();
                next[openModalIndex] = { ...next[openModalIndex], subtopic: customSubtopic.trim() };
                setValue("items", next as any, { shouldValidate: true });
                setCustomSubtopic("");
                setOpenModalIndex(null);
              }}
              disabled={!customSubtopic.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className='flex items-center gap-3 justify-end'>
        <Button type='submit' size='lg' disabled={submitDisabled} className='sm:min-w-44'>
          Submit
        </Button>

        {uploadState === "completed" && <span className='text-sm text-green-700'>Upload completed.</span>}
        {uploadState === "failed" && <span className='text-sm text-red-600'>Something went wrong. Please retry.</span>}
      </div>
    </form>
  );
}
