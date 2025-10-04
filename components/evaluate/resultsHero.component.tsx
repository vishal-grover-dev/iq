"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import ScoreGauge from "@/components/evaluate/scoreGauge.component";
import { usePrefersReducedMotion, ANIMATION_EASING } from "@/utils/animation.utils";
import { cn } from "@/utils/tailwind.utils";
import {
  MedalIcon,
  TargetIcon,
  ChartLineUpIcon,
  RocketLaunchIcon,
  ClockIcon,
  SparkleIcon,
} from "@phosphor-icons/react/dist/ssr";

type TResultTier = "expert" | "proficient" | "developing" | "getting_started";

interface IResultsHeroProps {
  score: number;
  correctCount: number;
  totalQuestions: number;
  timeSpentSeconds: number;
  topTopic?: {
    name: string;
    accuracy: number; // 0-1
  } | null;
  focusArea?: {
    topic: string;
    subtopic: string | null;
    accuracy: number; // 0-1
  } | null;
  className?: string;
}

interface IStatCard {
  label: string;
  value: string;
  caption?: string;
  tone?: "positive" | "neutral" | "attention";
}

const TIER_CONFIG: Record<
  TResultTier,
  {
    title: string;
    headline: string;
    description: string;
    accentClass: string;
    badgeClass: string;
    gradientClass: string;
    icon: typeof MedalIcon;
  }
> = {
  expert: {
    title: "Expert Tier",
    headline: "Outstanding mastery!",
    description: "You nailed this attempt with interview-ready precision. Keep the momentum going!",
    accentClass: "text-emerald-400",
    badgeClass: "bg-emerald-500/15 text-emerald-300",
    gradientClass: "from-emerald-500/20 via-emerald-500/10 to-sky-500/0",
    icon: MedalIcon,
  },
  proficient: {
    title: "Proficient Tier",
    headline: "You're on track!",
    description: "Great performance across core topics. A few focused reps will unlock the next tier.",
    accentClass: "text-teal-300",
    badgeClass: "bg-teal-500/15 text-teal-200",
    gradientClass: "from-teal-500/15 via-cyan-500/10 to-transparent",
    icon: TargetIcon,
  },
  developing: {
    title: "Developing Tier",
    headline: "Solid foundation!",
    description: "You're building reliable instincts. Tackle the focus areas below to level up fast.",
    accentClass: "text-amber-300",
    badgeClass: "bg-amber-500/15 text-amber-200",
    gradientClass: "from-amber-500/15 via-orange-500/10 to-transparent",
    icon: ChartLineUpIcon,
  },
  getting_started: {
    title: "Launch Tier",
    headline: "Every expert starts here!",
    description: "Great first step. Follow the curated recommendations to build confidence quickly.",
    accentClass: "text-sky-300",
    badgeClass: "bg-sky-500/15 text-sky-200",
    gradientClass: "from-sky-500/15 via-indigo-500/10 to-transparent",
    icon: RocketLaunchIcon,
  },
};

const CONFETTI_COLORS = ["#34d399", "#22c55e", "#fde047", "#38bdf8", "#f97316"];

const containerVariants = {
  hidden: {
    opacity: 0,
    y: 32,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

const statVariants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: 0.3 + index * 0.08,
      ease: ANIMATION_EASING.easeOut,
    },
  }),
};

function getTierFromScore(score: number): TResultTier {
  if (score >= 90) return "expert";
  if (score >= 75) return "proficient";
  if (score >= 50) return "developing";
  return "getting_started";
}

function formatDuration(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) {
    return "—";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return seconds === 0 ? `${minutes}m` : `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function ConfettiOverlay({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 14 }).map(() => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.4 + Math.random() * 0.6,
        rotation: Math.random() * 180 - 90,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        scale: 0.8 + Math.random() * 0.6,
      })),
    []
  );

  if (prefersReducedMotion) {
    return null;
  }

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden' aria-hidden>
      {pieces.map((piece, index) => (
        <motion.span
          key={index}
          className='absolute block h-2 w-2 rounded-full opacity-0'
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
          }}
          initial={{
            y: "-10%",
            scale: piece.scale,
          }}
          animate={{
            y: ["-10%", "110%"],
            rotate: piece.rotation,
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: piece.duration,
            delay: piece.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
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
  const tier = getTierFromScore(score);
  const tierConfig = TIER_CONFIG[tier];

  const statCards = useMemo<IStatCard[]>(() => {
    const cards: Array<IStatCard | null> = [
      {
        label: "Correct Answers",
        value: `${correctCount}/${totalQuestions}`,
        caption: "Questions mastered",
        tone: "positive",
      },
      {
        label: "Time Spent",
        value: formatDuration(timeSpentSeconds),
        caption: "Focused practice",
        tone: "neutral",
      },
    ];

    if (topTopic) {
      cards.push({
        label: "Strongest Topic",
        value: topTopic.name,
        caption: `${Math.round(topTopic.accuracy * 100)}% accuracy`,
        tone: "positive",
      });
    }

    if (focusArea) {
      cards.push({
        label: "Next Focus",
        value: focusArea.topic, // Always show topic name, not subtopic
        caption: `${Math.round(focusArea.accuracy * 100)}% accuracy`,
        tone: "attention",
      });
    }

    return cards.filter(Boolean) as IStatCard[];
  }, [correctCount, totalQuestions, timeSpentSeconds, topTopic, focusArea]);

  const TierIcon = tierConfig.icon;
  const showConfetti = tier === "expert" && score >= 90;

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
      {/* Background gradient */}
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
                <ScoreGauge score={score} label='Overall Score' />
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
            <h2 className='text-2xl font-semibold md:text-3xl'>You scored {score}% on this attempt.</h2>
            <p className='text-muted-foreground mt-2 text-sm md:text-base'>{tierConfig.description}</p>
          </div>

          <motion.div
            className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
            initial='hidden'
            animate='visible'
            variants={{}}
          >
            {statCards.map((stat, index) => (
              <motion.div
                key={stat.label}
                className={cn(
                  "rounded-2xl border bg-background/70 p-4 shadow-sm backdrop-blur",
                  stat.tone === "positive" && "border-emerald-500/20",
                  stat.tone === "attention" && "border-amber-500/25"
                )}
                variants={statVariants}
                custom={index}
              >
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                    {stat.label}
                  </span>
                  {stat.label === "Time Spent" && <ClockIcon className='h-4 w-4 text-muted-foreground/70' />}
                </div>
                <div className='mt-2 text-lg font-semibold md:text-xl capitalize'>{stat.value}</div>
                {stat.caption && <p className='text-muted-foreground mt-1 text-xs'>{stat.caption}</p>}
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
