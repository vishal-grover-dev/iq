"use client";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { EInterviewStream, type IInterviewIngestItem } from "@/types/upload.types";
import { INTERVIEW_TOPIC_OPTIONS } from "@/constants/interview-streams.constants";
import { FormLabel } from "@/components/ui/form-label";
import InterviewRow from "./interviewRow.component";
import { PlanModal, CustomSubtopicModal } from "./interviewModals.component";
import { useInterviewPlanner } from "@/hooks/useInterviewPlanner.hook";

interface IInterviewSectionProps {
  items: IInterviewIngestItem[];
  stream?: EInterviewStream;
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
}

export default function InterviewSection({ items, stream, disabled, setValue }: IInterviewSectionProps) {
  const {
    planOpen,
    setPlanOpen,
    planLoading,
    planData,
    webPlanData,
    openModalIndex,
    setOpenModalIndex,
    customSubtopic,
    setCustomSubtopic,
    handlePlan,
    handleResume,
    handleRetry,
    handleReport,
  } = useInterviewPlanner(items);

  return (
    <div className='rounded-lg border p-4 shadow-sm bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40'>
      <div className='flex items-center justify-between mb-2'>
        <div className='grid gap-2 sm:max-w-sm'>
          <FormLabel>Interview Streams</FormLabel>
          <Combobox
            value={stream as any}
            onChange={(val) => setValue("stream", val as any, { shouldValidate: true })}
            options={[{ label: EInterviewStream.FRONTEND_REACT, value: EInterviewStream.FRONTEND_REACT }] as any}
            placeholder='Select stream'
            disabled={disabled}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' onClick={handlePlan} disabled={disabled || planLoading}>
            {planLoading ? "Planning…" : "Plan"}
          </Button>
        </div>
      </div>

      <div className='grid gap-3'>
        {items.map((row, idx) => (
          <InterviewRow
            key={idx}
            row={row}
            rowIndex={idx}
            items={items}
            disabled={disabled}
            setValue={setValue}
            onOpenSubtopicModal={setOpenModalIndex}
          />
        ))}
      </div>

      <PlanModal
        isOpen={planOpen}
        planData={planData}
        webPlanData={webPlanData}
        onClose={() => setPlanOpen(false)}
        onResume={handleResume}
        onRetry={handleRetry}
        onReport={handleReport}
      />

      <CustomSubtopicModal
        isOpen={openModalIndex !== null}
        value={customSubtopic}
        onClose={() => setOpenModalIndex(null)}
        onChange={setCustomSubtopic}
        onSave={() => {
          if (openModalIndex === null) return;
          const next = items.slice();
          next[openModalIndex] = { ...next[openModalIndex], subtopic: customSubtopic.trim() } as any;
          setValue("items", next as any, { shouldValidate: true });
          setCustomSubtopic("");
          setOpenModalIndex(null);
        }}
      />
    </div>
  );
}
