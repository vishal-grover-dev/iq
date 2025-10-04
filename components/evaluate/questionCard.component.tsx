"use client";

import { useMemo, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CodeBlock from "./codeBlock.component";
import OptionButton from "./optionButton.component";
import type { ICitation } from "@/types/evaluate.types";

interface IQuestionCardProps {
  question: string;
  options: string[];
  code?: string | null;
  metadata?: {
    topic?: string;
    subtopic?: string | null;
    difficulty?: string;
    bloom_level?: string;
  };
  mode: "evaluation" | "review";
  // Evaluation mode props
  onSubmit?: (selectedIndex: number) => void;
  isSubmitting?: boolean;
  // Review mode props
  userAnswerIndex?: number | null;
  correctIndex?: number;
  explanation?: string;
  citations?: ICitation[];
}

function MetadataChip({ label }: { label: string }) {
  return (
    <span className='bg-muted text-muted-foreground inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'>
      {label}
    </span>
  );
}

/**
 * QuestionCard Component
 *
 * Displays MCQ questions for evaluate feature in two modes:
 * - evaluation: Interactive with option selection and submit button
 * - review: Read-only with user answer, correct answer, and explanation
 *
 * Features:
 * - Syntax highlighting for code blocks (Prism)
 * - Keyboard shortcuts (1-4 for options, Enter for submit)
 * - Responsive mobile-first design
 * - Accessibility (ARIA labels, keyboard nav)
 */
export default function QuestionCard({
  question,
  options,
  code,
  metadata,
  mode,
  onSubmit,
  isSubmitting = false,
  userAnswerIndex,
  correctIndex,
  explanation,
  citations,
}: IQuestionCardProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Normalize question text (merge isolated inline-code)
  const normalizedQuestion = useMemo(() => {
    if (!question || question.length === 0) return "";
    return question.replace(/\n\s*`([^`]+)`\s*\n/gm, " `$1` ");
  }, [question]);

  // Keyboard shortcuts for evaluation mode
  useEffect(() => {
    if (mode !== "evaluation" || isSubmitting) return;
    if (!Array.isArray(options) || options.length === 0) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      // Option selection: 1-4 keys
      if (["1", "2", "3", "4"].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (index < options.length) {
          setSelectedIndex(index);
          e.preventDefault();
        }
      }

      // Submit: Enter key (only if option selected)
      if (e.key === "Enter" && selectedIndex !== null) {
        handleSubmit();
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [mode, selectedIndex, options.length, isSubmitting]);

  const handleSubmit = () => {
    if (selectedIndex !== null && onSubmit) {
      onSubmit(selectedIndex);
    }
  };

  const handleOptionClick = (index: number) => {
    if (mode === "evaluation" && !isSubmitting) {
      setSelectedIndex(index);
    }
  };

  return (
    <div className='rounded-lg border bg-card p-4 shadow-sm md:p-6' data-testid='question-card'>
      {/* Metadata chips */}
      {metadata && (
        <div className='mb-4 flex flex-wrap items-center gap-2' data-testid='question-metadata'>
          {metadata.subtopic && <MetadataChip label={metadata.subtopic} />}
          {metadata.bloom_level && <MetadataChip label={metadata.bloom_level} />}
          {metadata.difficulty && <MetadataChip label={metadata.difficulty} />}
        </div>
      )}

      {/* Question text */}
      <div className='prose prose-sm max-w-none break-words dark:prose-invert' data-testid='question-text'>
        <CodeBlock content={normalizedQuestion} defaultLanguage='javascript' />
      </div>

      {/* Code block (separate from question) */}
      {code && (
        <div className='mt-4'>
          <CodeBlock content={code} defaultLanguage='tsx' />
        </div>
      )}

      {/* Options */}
      <div className='mt-4 grid gap-2'>
        {options.map((opt, idx) => (
          <OptionButton
            key={idx}
            option={opt}
            index={idx}
            mode={mode}
            isSelected={selectedIndex === idx}
            isUserAnswer={mode === "review" && idx === userAnswerIndex}
            isCorrect={mode === "review" && idx === correctIndex}
            isSubmitting={isSubmitting}
            onClick={handleOptionClick}
          />
        ))}
      </div>

      {/* Submit button (evaluation mode only) */}
      {mode === "evaluation" && (
        <div className='mt-4 flex items-center justify-between'>
          <p className='text-muted-foreground text-xs'>Press 1-4 to select, Enter to submit</p>
          <Button onClick={handleSubmit} disabled={selectedIndex === null || isSubmitting} size='lg'>
            {isSubmitting ? "Submitting..." : "Submit Answer"}
          </Button>
        </div>
      )}

      {/* Explanation (review mode only) */}
      {mode === "review" && explanation && (
        <div className='bg-muted/50 mt-4 rounded-md p-3 text-sm' data-testid='question-explanation'>
          <div className='mb-1 font-semibold'>Explanation</div>
          <p className='text-muted-foreground'>{explanation}</p>
        </div>
      )}

      {/* Citations (review mode only) */}
      {mode === "review" && citations && citations.length > 0 && (
        <div className='mt-4' data-testid='question-citations'>
          <div className='text-muted-foreground mb-1 text-xs font-semibold'>Learn More</div>
          <ul className='text-muted-foreground list-disc space-y-1 pl-5 text-xs'>
            {citations.map((citation, i) => (
              <li key={i}>
                <a
                  href={citation.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='hover:text-primary underline underline-offset-2 transition-colors'
                >
                  {citation.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
