"use client";
import FileDropzone from "@/components/ui/file-dropzone";
import Loader from "@/components/common/loader.component";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormLabel } from "@/components/ui/form-label";
import { FormSchema, formSchema } from "@/schema/upload.schema";
import { Input } from "@/components/ui/input";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AcademicResourceType,
  ContentCategory,
  AcademicClass,
  AcademicSubject,
  EducationBoard,
  type AcademicUploadFormValues,
  type UploadState,
} from "@/types/upload.types";
import { uploadAcademicFiles } from "@/services/upload.services";

const ACCEPTED_MIME_TYPES = { "application/pdf": [".pdf"] } as const;

export default function UploadForm() {
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [isUploadingFiles, setIsUploadingFiles] = useState<boolean>(false);
  const [hasUploadFailed, setHasUploadFailed] = useState<boolean>(false);

  const defaultValues: AcademicUploadFormValues = {
    contentCategory: ContentCategory.ACADEMIC,
    board: undefined,
    grade: undefined,
    subject: undefined,
    resourceType: undefined,
    chapterNumber: undefined,
    chapterName: undefined,
    files: [],
  };

  const {
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues as unknown as FormSchema,
    mode: "onBlur",
  });

  const contentCategory = watch("contentCategory");
  const files = watch("files");
  const resourceType = (watch as any)("resourceType") as AcademicResourceType | undefined;
  const grade = (watch as any)("grade") as AcademicClass | undefined;
  const subject = (watch as any)("subject") as AcademicSubject | undefined;
  const chapterNumber = (watch as any)("chapterNumber") as string | undefined;
  const chapterName = (watch as any)("chapterName") as string | undefined;

  const contentCategoryOptions = [
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
        await uploadAcademicFiles(
          {
            contentCategory: ContentCategory.ACADEMIC,
            board: (watch as any)("board"),
            grade: grade!,
            subject: subject!,
            resourceType: resourceType!,
            chapterNumber,
            chapterName,
          },
          acceptedFiles
        );
        toast.success("Files uploaded to storage");
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
      if (val !== ContentCategory.ACADEMIC) {
        toast.error("Coming soon", {
          description:
            val === ContentCategory.COMPETITIVE_EXAM
              ? "Heads up: Competitive Exam is still an Aspirant, not yet ready!"
              : "Lights, camera… almost: Subtitles support arriving shortly.",
        });
      }
    },
    [setValue]
  );

  const onSubmit = async (data: FormSchema) => {
    try {
      // Immediately enter processing state; mock progress UI will manage 5-minute interval
      setUploadState("processing");
    } catch (e) {
      setUploadState("failed");
    }
  };

  const disabled = uploadState === "submitting" || uploadState === "processing" || isUploadingFiles;
  const dropzoneDisabled =
    disabled || (contentCategory as any) !== ContentCategory.ACADEMIC || !isAcademicRequiredFieldsFilled;
  const submitDisabled =
    disabled ||
    hasUploadFailed ||
    !isAcademicRequiredFieldsFilled ||
    !files ||
    (files as any).length === 0 ||
    !isAcademic;

  if (uploadState === "processing") {
    return <Loader />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      <div className='grid gap-4'>
        <div className='grid gap-2'>
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
          {errors.files && <ErrorMessage message={errors.files.message as string} />}

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
      </div>

      <div className='flex items-center gap-3'>
        <Button type='submit' size='lg' disabled={submitDisabled} className='w-full'>
          Submit
        </Button>

        {uploadState === "completed" && <span className='text-sm text-green-700'>Upload completed.</span>}
        {uploadState === "failed" && <span className='text-sm text-red-600'>Something went wrong. Please retry.</span>}
      </div>
    </form>
  );
}
