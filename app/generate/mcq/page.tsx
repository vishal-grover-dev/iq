"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import McqCard from "@/components/generate/mcqCard.component";
import PersonaPanel from "@/components/generate/personaPanel.component";
import RevisionBox from "@/components/generate/revisionBox.component";
import AutomationModal from "@/components/generate/automationModal.component";
import { EBloomLevel } from "@/types/mcq.types";
import { EDifficulty, IMcqItemView } from "@/types/mcq.types";
import { openMcqSse, useMcqMutations } from "@/services/mcq.services";
import { toast } from "sonner";

export default function McqGenerationPage() {
  const [personaStatus, setPersonaStatus] = useState<{ generation?: string; judge?: string; finalized?: string }>({});
  const [openAutomation, setOpenAutomation] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState<
    Array<{ instruction: string; timestamp: Date; changes: string }>
  >([]);
  const sseRef = useRef<EventSource | null>(null);
  const { generate: generateMutation, save: saveMutation, revise: reviseMutation } = useMcqMutations();

  const handleRevise = (instruction: string) => {
    if (reviseMutation.isPending) return;

    reviseMutation.mutate(
      { instruction, currentMcq: current },
      {
        onSuccess: (data) => {
          if (data?.ok && data?.item) {
            setCurrent(data.item);
            setRevisionHistory((prev) => [
              ...prev,
              {
                instruction,
                timestamp: new Date(),
                changes: data.changes || `Applied revision: "${instruction}"`,
              },
            ]);
            toast.success("Question revised successfully");
          } else {
            toast.error("Failed to revise question");
          }
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to revise question");
        },
      }
    );
  };
  const sample = useMemo<IMcqItemView>(
    () => ({
      topic: "React",
      subtopic: "Hooks/useEffect",
      version: "18",
      difficulty: EDifficulty.MEDIUM,
      bloomLevel: EBloomLevel.UNDERSTAND,
      question: "What is the primary purpose of useEffect in React?",
      options: [
        "To create component state",
        "To perform side effects after render",
        "To memoize expensive computations",
        "To render lists with keys",
      ],
      correctIndex: 1,
      citations: [{ title: "React Docs — useEffect", url: "https://react.dev/reference/react/useEffect" }],
    }),
    []
  );
  const [current, setCurrent] = useState<IMcqItemView>(sample);
  const [codingMode, setCodingMode] = useState(false);

  useEffect(() => {
    return () => {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, []);

  function handleStartAutomation() {
    // Reset statuses and start SSE only when explicitly requested
    setPersonaStatus({});
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    const es = openMcqSse();
    sseRef.current = es;
    es.addEventListener("generation_started", () => setPersonaStatus((s) => ({ ...s, generation: "started" })));
    es.addEventListener("generation_complete", () => setPersonaStatus((s) => ({ ...s, generation: "complete" })));
    es.addEventListener("judge_started", () => setPersonaStatus((s) => ({ ...s, judge: "started" })));
    es.addEventListener("judge_result", () => setPersonaStatus((s) => ({ ...s, judge: "approve" })));
    es.addEventListener("finalized", () => {
      setPersonaStatus((s) => ({ ...s, finalized: "ready" }));
      es.close();
      sseRef.current = null;
    });
    setOpenAutomation(false);
  }

  const handleSubmit = () => {
    saveMutation.mutate(
      { item: current },
      {
        onSuccess: () => {
          toast.success("Saved question");
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to save");
        },
      }
    );
  };

  const handleSubmitAndNext = () => {
    if (generateMutation.isPending || saveMutation.isPending) return;

    // First save, then generate next
    saveMutation.mutate(
      { item: current },
      {
        onSuccess: () => {
          toast.success("Saved question");
          handleNext();
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to save");
        },
      }
    );
  };

  const handleNext = () => {
    if (generateMutation.isPending || saveMutation.isPending) return;

    setPersonaStatus((s) => s);
    // Do not pass subtopic so backend can diversify across React subtopics
    generateMutation.mutate(
      { topic: current.topic, codingMode },
      {
        onSuccess: (data) => {
          if (data?.ok && data?.item) {
            setCurrent(data.item);
            setPersonaStatus({});
            toast.success("Loaded next question");
          } else {
            toast.message("Generated next (placeholder)");
          }
        },
        onError: (error: any) => {
          toast.error(error?.message || "Failed to generate next");
        },
      }
    );
  };

  return (
    <div className='mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-3'>
      <div className='md:col-span-2'>
        <McqCard item={current} />
        <div className='mt-4'>
          <RevisionBox onRevise={handleRevise} isLoading={reviseMutation.isPending} />
        </div>
        {revisionHistory.length > 0 && (
          <div className='mt-4 rounded-lg border bg-white p-3 dark:border-gray-800 dark:bg-gray-950'>
            <h3 className='mb-2 font-semibold text-sm'>Revision History</h3>
            <div className='space-y-2 max-h-40 overflow-y-auto'>
              {revisionHistory
                .slice(-5)
                .reverse()
                .map((revision, index) => (
                  <div key={index} className='text-xs border-l-2 border-blue-300 pl-2'>
                    <div className='font-medium text-gray-700 dark:text-gray-300'>{revision.instruction}</div>
                    <div className='text-gray-500 dark:text-gray-400'>
                      {revision.timestamp.toLocaleTimeString()} - {revision.changes}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className='mt-3 flex items-center justify-end gap-2'>
          <label className='mr-auto flex items-center gap-2 text-sm'>
            <input type='checkbox' checked={codingMode} onChange={(e) => setCodingMode(e.target.checked)} />
            Coding questions
          </label>
          <Button
            variant='secondary'
            onClick={handleNext}
            disabled={generateMutation.isPending || saveMutation.isPending}
            aria-label='Generate next question'
          >
            {generateMutation.isPending ? "Generating..." : "Next"}
          </Button>
          <Button
            onClick={handleSubmitAndNext}
            disabled={generateMutation.isPending || saveMutation.isPending}
            aria-label='Submit question and generate next'
          >
            {saveMutation.isPending ? "Saving..." : generateMutation.isPending ? "Generating..." : "Submit and Next"}
          </Button>
        </div>
      </div>
      <div className='md:col-span-1'>
        <PersonaPanel status={personaStatus} />
        <div className='mt-3 flex justify-end'>
          <Button variant='secondary' size='sm' onClick={() => setOpenAutomation(true)}>
            Automate generation
          </Button>
        </div>
      </div>
      <AutomationModal open={openAutomation} onOpenChange={setOpenAutomation} onStart={handleStartAutomation} />
    </div>
  );
}
