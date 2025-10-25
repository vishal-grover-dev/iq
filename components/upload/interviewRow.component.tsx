"use client";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  EInterviewTopic,
  EInterviewIngestType,
  type IInterviewIngestItem,
  type IInterviewStreamsFormValues,
} from "@/types/upload.types";
import {
  INTERVIEW_SUBTOPICS,
  INTERVIEW_TOPIC_OPTIONS,
  INTERVIEW_INGEST_TYPE_OPTIONS,
} from "@/constants/interview-streams.constants";
import { FormLabel } from "@/components/ui/form-label";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { type UseFormSetValue } from "react-hook-form";

interface IInterviewRowProps {
  row: IInterviewIngestItem;
  rowIndex: number;
  items: IInterviewIngestItem[];
  disabled?: boolean;
  setValue: UseFormSetValue<IInterviewStreamsFormValues>;
  onOpenSubtopicModal: (index: number) => void;
}

export default function InterviewRow({
  row,
  rowIndex,
  items,
  disabled,
  setValue,
  onOpenSubtopicModal,
}: IInterviewRowProps) {
  const predefined = INTERVIEW_SUBTOPICS[row.topic as EInterviewTopic].map((s) => ({ label: s, value: s }));
  const hasCustom = !!(row.subtopic && row.subtopic.trim() && !predefined.some((o) => o.value === row.subtopic));
  const subtopicOptions: ComboboxOption<string>[] = [
    { label: "ALL", value: "" },
    ...(hasCustom && row.subtopic ? [{ label: row.subtopic, value: row.subtopic }] : []),
    ...predefined,
    { label: "Other", value: "__other__" },
  ];

  const depthOptions: ComboboxOption<string>[] = [
    { label: "0", value: "0" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
  ];

  return (
    <div className='grid gap-3 sm:grid-cols-12 sm:items-end'>
      <div className='grid gap-1 sm:col-span-2'>
        <FormLabel required>Topic</FormLabel>
        <Combobox
          value={row.topic}
          onChange={(val) => {
            const next = items.slice();
            next[rowIndex] = {
              ...row,
              topic: val as EInterviewTopic,
              subtopic: INTERVIEW_SUBTOPICS[val as EInterviewTopic][0] ?? "",
            };
            setValue("items", next, { shouldValidate: true });
          }}
          options={INTERVIEW_TOPIC_OPTIONS}
          placeholder='Select topic'
          disabled={disabled}
        />
      </div>

      <div className='grid gap-1 sm:col-span-2'>
        <FormLabel>Subtopic</FormLabel>
        <Combobox
          value={row.subtopic ?? ""}
          onChange={(val) => {
            if (val === "__other__") {
              onOpenSubtopicModal(rowIndex);
              return;
            }
            const next = items.slice();
            next[rowIndex] = { ...row, subtopic: val || "" };
            setValue("items", next, { shouldValidate: true });
          }}
          options={subtopicOptions}
          placeholder='ALL'
          disabled={disabled}
        />
      </div>

      <div className='grid gap-1 sm:col-span-3'>
        <FormLabel required>Ingest Type</FormLabel>
        <Combobox
          value={row.ingestType}
          onChange={(val) => {
            const next = items.slice();
            next[rowIndex] = { ...row, ingestType: val as EInterviewIngestType };
            setValue("items", next, { shouldValidate: true });
          }}
          options={INTERVIEW_INGEST_TYPE_OPTIONS}
          placeholder='Select ingest type'
          disabled={disabled}
          triggerClassName='w/full justify-between overflow-hidden text-ellipsis whitespace-nowrap'
        />
      </div>

      {row.ingestType === EInterviewIngestType.WEB && (
        <div className='grid gap-1 sm:col-span-1'>
          <FormLabel required>Depth</FormLabel>
          <Combobox
            value={String(row.depth ?? 2)}
            onChange={(val) => {
              const next = items.slice();
              next[rowIndex] = { ...row, depth: Number(val) as 0 | 1 | 2 | 3 | 4 };
              setValue("items", next, { shouldValidate: true });
            }}
            options={depthOptions}
            placeholder='2'
            disabled={disabled}
          />
        </div>
      )}

      <div className='grid gap-1 min-w-0 sm:col-span-3'>
        <FormLabel required>URL</FormLabel>
        <Input
          value={row.url}
          onChange={(e) => {
            const next = items.slice();
            next[rowIndex] = { ...row, url: e.target.value };
            setValue("items", next, { shouldValidate: true });
          }}
          type='url'
          inputMode='url'
          placeholder={
            row.ingestType === EInterviewIngestType.REPO
              ? "https://github.com/owner/repo"
              : "https://developer.mozilla.org/"
          }
          title={
            row.ingestType === EInterviewIngestType.REPO
              ? "Enter a public GitHub docs repository URL"
              : "Enter a website seed URL to crawl within the same domain"
          }
          aria-label='Source URL'
          className='w-full'
          disabled={disabled}
        />
      </div>

      <div className='flex justify-end sm:col-span-1'>
        <div className='flex items-center gap-2'>
          {rowIndex === 0 ? (
            <Button
              type='button'
              variant='secondary'
              onClick={() =>
                setValue(
                  "items",
                  [
                    ...items,
                    {
                      topic: items[items.length - 1]?.topic ?? EInterviewTopic.REACT,
                      subtopic: "",
                      ingestType: items[items.length - 1]?.ingestType ?? EInterviewIngestType.REPO,
                      url: "",
                    },
                  ],
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
                const next = items.filter((_, i) => i !== rowIndex);
                setValue("items", next, { shouldValidate: true });
              }}
              title='Delete row'
              aria-label='Delete row'
            >
              <TrashIcon size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
