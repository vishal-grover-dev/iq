"use client";

import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAttemptResultsQuery } from "@/services/evaluate.services";
import { ArrowLeftIcon, PlayIcon } from "@phosphor-icons/react";
import ScoreGauge from "@/components/evaluate/scoreGauge.component";
import PerformanceBarChart from "@/components/evaluate/performanceBarChart.component";
import WeakAreasPanel from "@/components/evaluate/weakAreasPanel.component";
import QuestionReviewList from "@/components/evaluate/questionReviewList.component";

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

  const { data, isLoading, error } = useAttemptResultsQuery(attemptId, true);

  if (isLoading) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16'>
        <div className='flex items-center justify-center'>
          <div className='text-muted-foreground'>Loading results...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className='mx-auto w-full max-w-6xl px-4 py-16'>
        <div className='text-center'>
          <p className='text-muted-foreground mb-4'>{error ? "Failed to load results" : "Results not found"}</p>
          <Button onClick={() => router.push("/evaluate")}>Return to Evaluate</Button>
        </div>
      </div>
    );
  }

  const { summary, topic_breakdown, subtopic_breakdown, bloom_breakdown, weak_areas, questions } = data;

  // Score tier for message
  const getScoreTier = (percentage: number) => {
    if (percentage >= 90) return "excellent";
    if (percentage >= 75) return "good";
    if (percentage >= 60) return "passing";
    return "needs-improvement";
  };

  const scoreTier = getScoreTier(summary.score_percentage);

  const celebrationMessages = {
    excellent: "Outstanding work! You've demonstrated excellent mastery.",
    good: "Great job! You're well-prepared for interviews.",
    passing: "Good effort! Review weak areas to strengthen your skills.",
    "needs-improvement": "Keep learning! Focus on the recommended areas below.",
  };

  return (
    <div className='mx-auto w-full max-w-6xl px-4 py-6'>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <h1 className='text-2xl font-bold'>Evaluation Results</h1>
        <div className='flex gap-2'>
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

      {/* Summary Card */}
      <div className='bg-card mb-8 rounded-lg border p-6 shadow-sm'>
        <div className='mb-6 grid gap-6 md:grid-cols-2'>
          {/* Left: Score Gauge */}
          <div className='flex flex-col items-center justify-center'>
            <ScoreGauge score={summary.score_percentage} label='Overall Score' />
            <p className='text-muted-foreground mt-4 text-center text-sm'>{celebrationMessages[scoreTier]}</p>
          </div>

          {/* Right: Summary Stats */}
          <div className='flex flex-col justify-center space-y-4'>
            <div>
              <div className='text-muted-foreground text-sm'>Questions Answered</div>
              <div className='text-3xl font-bold'>
                {summary.correct_count} / {summary.total_questions}
              </div>
            </div>
            <div>
              <div className='text-muted-foreground text-sm'>Accuracy</div>
              <div className='text-3xl font-bold'>{summary.score_percentage}%</div>
            </div>
            <div>
              <div className='text-muted-foreground text-sm'>Time Spent</div>
              <div className='text-xl font-semibold'>{Math.floor(summary.time_spent_seconds / 60)} minutes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className='mb-8 grid gap-6 md:grid-cols-2'>
        <PerformanceBarChart title='Performance by Topic' data={topic_breakdown} />
        <PerformanceBarChart title='Performance by Cognitive Level' data={bloom_breakdown} />

        {/* Difficulty Breakdown */}
        <PerformanceBarChart
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
          className='md:col-span-2'
        />
      </div>

      {/* Weak Areas Panel */}
      <WeakAreasPanel weakAreas={weak_areas} />

      {/* Subtopic Breakdown (Expandable) */}
      {subtopic_breakdown.length > 0 && (
        <details className='bg-card mb-8 rounded-lg border p-4 shadow-sm'>
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
        </details>
      )}

      {/* Review Section */}
      <QuestionReviewList questions={questions} />
    </div>
  );
}
