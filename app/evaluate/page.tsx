"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAttemptsQuery, useCreateAttemptMutation } from "@/services/evaluate.services";
import { PlayIcon, ArrowRightIcon, ClockIcon } from "@phosphor-icons/react";

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
      const newAttempt = await createAttemptMutation.mutateAsync({});
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
          <div className='text-muted-foreground'>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-8'>
      {/* Header */}
      <div className='mb-8'>
        <h1 className='text-3xl font-semibold tracking-tight'>Frontend Skills Assessment</h1>
        <p className='text-muted-foreground mt-2'>
          Test your React.js ecosystem knowledge with a comprehensive 60-question evaluation
        </p>
      </div>

      {/* Resume In-Progress Attempt */}
      {inProgressAttempt && (
        <div className='bg-primary/5 border-primary/20 mb-8 rounded-lg border p-6'>
          <div className='mb-4 flex items-start justify-between'>
            <div>
              <h2 className='text-lg font-semibold'>Resume Your Evaluation</h2>
              <p className='text-muted-foreground mt-1 text-sm'>Continue where you left off</p>
            </div>
            <ClockIcon className='text-primary h-6 w-6' weight='bold' />
          </div>

          <div className='mb-4 space-y-2'>
            <div className='flex items-center justify-between text-sm'>
              <span className='text-muted-foreground'>Progress</span>
              <span className='font-medium'>{inProgressAttempt.questions_answered} / 60 questions</span>
            </div>
            <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
              <div
                className='bg-primary h-full transition-all duration-300'
                style={{
                  width: `${(inProgressAttempt.questions_answered / 60) * 100}%`,
                }}
              />
            </div>
          </div>

          <div className='flex items-center gap-3'>
            <Button onClick={handleResumeAttempt} size='lg' className='gap-2'>
              <PlayIcon weight='fill' className='h-4 w-4' />
              Resume Evaluation
            </Button>
            <p className='text-muted-foreground text-xs'>
              Started {new Date(inProgressAttempt.started_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* Start New Evaluation */}
      {!inProgressAttempt && (
        <div className='mb-8 rounded-lg border p-6'>
          <div className='mb-6'>
            <h2 className='text-xl font-semibold'>Start New Evaluation</h2>
            <p className='text-muted-foreground mt-2 text-sm'>
              Answer 60 questions across React, JavaScript, TypeScript, HTML, CSS, State Management, Routing, Testing,
              Accessibility, and PWA
            </p>
          </div>

          <div className='bg-muted/50 mb-6 space-y-3 rounded-lg p-4 text-sm'>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                1
              </div>
              <div>
                <p className='font-medium'>60 questions per evaluation</p>
                <p className='text-muted-foreground text-xs'>
                  30 Easy, 20 Medium, 10 Hard with minimum 35% coding questions
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                2
              </div>
              <div>
                <p className='font-medium'>Pause and resume anytime</p>
                <p className='text-muted-foreground text-xs'>Your progress is saved across multiple sessions</p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                3
              </div>
              <div>
                <p className='font-medium'>No feedback during evaluation</p>
                <p className='text-muted-foreground text-xs'>
                  Complete all 60 questions to see your results and learn from explanations
                </p>
              </div>
            </div>
            <div className='flex items-start gap-3'>
              <div className='bg-primary text-primary-foreground mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold'>
                4
              </div>
              <div>
                <p className='font-medium'>Unlimited attempts</p>
                <p className='text-muted-foreground text-xs'>
                  Track your improvement over time with detailed analytics
                </p>
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
              "Creating..."
            ) : (
              <>
                Start Evaluation
                <ArrowRightIcon weight='bold' className='h-4 w-4' />
              </>
            )}
          </Button>
        </div>
      )}

      {/* Past Attempts Summary */}
      {completedAttempts.length > 0 && (
        <div className='rounded-lg border p-6'>
          <h2 className='mb-4 text-lg font-semibold'>Past Attempts</h2>
          <div className='space-y-3'>
            {completedAttempts.slice(0, 5).map((attempt) => {
              const scorePercent = Math.round((attempt.correct_count / 60) * 100);
              return (
                <div
                  key={attempt.id}
                  className='hover:bg-muted/50 flex items-center justify-between rounded-lg border p-4 transition-colors'
                >
                  <div className='flex items-center gap-4'>
                    <div className='text-center'>
                      <div className='text-2xl font-bold'>{scorePercent}%</div>
                      <div className='text-muted-foreground text-xs'>{attempt.correct_count}/60</div>
                    </div>
                    <div>
                      <p className='text-sm font-medium'>
                        Completed {new Date(attempt.completed_at!).toLocaleDateString()}
                      </p>
                      <p className='text-muted-foreground text-xs'>
                        Started {new Date(attempt.started_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button variant='ghost' size='sm' onClick={() => router.push(`/evaluate/${attempt.id}/results`)}>
                    View Results
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
          <p className='text-muted-foreground text-sm'>
            No attempts yet. Start your first evaluation to assess your frontend skills and identify areas for
            improvement.
          </p>
        </div>
      )}
    </div>
  );
}
