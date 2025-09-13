"use client";
import FileDropzone from "@/components/ui/file-dropzone";
import { Combobox } from "@/components/ui/combobox";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormLabel } from "@/components/ui/form-label";
import { Input } from "@/components/ui/input";
import {
  EAcademicResourceType as AcademicResourceType,
  EAcademicClass as AcademicClass,
  EAcademicSubject as AcademicSubject,
  EEducationBoard as EducationBoard,
} from "@/types/upload.types";
import { useMemo } from "react";

const ACCEPTED_MIME_TYPES = { "application/pdf": [".pdf"] } as const;

type TAcademicSectionProps = {
  disabled: boolean;
  errors: any;
  watch: any;
  setValue: (name: string, value: unknown, options?: { shouldValidate?: boolean; shouldTouch?: boolean }) => void;
  onDrop: (files: File[]) => Promise<void>;
};

export default function AcademicSection({ disabled, errors, watch, setValue, onDrop }: TAcademicSectionProps) {
  const resourceType = (watch as any)("resourceType") as AcademicResourceType | undefined;
  const grade = (watch as any)("grade") as AcademicClass | undefined;
  const subject = (watch as any)("subject") as AcademicSubject | undefined;
  const chapterNumber = (watch as any)("chapterNumber") as string | undefined;
  const chapterName = (watch as any)("chapterName") as string | undefined;
  const files = (watch as any)("files") as File[] | undefined;

  const resourceTypeOptions = [
    { label: AcademicResourceType.TEXTBOOK, value: AcademicResourceType.TEXTBOOK },
    { label: AcademicResourceType.PREVIOUS_YEAR_PAPER, value: AcademicResourceType.PREVIOUS_YEAR_PAPER },
  ];
  const classOptions = (Object.values(AcademicClass) as string[]).map((v) => ({ label: v, value: v }));
  const subjectOptions = (Object.values(AcademicSubject) as string[]).map((v) => ({ label: v, value: v }));
  const boardOptions = (Object.values(EducationBoard) as string[])
    .map((v) => ({ label: v, value: v }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const dropzoneDisabled = useMemo(() => {
    const isAcademicRequiredFieldsFilled =
      Boolean((watch as any)("board")) && Boolean(grade) && Boolean(subject) && Boolean(resourceType);
    return disabled || !isAcademicRequiredFieldsFilled;
  }, [disabled, watch, grade, subject, resourceType]);

  return (
    <>
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
          {(errors as any).resourceType && <ErrorMessage message={(errors as any).resourceType.message as string} />}
        </div>

        <div className='grid gap-2'>
          <FormLabel>Chapter Number</FormLabel>
          <Input
            value={chapterNumber ?? ""}
            onChange={(e) => setValue("chapterNumber", e.target.value, { shouldValidate: true, shouldTouch: true })}
            placeholder='e.g., 5'
            disabled={disabled}
          />
          {(errors as any).chapterNumber && <ErrorMessage message={(errors as any).chapterNumber.message as string} />}
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

      <div className='grid gap-2 mt-4'>
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
    </>
  );
}
