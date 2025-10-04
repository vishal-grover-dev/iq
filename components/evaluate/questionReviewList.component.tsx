import { useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "./questionCard.component";
import type { IQuestionReview } from "@/types/evaluate.types";
import { CheckCircleIcon, FunnelSimpleIcon, MagnifyingGlassIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { motion } from "framer-motion";
import {
  staggerChildrenVariants,
  staggerItemVariants,
  usePrefersReducedMotion,
  ANIMATION_EASING,
} from "@/utils/animation.utils";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showOnlyIncorrect, setShowOnlyIncorrect] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [itemsToShow, setItemsToShow] = useState(20); // show first 20 initially
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<"order" | "difficulty" | "topic">("order");
  const [groupMode, setGroupMode] = useState<"none" | "topic" | "difficulty">("none");
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Filter questions
  const filteredQuestions = useMemo(() => {
    const base = questions.filter((q) => {
      if (showOnlyIncorrect && q.is_correct) return false;
      if (selectedTopic !== "all" && q.metadata.topic !== selectedTopic) return false;
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.question_text.toLowerCase().includes(query);
        const matchesExplanation = q.explanation?.toLowerCase().includes(query);
        const matchesMetadata =
          q.metadata.subtopic?.toLowerCase().includes(query) ||
          q.metadata.bloom_level.toLowerCase().includes(query) ||
          q.metadata.difficulty.toLowerCase().includes(query);
        if (!matchesText && !matchesExplanation && !matchesMetadata) {
          return false;
        }
      }
      return true;
    });

    const sorted = [...base];
    if (sortMode === "order") {
      sorted.sort((a, b) => a.question_order - b.question_order);
    }
    if (sortMode === "difficulty") {
      const rank: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };
      sorted.sort((a, b) => rank[a.metadata.difficulty] - rank[b.metadata.difficulty]);
    }
    if (sortMode === "topic") {
      sorted.sort((a, b) => a.metadata.topic.localeCompare(b.metadata.topic));
    }
    return sorted;
  }, [questions, showOnlyIncorrect, selectedTopic, searchQuery, sortMode]);

  const groupedQuestions = useMemo(() => {
    if (groupMode === "none") {
      return [{ groupKey: "All Questions", items: filteredQuestions }];
    }

    const map = new Map<string, IQuestionReview[]>();
    filteredQuestions.forEach((question) => {
      const key =
        groupMode === "topic"
          ? question.metadata.topic
          : `${question.metadata.difficulty} • ${question.metadata.topic}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(question);
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([groupKey, items]) => ({ groupKey, items }));
  }, [filteredQuestions, groupMode]);

  // Get unique topics for filter
  const uniqueTopics = useMemo(() => Array.from(new Set(questions.map((q) => q.metadata.topic))), [questions]);

  // Lazy-load additional items on scroll (increments of 20)
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          setItemsToShow((prev) => Math.min(prev + 20, filteredQuestions.length));
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [filteredQuestions.length]);

  return (
    <motion.section
      className='bg-card mb-8 rounded-3xl border p-6 shadow-lg ring-1 ring-border/40'
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: ANIMATION_EASING.easeOut }}
    >
      <div className='mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='flex items-center gap-2 text-lg font-semibold md:text-xl'>
            <FunnelSimpleIcon className='h-5 w-5 text-primary/80' weight='fill' /> Intelligent Question Review
          </h2>
        </div>

        <div className='space-y-3'>
          {/* Search and Topic Filter */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <div className='relative flex-1'>
              <MagnifyingGlassIcon className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder='Search questions, explanations, or tags'
                className='pl-9'
              />
            </div>

            {uniqueTopics.length > 1 && (
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className='border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-40'
              >
                <option value='all'>All Topics</option>
                {uniqueTopics.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            )}

            <div className='flex items-center gap-2'>
              <Label htmlFor='show-incorrect-only' className='text-sm font-medium cursor-pointer whitespace-nowrap'>
                Show only incorrect
              </Label>
              <Switch id='show-incorrect-only' checked={showOnlyIncorrect} onCheckedChange={setShowOnlyIncorrect} />
            </div>
          </div>

          {/* Sort and Group Controls - Combined Row */}
          <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>Sort:</span>
              <ToggleGroup
                type='single'
                value={sortMode}
                onValueChange={(value) => value && setSortMode(value as typeof sortMode)}
              >
                <ToggleGroupItem value='order' className='h-7 text-xs'>
                  Order
                </ToggleGroupItem>
                <ToggleGroupItem value='difficulty' className='h-7 text-xs'>
                  Difficulty
                </ToggleGroupItem>
                <ToggleGroupItem value='topic' className='h-7 text-xs'>
                  Topic
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>Group:</span>
              <ToggleGroup
                type='single'
                value={groupMode}
                onValueChange={(value) => value && setGroupMode(value as typeof groupMode)}
              >
                <ToggleGroupItem value='none' className='h-7 text-xs'>
                  None
                </ToggleGroupItem>
                <ToggleGroupItem value='topic' className='h-7 text-xs'>
                  Topic
                </ToggleGroupItem>
                <ToggleGroupItem value='difficulty' className='h-7 text-xs'>
                  Difficulty
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      </div>

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2'>
        <div className='text-muted-foreground text-sm'>
          Showing {Math.min(filteredQuestions.length, itemsToShow)} of {filteredQuestions.length} filtered questions
          (total {questions.length})
        </div>
        <div className='text-muted-foreground text-xs uppercase tracking-wide'>
          Tip: Use search to find explanations, tags, or specific phrasing.
        </div>
      </div>

      {/* Questions List */}
      <motion.div
        variants={staggerChildrenVariants}
        initial='hidden'
        animate='visible'
        custom={prefersReducedMotion}
        className='space-y-8'
      >
        {groupedQuestions.map((group, groupIndex) => (
          <motion.div
            key={group.groupKey}
            className='rounded-2xl border border-dashed border-border/50 p-4 shadow-sm'
            variants={staggerItemVariants}
            custom={prefersReducedMotion}
          >
            {groupMode !== "none" && (
              <div className='mb-4 flex items-center justify-between'>
                <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                  {group.groupKey}
                </div>
                <div className='text-muted-foreground text-xs'>
                  {group.items.filter((item) => !item.is_correct).length} incorrect • {group.items.length} total
                </div>
              </div>
            )}

            <motion.div
              className='space-y-6'
              variants={staggerChildrenVariants}
              initial='hidden'
              animate='visible'
              custom={prefersReducedMotion}
            >
              {group.items
                .slice(0, groupIndex === groupedQuestions.length - 1 ? itemsToShow : group.items.length)
                .map((question) => (
                  <motion.div
                    key={`${group.groupKey}-${question.question_order}`}
                    className='border-t pt-6 first:border-t-0 first:pt-0'
                    variants={staggerItemVariants}
                    custom={prefersReducedMotion}
                  >
                    <div className='mb-3 flex items-center gap-2'>
                      <span className='text-muted-foreground text-sm font-medium'>
                        Question {question.question_order}
                      </span>
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

                    <QuestionCard
                      question={question.question_text}
                      options={question.options}
                      code={question.code}
                      metadata={{
                        topic: question.metadata.topic,
                        subtopic: question.metadata.subtopic,
                        difficulty: question.metadata.difficulty,
                        bloom_level: question.metadata.bloom_level,
                      }}
                      mode='review'
                      userAnswerIndex={question.user_answer_index}
                      correctIndex={question.correct_index}
                      explanation={question.explanation}
                      citations={question.citations}
                    />
                  </motion.div>
                ))}
            </motion.div>
          </motion.div>
        ))}
      </motion.div>
      {/* Sentinel for lazy-load */}
      {itemsToShow < filteredQuestions.length && <div ref={sentinelRef} className='h-6' aria-hidden='true' />}
    </motion.section>
  );
}
