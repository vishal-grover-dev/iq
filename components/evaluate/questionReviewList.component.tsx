import { motion } from "framer-motion";
import QuestionCard from "./questionCard.component";
import ReviewFilterBar from "./reviewFilterBar.component";
import type { IQuestionReview } from "@/types/evaluate.types";
import { CheckCircleIcon, FunnelSimpleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import {
  staggerChildrenVariants,
  staggerItemVariants,
  usePrefersReducedMotion,
  ANIMATION_EASING,
} from "@/utils/animation.utils";
import { EQuestionReviewLabels } from "@/types/evaluate.types";
import { useQuestionReviewFiltering } from "@/hooks/useQuestionReviewFiltering.hook";

interface IQuestionReviewListProps {
  questions: IQuestionReview[];
}

export default function QuestionReviewList({ questions }: IQuestionReviewListProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const {
    showOnlyIncorrect,
    setShowOnlyIncorrect,
    selectedTopic,
    setSelectedTopic,
    itemsToShow,
    searchQuery,
    setSearchQuery,
    sortMode,
    setSortMode,
    groupMode,
    setGroupMode,
    sentinelRef,
    filteredQuestions,
    groupedQuestions,
    uniqueTopics,
  } = useQuestionReviewFiltering(questions);

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
            <FunnelSimpleIcon className='h-5 w-5 text-primary/80' weight='fill' /> {EQuestionReviewLabels.SECTION_TITLE}
          </h2>
        </div>

        <div className='w-full lg:w-auto'>
          <ReviewFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedTopic={selectedTopic}
            onTopicChange={setSelectedTopic}
            showOnlyIncorrect={showOnlyIncorrect}
            onShowOnlyIncorrectChange={setShowOnlyIncorrect}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            groupMode={groupMode}
            onGroupModeChange={setGroupMode}
            uniqueTopics={uniqueTopics}
          />
        </div>
      </div>

      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2'>
        <div className='text-muted-foreground text-sm'>
          {EQuestionReviewLabels.FILTERED_SUMMARY_TEMPLATE.replace(
            "{shown}",
            String(Math.min(filteredQuestions.length, itemsToShow))
          )
            .replace("{filtered}", String(filteredQuestions.length))
            .replace("{total}", String(questions.length))}
        </div>
        <div className='text-muted-foreground text-xs uppercase tracking-wide'>{EQuestionReviewLabels.TIP_MESSAGE}</div>
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
                  {EQuestionReviewLabels.GROUP_STATS_TEMPLATE.replace(
                    "{incorrect}",
                    String(group.items.filter((item) => !item.is_correct).length)
                  ).replace("{total}", String(group.items.length))}
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
                        {`${EQuestionReviewLabels.QUESTION_PREFIX} ${question.question_order}`}
                      </span>
                      {question.is_correct ? (
                        <div className='flex items-center gap-1 text-sm text-green-600 dark:text-green-400'>
                          <CheckCircleIcon weight='fill' className='h-4 w-4' />
                          <span>{EQuestionReviewLabels.CORRECT_LABEL}</span>
                        </div>
                      ) : (
                        <div className='flex items-center gap-1 text-sm text-red-600 dark:text-red-400'>
                          <XCircleIcon weight='fill' className='h-4 w-4' />
                          <span>{EQuestionReviewLabels.INCORRECT_LABEL}</span>
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
