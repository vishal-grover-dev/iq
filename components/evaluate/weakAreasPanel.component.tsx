"use client";

import type { IWeakArea } from "@/types/evaluate.types";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion, ANIMATION_EASING } from "@/utils/animation.utils";
import { cn } from "@/utils/tailwind.utils";
import { TrendDownIcon, WarningCircleIcon, ArrowSquareOutIcon, LightningIcon } from "@phosphor-icons/react/dist/ssr";

/**
 * Weak Areas Panel Component
 *
 * Displays identified weak areas with recommendations and citations.
 * Only shown when user has subtopics with < 50% accuracy (≥3 questions).
 */

interface IWeakAreasPanelProps {
  weakAreas: IWeakArea[];
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      delay: 0.12 + index * 0.08,
      ease: ANIMATION_EASING.easeOut,
    },
  }),
};

const ACCURACY_TIERS = [
  { threshold: 0.5, tone: "critical", label: "Critical" },
  { threshold: 0.7, tone: "caution", label: "Needs Focus" },
  { threshold: 0.85, tone: "watch", label: "Monitor" },
];

const TONE_STYLES: Record<string, { badge: string; glow: string; border: string }> = {
  critical: {
    badge: "bg-red-600 text-white shadow-sm",
    glow: "from-rose-500/20 via-orange-500/10 to-transparent",
    border: "border-red-500/50",
  },
  caution: {
    badge: "bg-amber-500/20 text-amber-800 dark:text-amber-100",
    glow: "from-amber-500/20 via-yellow-500/10 to-transparent",
    border: "border-amber-500/30",
  },
  watch: {
    badge: "bg-sky-500/15 text-sky-200",
    glow: "from-sky-500/20 via-cyan-500/10 to-transparent",
    border: "border-sky-500/25",
  },
};

function getTone(accuracy: number) {
  const tier = ACCURACY_TIERS.find((t) => accuracy <= t.threshold);
  if (!tier) {
    return { tone: "watch", label: "Monitor" };
  }
  return tier;
}

function formatAccuracy(accuracy: number): string {
  return `${Math.round(accuracy * 100)}%`;
}

export default function WeakAreasPanel({ weakAreas }: IWeakAreasPanelProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  const prioritizedAreas = useMemo(() => {
    const sorted = [...weakAreas].sort((a, b) => a.accuracy - b.accuracy);

    // Enforce symmetry: show 0, 2, or 4 cards maximum
    if (sorted.length === 0) {
      return [];
    } else if (sorted.length === 1) {
      // If only 1 weak area, don't show any to maintain symmetry
      return [];
    } else if (sorted.length === 2 || sorted.length === 3) {
      // Show exactly 2 cards for symmetry
      return sorted.slice(0, 2);
    } else {
      // Show exactly 4 cards for symmetry
      return sorted.slice(0, 4);
    }
  }, [weakAreas]);

  if (prioritizedAreas.length === 0) {
    return null;
  }

  return (
    <motion.section
      className='relative mb-8 overflow-hidden rounded-3xl border border-border/60 bg-amber-50/70 p-6 shadow-lg ring-1 ring-amber-500/20 dark:bg-amber-950/30'
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      <motion.div
        className='pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent dark:from-amber-400/15'
        initial={{ opacity: 0 }}
        animate={{ opacity: prefersReducedMotion ? 0.25 : 0.45 }}
        transition={{ duration: 0.6, ease: ANIMATION_EASING.easeOut }}
        aria-hidden
      />

      <div className='relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <motion.h2
            className='flex items-center gap-2 text-lg font-semibold md:text-xl'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: ANIMATION_EASING.easeOut, delay: 0.05 }}
          >
            <WarningCircleIcon className='h-5 w-5 text-amber-500' weight='fill' /> Areas to Improve
          </motion.h2>
          <motion.p
            className='text-muted-foreground mt-1 text-sm'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: ANIMATION_EASING.easeOut, delay: 0.12 }}
          >
            Focus on the essentials first—each card includes targeted actions to raise your mastery.
          </motion.p>
        </div>

        <motion.div
          className='flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-100/40 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: ANIMATION_EASING.easeOut, delay: 0.2 }}
        >
          <LightningIcon className='h-4 w-4' weight='fill' /> Top opportunities
        </motion.div>
      </div>

      <motion.div className='relative mt-6 grid gap-4 md:grid-cols-2' initial='hidden' animate='visible' variants={{}}>
        {prioritizedAreas.map((area, index) => {
          const { tone, label } = getTone(area.accuracy);
          const styles = TONE_STYLES[tone];

          return (
            <motion.article
              key={`${area.topic}-${area.subtopic ?? "general"}`}
              className={cn(
                "group relative overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur transition-shadow",
                styles.border,
                "hover:shadow-lg"
              )}
              variants={cardVariants}
              custom={index}
            >
              <motion.div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity",
                  styles.glow
                )}
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 0.55 }}
                transition={{ duration: 0.35, ease: ANIMATION_EASING.easeOut }}
                aria-hidden
              />

              <div className='relative flex flex-col gap-3'>
                <div className='flex items-center justify-between gap-3'>
                  <div>
                    <div className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
                      {area.topic}
                    </div>
                    <h3 className='text-base font-semibold'>{area.subtopic ?? "General mastery"}</h3>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      styles.badge
                    )}
                  >
                    <TrendDownIcon className='h-3.5 w-3.5' weight='fill' />
                    {label}
                  </span>
                </div>

                <div className='flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-50/70 px-3 py-2 text-sm dark:border-amber-500/30 dark:bg-amber-900/30'>
                  <div className='flex flex-col'>
                    <span className='text-xs uppercase tracking-wide text-amber-600 dark:text-amber-200'>Accuracy</span>
                    <span className='text-lg font-semibold text-amber-700 dark:text-amber-100'>
                      {formatAccuracy(area.accuracy)}
                    </span>
                  </div>
                  <div className='text-muted-foreground text-xs'>Goal: reach 80%+ with focused practice</div>
                </div>

                <div className='rounded-xl bg-background/70 p-3 text-sm shadow-sm'>
                  <p className='leading-relaxed text-muted-foreground'>{area.recommendation}</p>
                </div>

                {area.citation && (
                  <motion.a
                    href={area.citation}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80'
                    whileHover={{ x: prefersReducedMotion ? 0 : 4 }}
                  >
                    Deep dive guidance <ArrowSquareOutIcon className='h-4 w-4' weight='fill' />
                  </motion.a>
                )}
              </div>
            </motion.article>
          );
        })}
      </motion.div>
    </motion.section>
  );
}
