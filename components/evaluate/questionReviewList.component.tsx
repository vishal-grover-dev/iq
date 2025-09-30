import { useState } from "react";
import { Button } from "@/components/ui/button";
import QuestionCard from "./questionCard.component";
import type { IQuestionReview } from "@/types/evaluate.types";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";

/**
 * Question Review List Component
 *
 * Displays all 60 questions with filtering controls.
 * Shows user's answers, correct answers, explanations, and citations.
 */

interface IQuestionReviewListProps {
  questions: IQuestionReview[];
}

export default function QuestionReviewList({ questions }: IQuestionReviewListProps) {
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (showOnlyIncorrect && q.is_correct) return false;
    if (selectedTopic !== "all" && q.metadata.topic !== selectedTopic) return false;
    return true;
  });

  // Get unique topics for filter
  const uniqueTopics = Array.from(new Set(questions.map((q) => q.metadata.topic)));

  return (
    <div className='bg-card mb-8 rounded-lg border p-6 shadow-sm'>
      <div className='mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <h2 className='text-lg font-semibold'>Question Review</h2>
        <div className='flex flex-wrap gap-2'>
          {/* Filter: Show only incorrect */}
          <Button
            variant={showOnlyIncorrect ? "default" : "outline"}
            size='sm'
            onClick={() => setShowOnlyIncorrect(!showOnlyIncorrect)}
          >
            {showOnlyIncorrect ? "Show All" : "Show Only Incorrect"}
          </Button>

          {/* Filter: Topic */}
          {uniqueTopics.length > 1 && (
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className='border-input bg-background ring-offset-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'
            >
              <option value='all'>All Topics</option>
              {uniqueTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className='text-muted-foreground mb-4 text-sm'>
        Showing {filteredQuestions.length} of {questions.length} questions
      </div>

      {/* Questions List */}
      <div className='space-y-6'>
        {filteredQuestions.map((question) => (
          <div key={question.question_order} className='border-t pt-6 first:border-t-0 first:pt-0'>
            {/* Question number and result */}
            <div className='mb-3 flex items-center gap-2'>
              <span className='text-muted-foreground text-sm font-medium'>Question {question.question_order}</span>
              {question.is_correct ? (
                <div className='flex items-center gap-1 text-sm text-green-600 dark:text-green-400'>
                  <CheckCircleIcon weight='fill' className='h-4 w-4' />
                  <span>Correct</span>
                </div>
              ) : (
                <div className='flex items-center gap-1 text-sm text-red-600 dark:text-red-400'>
                  <XCircleIcon weight='fill' className='h-4 w-4' />
                  <span>Incorrect</span>
                </div>
              )}
            </div>

            {/* Question card in review mode */}
            <QuestionCard
              question={question.question_text}
              options={question.options}
              code={question.code}
              metadata={{
                topic: question.metadata.topic,
                subtopic: question.metadata.subtopic,
                difficulty: question.metadata.difficulty,
                bloom_level: question.metadata.bloom_level,
                question_order: question.question_order,
                coding_mode: !!question.code,
              }}
              mode='review'
              userAnswerIndex={question.user_answer_index}
              correctIndex={question.correct_index}
              isCorrect={question.is_correct}
              explanation={question.explanation}
              citations={question.citations}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
