"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import McqCard from "@/components/generate/mcqCard.component";
import PersonaPanel from "@/components/generate/personaPanel.component";
import RevisionBox from "@/components/generate/revisionBox.component";
import AutomationModal from "@/components/generate/automationModal.component";
import { EBloomLevel } from "@/types/mcq.types";
import { EDifficulty, IMcqItemView } from "@/types/mcq.types";
import { openMcqSse, postGenerateMcq, postSaveMcq } from "@/services/mcq.services";
import { toast } from "sonner";

export default function McqGenerationPage() {
  const [personaStatus, setPersonaStatus] = useState<{ generation?: string; judge?: string; finalized?: string }>({});
  const [openAutomation, setOpenAutomation] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
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

  async function handleSubmit() {
    try {
      await postSaveMcq({ item: current });
      toast.success("Saved question");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    }
  }

  async function handleNext() {
    try {
      const res = await postGenerateMcq({ topic: current.topic, subtopic: current.subtopic });
      toast.message(res?.message ?? "Generated next (placeholder)");
      // Placeholder: keep same item until real generation is wired.
      setPersonaStatus({});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to generate next");
    }
  }

  return (
    <div className='mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-6 md:grid-cols-3'>
      <div className='md:col-span-2'>
        <McqCard item={current} />
        <div className='mt-4'>
          <RevisionBox />
        </div>
        <div className='mt-3 flex items-center justify-end gap-2'>
          <Button variant='secondary' onClick={handleNext} aria-label='Generate next question'>
            Next
          </Button>
          <Button onClick={handleSubmit} aria-label='Submit question'>
            Submit
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
