"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import QuestionCard from "@/components/evaluate/questionCard.component";
import {
  useAttemptDetailsQuery,
  useSubmitAnswerMutation,
  usePauseAttemptMutation,
} from "@/services/evaluate.services";
import { PauseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";

/**
 * In-Progress Evaluation Page
 *
 * Shows current question with interactive options.
 * No feedback is shown during evaluation (evaluation integrity).
 * Users can pause and resume across sessions.
 *
 * After answering, immediately loads next question.
 * On completion (60/60), redirects to results page.
 */
export default function EvaluateAttemptPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;

  const [timeSpent, setTimeSpent] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Fetch attempt details + next question
  const { data, isLoading, refetch } = useAttemptDetailsQuery(attemptId);

  const submitAnswerMutation = useSubmitAnswerMutation(attemptId);
  const pauseAttemptMutation = usePauseAttemptMutation(attemptId);

  // Track time spent on current question
  useEffect(() => {
    setStartTime(Date.now());
    setTimeSpent(0);

    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [data?.next_question?.id]);

  // Handle answer submission
  const handleSubmitAnswer = async (selectedIndex: number) => {
    if (!data?.next_question) return;

    try {
      const result = await submitAnswerMutation.mutateAsync({
        question_id: data.next_question.id,
        user_answer_index: selectedIndex,
        time_spent_seconds: Math.floor((Date.now() - startTime) / 1000),
      });

      // Show brief confirmation (no correctness feedback)
      toast.success("Answer recorded", { duration: 1000 });

      // Check if attempt is complete
      if (result.progress.is_complete) {
        // Redirect to results page
        router.push(`/evaluate/${attemptId}/results`);
      } else {
        // Refetch to get next question
        await refetch();
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast.error("Failed to submit answer. Please try again.");
    }
  };

  // Handle pause
  const handlePause = async () => {
    try {
      await pauseAttemptMutation.mutateAsync({});
      toast.success("Progress saved");
      router.push("/evaluate");
    } catch (error) {
      console.error("Failed to pause attempt:", error);
      toast.error("Failed to save progress");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="flex items-center justify-center">
          <div className="text-muted-foreground">Loading question...</div>
        </div>
      </div>
    );
  }

  if (!data || !data.attempt) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Attempt not found</p>
          <Button onClick={() => router.push("/evaluate")}>
            Return to Evaluate
          </Button>
        </div>
      </div>
    );
  }

  const { attempt, next_question } = data;

  // If no next question (shouldn't happen in in_progress state), show message
  if (!next_question) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            No more questions. Redirecting to results...
          </p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(
    (attempt.questions_answered / attempt.total_questions) * 100
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Progress bar and controls */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">
              Question {attempt.questions_answered + 1} / {attempt.total_questions}
            </h1>
            <div className="text-muted-foreground hidden text-sm md:block">
              {progressPercent}% complete
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={pauseAttemptMutation.isPending}
            className="gap-2"
          >
            <PauseIcon weight="fill" className="h-4 w-4" />
            <span className="hidden sm:inline">Pause & Save</span>
          </Button>
        </div>

        {/* Progress bar */}
        <div className="bg-secondary h-2 w-full overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Mobile progress percentage */}
        <div className="text-muted-foreground mt-2 text-sm md:hidden">
          {progressPercent}% complete
        </div>
      </div>

      {/* Question card */}
      <QuestionCard
        question={next_question.question}
        options={next_question.options}
        code={next_question.code}
        metadata={next_question.metadata}
        mode="evaluation"
        onSubmit={handleSubmitAnswer}
        isSubmitting={submitAnswerMutation.isPending}
      />

      {/* Info box: no feedback during evaluation */}
      <div className="bg-muted/30 mt-6 rounded-lg border border-dashed p-4 text-center">
        <p className="text-muted-foreground text-sm">
          <span className="font-medium">Note:</span> Your answers are being saved,
          but you won't see if they're correct or incorrect until you complete all{" "}
          {attempt.total_questions} questions. This maintains authentic evaluation
          conditions.
        </p>
      </div>

      {/* Session timeout warning (if needed in future) */}
      {timeSpent > 1800 && (
        <div className="bg-amber-50 dark:bg-amber-950/20 mt-4 rounded-lg border border-amber-200 p-4 text-center dark:border-amber-800">
          <p className="text-amber-900 dark:text-amber-200 text-sm">
            You've been on this question for {Math.floor(timeSpent / 60)} minutes.
            Take your time, or use "Pause & Save" if you need a break.
          </p>
        </div>
      )}
    </div>
  );
}
