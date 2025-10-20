"use client";
import { motion } from "framer-motion";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/utils/tailwind.utils";
import { STAT_CARD_LABELS } from "@/constants/evaluate.constants";
import { ANIMATION_EASING } from "@/utils/animation.utils";

interface IResultStatCardProps {
  label: string;
  value: string;
  caption?: string;
  tone?: "positive" | "neutral" | "attention";
}

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

export default function ResultStatCard({ label, value, caption, tone }: IResultStatCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-2xl border bg-background/70 p-4 shadow-sm backdrop-blur",
        tone === "positive" && "border-emerald-500/20",
        tone === "attention" && "border-amber-500/25"
      )}
      variants={statVariants}
    >
      <div className='flex items-center justify-between'>
        <span className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>{label}</span>
        {label === STAT_CARD_LABELS.TIME_SPENT && <ClockIcon className='h-4 w-4 text-muted-foreground/70' />}
      </div>
      <div className='mt-2 text-lg font-semibold md:text-xl capitalize'>{value}</div>
      {caption && <p className='text-muted-foreground mt-1 text-xs'>{caption}</p>}
    </motion.div>
  );
}
