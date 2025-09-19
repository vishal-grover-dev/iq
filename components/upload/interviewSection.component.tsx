"use client";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EInterviewStream as InterviewStream,
  EInterviewTopic as InterviewTopic,
  EInterviewIngestType as InterviewIngestType,
} from "@/types/upload.types";
import {
  INTERVIEW_SUBTOPICS,
  INTERVIEW_TOPIC_OPTIONS,
  INTERVIEW_INGEST_TYPE_OPTIONS,
} from "@/constants/interview-streams.constants";
import { FormLabel } from "@/components/ui/form-label";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";

type TInterviewSectionProps = {
  items: Array<{ topic: InterviewTopic; subtopic: string; ingestType: InterviewIngestType; url: string }>;
  stream?: InterviewStream;
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
};

export default function InterviewSection({ items, stream, disabled, setValue }: TInterviewSectionProps) {
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
  const [customSubtopic, setCustomSubtopic] = useState<string>("");

  return (
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
              { label: "ALL", value: "" },
              ...INTERVIEW_SUBTOPICS[row.topic as InterviewTopic].map((s) => ({ label: s, value: s })),
              { label: "Other", value: "__other__" },
            ];
            return (
              <div key={idx} className='grid gap-3 sm:grid-cols-12 sm:items-end'>
                <div className='grid gap-1 sm:col-span-2'>
                  <FormLabel required>Topic</FormLabel>
                  <Combobox
                    value={row.topic}
                    onChange={(val) => {
                      const next = items.slice();
                      next[idx] = {
                        ...row,
                        topic: val as InterviewTopic,
                        subtopic: INTERVIEW_SUBTOPICS[val as InterviewTopic][0] ?? "",
                      } as any;
                      setValue("items", next as any, { shouldValidate: true });
                    }}
                    options={INTERVIEW_TOPIC_OPTIONS as any}
                    placeholder='Select topic'
                    disabled={disabled}
                  />
                </div>

                <div className='grid gap-1 sm:col-span-3'>
                  <FormLabel>Subtopic</FormLabel>
                  <Combobox
                    value={(row.subtopic ?? "") as any}
                    onChange={(val) => {
                      if (val === "__other__") {
                        (document.getElementById(`custom-subtopic-${idx}`) as HTMLInputElement)?.focus();
                        setOpenModalIndex(idx);
                        return;
                      }
                      const next = items.slice();
                      next[idx] = { ...row, subtopic: (val as string) || undefined } as any;
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
                      next[idx] = { ...row, ingestType: val as InterviewIngestType } as any;
                      setValue("items", next as any, { shouldValidate: true });
                    }}
                    options={INTERVIEW_INGEST_TYPE_OPTIONS as any}
                    placeholder='Select ingest type'
                    disabled={disabled}
                    triggerClassName='w-full justify-between overflow-hidden text-ellipsis whitespace-nowrap'
                  />
                </div>

                <div className='grid gap-1 min-w-0 sm:col-span-3'>
                  <FormLabel required>URL</FormLabel>
                  <Input
                    value={row.url}
                    onChange={(e) => {
                      const next = items.slice();
                      next[idx] = { ...row, url: e.target.value } as any;
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

                <div className='flex justify-end sm:col-span-1'>
                  <div className='flex items-center gap-2'>
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
                                subtopic: "",
                                ingestType: (items[items.length - 1]?.ingestType ?? InterviewIngestType.REPO) as any,
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
              </div>
            );
          })}
        </div>
      </div>

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
                next[openModalIndex] = { ...next[openModalIndex], subtopic: customSubtopic.trim() } as any;
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
    </div>
  );
}
