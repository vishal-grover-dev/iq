"use client";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { EInterviewTopic, EInterviewIngestType, type IInterviewIngestItem } from "@/types/upload.types";
import {
  INTERVIEW_SUBTOPICS,
  INTERVIEW_TOPIC_OPTIONS,
  INTERVIEW_INGEST_TYPE_OPTIONS,
} from "@/constants/interview-streams.constants";
import { FormLabel } from "@/components/ui/form-label";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";

interface IInterviewRowProps {
  row: IInterviewIngestItem;
  rowIndex: number;
  items: IInterviewIngestItem[];
  disabled?: boolean;
  setValue: (
    name:
      | "contentCategory"
      | "stream"
      | "items"
      | `items.${number}`
      | `items.${number}.topic`
      | `items.${number}.subtopic`
      | `items.${number}.ingestType`
      | `items.${number}.url`,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldTouch?: boolean }
  ) => void;
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
  const subtopicOptions = [
    { label: "ALL", value: "" },
    ...(hasCustom ? [{ label: row.subtopic, value: row.subtopic }] : []),
    ...predefined,
    { label: "Other", value: "__other__" },
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
            } as any;
            setValue("items", next as any, { shouldValidate: true });
          }}
          options={INTERVIEW_TOPIC_OPTIONS as any}
          placeholder='Select topic'
          disabled={disabled}
        />
      </div>

      <div className='grid gap-1 sm:col-span-2'>
        <FormLabel>Subtopic</FormLabel>
        <Combobox
          value={(row.subtopic ?? "") as any}
          onChange={(val) => {
            if (val === "__other__") {
              onOpenSubtopicModal(rowIndex);
              return;
            }
            const next = items.slice();
            next[rowIndex] = { ...row, subtopic: (val as string) || undefined } as any;
            setValue("items", next as any, { shouldValidate: true });
          }}
          options={subtopicOptions as any}
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
            next[rowIndex] = { ...row, ingestType: val as EInterviewIngestType } as any;
            setValue("items", next as any, { shouldValidate: true });
          }}
          options={INTERVIEW_INGEST_TYPE_OPTIONS as any}
          placeholder='Select ingest type'
          disabled={disabled}
          triggerClassName='w/full justify-between overflow-hidden text-ellipsis whitespace-nowrap'
        />
      </div>

      {row.ingestType === EInterviewIngestType.WEB && (
        <div className='grid gap-1 sm:col-span-1'>
          <FormLabel required>Depth</FormLabel>
          <Combobox
            value={(row.depth ?? 2) as any}
            onChange={(val) => {
              const next = items.slice();
              next[rowIndex] = { ...row, depth: Number(val) as 0 | 1 | 2 | 3 | 4 } as any;
              setValue("items", next as any, { shouldValidate: true });
            }}
            options={
              [
                { label: "0", value: 0 },
                { label: "1", value: 1 },
                { label: "2", value: 2 },
                { label: "3", value: 3 },
                { label: "4", value: 4 },
              ] as any
            }
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
            next[rowIndex] = { ...row, url: e.target.value } as any;
            setValue("items", next as any, { shouldValidate: true });
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
                      ingestType: (items[items.length - 1]?.ingestType ?? EInterviewIngestType.REPO) as any,
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
                const next = items.filter((_, i) => i !== rowIndex);
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
    </div>
  );
}
