"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAttemptsQuery, useCreateAttemptMutation } from "@/services/evaluate.services";
import { PlayIcon, ArrowRightIcon, ClockIcon } from "@phosphor-icons/react";
import { EEvaluatePageLabels, EQuestionCardLabels } from "@/types/evaluate.types";
import { EVALUATION_CONFIG } from "@/constants/evaluate.constants";

/**
 * Evaluate Landing Page
 *
 * Entry point for the evaluation feature:
 * - Shows resume prompt if user has in-progress attempt
 * - Shows start new evaluation button with past attempts summary
 * - Later: first-time user onboarding modal
 */
export default function EvaluatePage() {
  const router = useRouter();

  // Fetch user's attempts (in-progress first, then completed)
  const { data: attemptsData, isLoading } = useAttemptsQuery();

  const createAttemptMutation = useCreateAttemptMutation();

  // Find in-progress attempt if any
  const inProgressAttempt = attemptsData?.attempts?.find((a) => a.status === "in_progress");

  // Get completed attempts for summary
  const completedAttempts = attemptsData?.attempts?.filter((a) => a.status === "completed") || [];

  const handleStartNewAttempt = async () => {
    try {
      const newAttempt = await createAttemptMutation.mutateAsync();
      router.push(`/evaluate/${newAttempt.attempt_id}`);
    } catch (error) {
      console.error("Failed to create attempt:", error);
    }
  };

  const handleResumeAttempt = () => {
    if (inProgressAttempt) {
      router.push(`/evaluate/${inProgressAttempt.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className='mx-auto w-full max-w-4xl px-4 py-16'>
        <div className='flex items-center justify-center'>
          <div className='text-muted-foreground'>{EQuestionCardLabels.SUBMITTING}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-semibold tracking-tight'>{EEvaluatePageLabels.PAGE_TITLE}</h1>
        <p className='text-muted-foreground mt-2'>{EEvaluatePageLabels.PAGE_DESCRIPTION}</p>
      </div>

      {/* Resume In-Progress Attempt */}
      {inProgressAttempt && (
        <div className='bg-primary/5 border-primary/20 mb-8 rounded-lg border p-6'>
          <div className='mb-4 flex items-start justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>{EEvaluatePageLabels.RESUME_TITLE}</h2>
              <p className='text-muted-foreground mt-1 text-sm'>{EEvaluatePageLabels.RESUME_SUBTITLE}</p>
            </div>
            <ClockIcon className='text-primary h-6 w-6' weight='bold' />
          </div>

          <div className='mb-4 space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>{EEvaluatePageLabels.PROGRESS_LABEL}</span>
              <span className='font-medium'>
                {inProgressAttempt.questions_answered} / {EVALUATION_CONFIG.TOTAL_QUESTIONS}{" "}
                {EEvaluatePageLabels.QUESTIONS_LABEL}
              </span>
            </div>
            <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
              <div
                className='bg-primary h-full transition-all duration-300'
                style={{
                  width: `${(inProgressAttempt.questions_answered / EVALUATION_CONFIG.TOTAL_QUESTIONS) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Button onClick={handleResumeAttempt} size='lg' className='gap-2'>
              <PlayIcon weight='fill' className='h-4 w-4' />
              {EEvaluatePageLabels.RESUME_BUTTON}
            </Button>
            <p className='text-muted-foreground text-xs'>
              {EEvaluatePageLabels.STARTED_LABEL} {new Date(inProgressAttempt.started_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Start New Evaluation */}
      {!inProgressAttempt && (
        <div className='mb-8 rounded-lg border p-6'>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold'>{EEvaluatePageLabels.START_NEW_TITLE}</h2>
            <p className='text-muted-foreground mt-2 text-sm'>{EEvaluatePageLabels.EVALUATION_DESCRIPTION}</p>
          </div>

          <div className='bg-muted/50 mb-6 space-y-3 rounded-lg p-4 text-sm'>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                1
              </div>
              <div>
                <p className='font-medium'>{EEvaluatePageLabels.COMPREHENSIVE_SKILL_ASSESSMENT}</p>
                <p className='text-muted-foreground text-xs'>{EEvaluatePageLabels.COMPREHENSIVE_SKILL_DESCRIPTION}</p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                2
              </div>
              <div>
                <p className='font-medium'>{EEvaluatePageLabels.PAUSE_AND_RESUME}</p>
                <p className='text-muted-foreground text-xs'>{EEvaluatePageLabels.PAUSE_AND_RESUME_DESCRIPTION}</p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                3
              </div>
              <div>
                <p className='font-medium'>{EEvaluatePageLabels.UNLIMITED_ATTEMPTS}</p>
                <p className='text-muted-foreground text-xs'>{EEvaluatePageLabels.UNLIMITED_ATTEMPTS_DESCRIPTION}</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartNewAttempt}
            size='lg'
            className='gap-2'
            disabled={createAttemptMutation.isPending}
          >
            {createAttemptMutation.isPending ? (
              EEvaluatePageLabels.CREATING_BUTTON
            ) : (
              <>
                {EEvaluatePageLabels.START_EVALUATION_BUTTON}
                <ArrowRightIcon weight='bold' className='h-4 w-4' />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Past Attempts Summary */}
      {completedAttempts.length > 0 && (
        <div className='rounded-lg border p-6'>
          <h2 className='mb-4 text-lg font-semibold'>{EEvaluatePageLabels.PAST_ATTEMPTS_TITLE}</h2>
          <div className='space-y-3'>
            {completedAttempts.slice(0, 5).map((attempt) => {
              const scorePercent = Math.round((attempt.correct_count / EVALUATION_CONFIG.TOTAL_QUESTIONS) * 100);
              return (
                <div
                  key={attempt.id}
                  className='hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    <div className='text-center'>
                      <div className='text-2xl font-bold'>{scorePercent}%</div>
                      <div className='text-muted-foreground text-xs'>
                        {attempt.correct_count}/{EVALUATION_CONFIG.TOTAL_QUESTIONS}
                      </div>
                    </div>
                    <div>
                      <p className='text-sm font-medium'>
                        Completed {new Date(attempt.completed_at!).toLocaleDateString()}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        {EEvaluatePageLabels.STARTED_LABEL} {new Date(attempt.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant='ghost' size='sm' onClick={() => router.push(`/evaluate/${attempt.id}/results`)}>
                    {EEvaluatePageLabels.VIEW_RESULTS_BUTTON}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State for First-Time Users */}
      {!inProgressAttempt && completedAttempts.length === 0 && (
        <div className='bg-muted/30 mt-8 rounded-lg border border-dashed p-8 text-center'>
          <p className='text-muted-foreground text-sm'>{EEvaluatePageLabels.EMPTY_STATE_MESSAGE}</p>
        </div>
      )}
    </div>
  );
}
