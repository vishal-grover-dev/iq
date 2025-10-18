"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAttemptResultsQuery } from "@/services/evaluate.services";
import { ArrowLeftIcon, PlayIcon, WrenchIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import ResultsHero from "@/components/evaluate/resultsHero.component";
import PerformanceBarChart from "@/components/evaluate/performanceBarChart.component";
import WeakAreasPanel from "@/components/evaluate/weakAreasPanel.component";
import QuestionReviewList from "@/components/evaluate/questionReviewList.component";
import { motion } from "framer-motion";
import { usePrefersReducedMotion, resultsOrchestrationVariants } from "@/utils/animation.utils";
import { RESULTS_PAGE_STATES } from "@/constants/evaluate.constants";

/**
 * Results Page - Post-Attempt Analytics and Review
 *
 * This is the FIRST time users see any feedback about their answers.
 * Shows summary, breakdowns, weak areas, and complete question review.
 */
export default function EvaluateResultsPage() {
  const router = useRouter();
  const params = useParams();
  const attemptId = params.attemptId as string;
  const [isFixing, setIsFixing] = useState(false);

  const { data, isLoading, error } = useAttemptResultsQuery(attemptId, true);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Move useMemo hooks before any conditional returns
  const topTopic = useMemo(() => {
    if (!data?.topic_breakdown?.length) return null;
    const candidates = data.topic_breakdown.filter((item) => item.total > 0);
    if (!candidates.length) return null;
    const best = candidates.reduce((prev, current) => (current.accuracy > prev.accuracy ? current : prev));
    return {
      name: best.category,
      accuracy: best.accuracy,
    };
  }, [data?.topic_breakdown]);

  const focusArea = useMemo(() => {
    if (!data?.weak_areas?.length) return null;
    const sorted = [...data.weak_areas].sort((a, b) => a.accuracy - b.accuracy);
    const primary = sorted[0];
    return {
      topic: primary.topic,
      subtopic: null, // Always use topic name, not subtopic
      accuracy: primary.accuracy,
    };
  }, [data?.weak_areas]);

  if (isLoading) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16'>
        <div className='flex items-center justify-center'>
          <div className='text-muted-foreground'>{RESULTS_PAGE_STATES.LOADING_RESULTS}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16'>
        <div className='text-center'>
          <p className='text-muted-foreground mb-4'>
            {error ? RESULTS_PAGE_STATES.FAILED_TO_LOAD_RESULTS : RESULTS_PAGE_STATES.RESULTS_NOT_FOUND}
          </p>
          <Button onClick={() => router.push("/evaluate")}>{RESULTS_PAGE_STATES.RETURN_TO_EVALUATE_BUTTON}</Button>
        </div>
      </div>
    );
  }

  const { summary, topic_breakdown, subtopic_breakdown, bloom_breakdown, weak_areas, questions } = data;

  // Check if this attempt has gaps (showing fewer questions than expected)
  const hasGaps = summary.total_questions < 60;
  const actualQuestions = questions.length;

  const handleFixAttempt = async () => {
    setIsFixing(true);
    try {
      const response = await fetch(`/api/evaluate/attempts/${attemptId}/fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.fixed) {
        toast.success("Attempt fixed! You can now continue from where you left off.");
        // Redirect to the attempt page to continue
        router.push(`/evaluate/${attemptId}`);
      } else {
        toast.info(result.message || "No fix needed for this attempt.");
      }
    } catch (error) {
      console.error("Error fixing attempt:", error);
      toast.error("Failed to fix attempt. Please try again.");
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div className='mx-auto w-full max-w-6xl px-4 py-6'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Evaluation Results</h1>
          {hasGaps && (
            <p className='text-sm text-amber-600 mt-1'>
              ⚠️ This attempt has gaps - only {actualQuestions} questions were assigned instead of 60
            </p>
          )}
        </div>
        <div className='flex gap-2'>
          {hasGaps && (
            <Button variant='outline' size='sm' onClick={handleFixAttempt} disabled={isFixing}>
              <WrenchIcon className='mr-2 h-4 w-4' />
              {isFixing ? "Fixing..." : "Fix Attempt"}
            </Button>
          )}
          <Button variant='outline' size='sm' onClick={() => router.push("/evaluate")}>
            <ArrowLeftIcon className='mr-2 h-4 w-4' />
            Back to Evaluate
          </Button>
          <Button size='sm' onClick={() => router.push("/evaluate")}>
            <PlayIcon className='mr-2 h-4 w-4' weight='fill' />
            Start New Attempt
          </Button>
        </div>
      </div>

      <motion.div
        initial={resultsOrchestrationVariants.scoreCard(prefersReducedMotion).initial}
        animate={resultsOrchestrationVariants.scoreCard(prefersReducedMotion).animate}
        className='mb-8'
      >
        <ResultsHero
          score={summary.score_percentage}
          correctCount={summary.correct_count}
          totalQuestions={summary.total_questions}
          timeSpentSeconds={summary.time_spent_seconds}
          topTopic={topTopic}
          focusArea={focusArea}
        />
      </motion.div>

      {/* Breakdowns Grid */}
      <div className='mb-8 grid gap-6 md:grid-cols-2'>
        <PerformanceBarChart title='Performance by Topic' data={topic_breakdown} />
        <PerformanceBarChart title='Performance by Cognitive Level' data={bloom_breakdown} />

        {/* Difficulty Breakdown */}
        <PerformanceBarChart
          className='md:col-span-2'
          title='Performance by Difficulty'
          data={["Easy", "Medium", "Hard"].map((difficulty) => {
            const stats = questions.reduce(
              (acc, q) => {
                if (q.metadata.difficulty === difficulty) {
                  acc.total++;
                  if (q.is_correct) acc.correct++;
                }
                return acc;
              },
              { correct: 0, total: 0 }
            );
            return {
              category: difficulty,
              correct: stats.correct,
              total: stats.total,
              accuracy: stats.total > 0 ? stats.correct / stats.total : 0,
            };
          })}
          sortByAccuracy={false}
        />
      </div>

      {/* Weak Areas Panel */}
      <motion.div
        initial={resultsOrchestrationVariants.section(4, prefersReducedMotion).initial}
        animate={resultsOrchestrationVariants.section(4, prefersReducedMotion).animate}
      >
        <WeakAreasPanel weakAreas={weak_areas} />
      </motion.div>

      {/* Subtopic Breakdown (Expandable) */}
      {subtopic_breakdown.length > 0 && (
        <motion.details
          className='bg-card mb-8 rounded-lg border p-4 shadow-sm'
          initial={resultsOrchestrationVariants.section(5, prefersReducedMotion).initial}
          animate={resultsOrchestrationVariants.section(5, prefersReducedMotion).animate}
        >
          <summary className='cursor-pointer text-sm font-semibold'>
            Detailed Performance by Subtopic ({subtopic_breakdown.length} subtopics)
          </summary>
          <div className='mt-4 grid gap-2 md:grid-cols-2'>
            {subtopic_breakdown.map((item) => (
              <div key={item.category} className='flex items-center justify-between text-sm'>
                <span className='text-muted-foreground'>{item.category}</span>
                <span className='font-medium'>
                  {item.correct}/{item.total} ({Math.round(item.accuracy * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </motion.details>
      )}

      {/* Review Section */}
      <QuestionReviewList questions={questions} />
    </div>
  );
}
