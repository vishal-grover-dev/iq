"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ScoreGauge from "@/components/evaluate/scoreGauge.component";
import ConfettiOverlay from "@/components/evaluate/confettiOverlay.component";
import ResultStatCard from "@/components/evaluate/resultStatCard.component";
import { usePrefersReducedMotion, ANIMATION_EASING } from "@/utils/animation.utils";
import { cn } from "@/utils/tailwind.utils";
import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { STAT_CARD_LABELS } from "@/constants/evaluate.constants";
import { EResultsHeroLabels, EResultsPageLabels } from "@/types/evaluate.types";
import { useResultsTier } from "@/hooks/useResultsTier.hook";

interface IResultsHeroProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  topTopic?: {
    name: string;
    accuracy: number;
  } | null;
  focusArea?: {
    topic: string;
    subtopic: string | null;
    accuracy: number;
  } | null;
  className?: string;
}

interface IStatCard {
  label: string;
  value: string;
  caption?: string;
  tone?: "positive" | "neutral" | "attention";
}

const containerVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: ANIMATION_EASING.easeOut },
  },
};

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return "—";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export default function ResultsHero({
  score,
  correctCount,
  totalQuestions,
  timeSpentSeconds,
  topTopic,
  focusArea,
  className,
}: IResultsHeroProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { tier, tierConfig, showConfetti } = useResultsTier(score);

  const statCards = useMemo<IStatCard[]>(() => {
    const cards: Array<IStatCard | null> = [
      {
        label: STAT_CARD_LABELS.CORRECT_ANSWERS,
        value: `${correctCount}/${totalQuestions}`,
        caption: STAT_CARD_LABELS.QUESTIONS_MASTERED,
        tone: "positive",
      },
      {
        label: STAT_CARD_LABELS.TIME_SPENT,
        value: formatDuration(timeSpentSeconds),
        caption: STAT_CARD_LABELS.FOCUSED_PRACTICE,
        tone: "neutral",
      },
    ];

    if (topTopic) {
      cards.push({
        label: STAT_CARD_LABELS.STRONGEST_TOPIC,
        value: topTopic.name,
        caption: `${Math.round(topTopic.accuracy * 100)}% ${STAT_CARD_LABELS.ACCURACY}`,
        tone: "positive",
      });
    }

    if (focusArea) {
      cards.push({
        label: STAT_CARD_LABELS.NEXT_FOCUS,
        value: focusArea.topic,
        caption: `${Math.round(focusArea.accuracy * 100)}% ${STAT_CARD_LABELS.ACCURACY}`,
        tone: "attention",
      });
    }

    return cards.filter(Boolean) as IStatCard[];
  }, [correctCount, totalQuestions, timeSpentSeconds, topTopic, focusArea]);

  const TierIcon = tierConfig.icon;

  return (
    <motion.section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border/60 bg-card/70 p-6 shadow-xl ring-1 ring-primary/10 md:p-8",
        className
      )}
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      <motion.div
        className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", tierConfig.gradientClass)}
        initial={{ opacity: 0 }}
        animate={{ opacity: prefersReducedMotion ? 0.35 : 0.6 }}
        transition={{ duration: 0.8, ease: ANIMATION_EASING.easeOut }}
        aria-hidden
      />

      {showConfetti && <ConfettiOverlay prefersReducedMotion={prefersReducedMotion} />}

      <div className='relative grid gap-8 md:grid-cols-[minmax(0,_1fr)_minmax(0,_1.2fr)] md:items-center'>
        <motion.div
          className='flex flex-col items-center justify-center gap-4 text-center md:items-start md:text-left overflow-hidden'
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: ANIMATION_EASING.easeOut }}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: ANIMATION_EASING.easeOut, delay: 0.1 }}
            className='w-full'
          >
            <div className='mb-6 flex flex-col items-center gap-3 md:items-start w-full'>
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
                  tierConfig.badgeClass
                )}
              >
                <TierIcon className='h-4 w-4' weight='fill' />
                <span>{tierConfig.title}</span>
              </div>
              <div className='w-full flex justify-center md:justify-start'>
                <ScoreGauge score={score} label={EResultsHeroLabels.OVERALL_SCORE} />
              </div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          className='space-y-6'
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: ANIMATION_EASING.easeOut, delay: 0.1 }}
        >
          <div>
            <p className={cn("flex items-center gap-2 text-sm font-medium", tierConfig.accentClass)}>
              <SparkleIcon className='h-4 w-4' weight='fill' />
              {tierConfig.headline}
            </p>
            <h2 className='text-2xl font-semibold md:text-3xl'>
              {EResultsPageLabels.YOU_SCORED.replace("{score}", String(score))}
            </h2>
            <p className='text-muted-foreground mt-2 text-sm md:text-base'>{tierConfig.description}</p>
          </div>

          <motion.div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3' initial='hidden' animate='visible'>
            {statCards.map((stat, index) => (
              <ResultStatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                caption={stat.caption}
                tone={stat.tone}
              />
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
