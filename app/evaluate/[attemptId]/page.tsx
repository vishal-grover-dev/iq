"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import QuestionCard from "@/components/evaluate/questionCard.component";
import QuestionCardSkeleton from "@/components/evaluate/questionCardSkeleton.component";
import {
  useAttemptDetailsQuery,
  useSubmitAnswerMutation,
  usePauseAttemptMutation,
} from "@/services/client/evaluate.services";
import { PauseIcon } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  usePrefersReducedMotion,
  questionTransitionVariants,
  questionTransition,
  EAnimationDuration,
  ANIMATION_EASING,
} from "@/utils/animation.utils";

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
  const [showDelayedMessage, setShowDelayedMessage] = useState(false);

  // Detect reduced motion preference for animations
  const prefersReducedMotion = usePrefersReducedMotion();

  // Fetch attempt details + next question
  const { data, isLoading, isFetching } = useAttemptDetailsQuery(attemptId);

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
  }, [data?.next_question?.id, startTime]);

  // Show delayed loading message if loading takes >500ms (Task 6: Loading States)
  const isCurrentlyLoading = isLoading || (isFetching && !data) || submitAnswerMutation.isPending;
  useEffect(() => {
    if (!isCurrentlyLoading) {
      setShowDelayedMessage(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowDelayedMessage(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [isCurrentlyLoading]);

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
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      toast.error("Failed to submit answer. Please try again.");
    }
  };

  // Handle pause
  const handlePause = async () => {
    try {
      await pauseAttemptMutation.mutateAsync();
      toast.success("Progress saved");
      router.push("/evaluate");
    } catch (error) {
      console.error("Failed to pause attempt:", error);
      toast.error("Failed to save progress");
    }
  };

  // Show loading skeleton when initially loading
  if (isLoading || (isFetching && !data)) {
    return <QuestionCardSkeleton showProgressBar={true} showDelayedMessage={showDelayedMessage} />;
  }

  if (!data || !data.attempt) {
    return (
      <div className='mx-auto w-full max-w-4xl px-4 py-16'>
        <div className='text-center'>
          <p className='text-muted-foreground mb-4'>Attempt not found</p>
          <Button onClick={() => router.push("/evaluate")}>Return to Evaluate</Button>
        </div>
      </div>
    );
  }

  const { attempt, next_question } = data;

  // If no next question, check if we're currently fetching or if attempt is complete
  if (!next_question) {
    // If we're fetching or submitting, show loading instead of "no questions" message
    if (isFetching || submitAnswerMutation.isPending) {
      return <QuestionCardSkeleton showProgressBar={true} showDelayedMessage={showDelayedMessage} />;
    }

    // If not fetching and no question, show the "no questions" message
    return (
      <div className='mx-auto w-full max-w-4xl px-4 py-16'>
        <div className='text-center'>
          <p className='text-muted-foreground mb-4'>No more questions. Redirecting to results...</p>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((attempt.questions_answered / attempt.total_questions) * 100);

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-6'>
      {/* Progress bar and controls */}
      <div className='mb-6'>
        <div className='mb-3 flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <h1 className='text-lg font-semibold' data-testid='progress-indicator'>
              Question{" "}
              <AnimatePresence mode='wait'>
                <motion.span
                  key={attempt.questions_answered}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    duration: prefersReducedMotion ? 0.05 : EAnimationDuration.FAST,
                    ease: ANIMATION_EASING.easeInOut,
                  }}
                  style={{ display: "inline-block" }}
                >
                  {attempt.questions_answered + 1}
                </motion.span>
              </AnimatePresence>{" "}
              / {attempt.total_questions}
            </h1>
            <div className='text-muted-foreground hidden text-sm md:block'>{progressPercent}% complete</div>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handlePause}
            disabled={pauseAttemptMutation.isPending}
            className='gap-2'
          >
            <PauseIcon weight='fill' className='h-4 w-4' />
            <span className='hidden sm:inline'>Pause & Save</span>
          </Button>
        </div>

        {/* Progress bar with smooth animation */}
        <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
          <motion.div
            className='bg-primary h-full'
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: ANIMATION_EASING.easeOut,
            }}
          />
        </div>

        {/* Mobile progress percentage */}
        <div className='text-muted-foreground mt-2 text-sm md:hidden'>{progressPercent}% complete</div>
      </div>

      {/* Question card with smooth transition animations */}
      <AnimatePresence mode='wait'>
        <motion.div
          key={next_question.id}
          custom={prefersReducedMotion}
          variants={questionTransitionVariants}
          initial='enter'
          animate='center'
          exit='exit'
          transition={questionTransition(prefersReducedMotion)}
        >
          <QuestionCard
            question={next_question.question}
            options={next_question.options}
            code={next_question.code}
            metadata={next_question.metadata}
            mode='evaluation'
            onSubmit={handleSubmitAnswer}
            isSubmitting={submitAnswerMutation.isPending}
          />
        </motion.div>
      </AnimatePresence>

      {/* Info box: no feedback during evaluation */}
      <div className='bg-muted/30 mt-6 rounded-lg border border-dashed p-4 text-center'>
        <p className='text-muted-foreground text-sm'>
          <span className='font-medium'>Note:</span> Your answers are being saved, but you won&apos;t see if
          they&apos;re correct or incorrect until you complete all {attempt.total_questions} questions. This maintains
          authentic evaluation conditions.
        </p>
      </div>

      {/* Session timeout warning (if needed in future) */}
      {timeSpent > 1800 && (
        <div className='bg-amber-50 dark:bg-amber-950/20 mt-4 rounded-lg border border-amber-200 p-4 text-center dark:border-amber-800'>
          <p className='text-amber-900 dark:text-amber-200 text-sm'>
            You&apos;ve been on this question for {Math.floor(timeSpent / 60)} minutes. Take your time, or use
            &quot;Pause &amp; Save&quot; if you need a break.
          </p>
        </div>
      )}
    </div>
  );
}
