/**
 * Evaluation-related constants
 *
 * Contains simple constants for evaluation functionality that don't require enums.
 */

/**
 * Evaluation configuration
 */
export const EVALUATION_CONFIG = {
  TOTAL_QUESTIONS: 60,
  EASY_QUESTIONS: 30,
  MEDIUM_QUESTIONS: 20,
  HARD_QUESTIONS: 10,
  MIN_CODING_QUESTIONS: 21, // 35% of 60
  MAX_TOPIC_PERCENTAGE: 40, // No single topic exceeds 40%
} as const;

/**
 * Progress calculation
 */
export const PROGRESS_CONFIG = {
  PROGRESS_BAR_HEIGHT: 2,
  PROGRESS_TRANSITION_DURATION: 300,
} as const;

/**
 * Results tier thresholds
 */
export const RESULTS_THRESHOLDS = {
  EXPERT: 85,
  PROFICIENT: 70,
  DEVELOPING: 50,
  GETTING_STARTED: 0,
} as const;

/**
 * Weak area priority thresholds
 */
export const WEAK_AREA_THRESHOLDS = {
  CRITICAL: 0.7,
  HIGH: 0.85,
  MEDIUM: 1.0,
} as const;

/**
 * CSS classes for result tiers
 */
export const RESULT_TIER_STYLES = {
  EXPERT: {
    ACCENT_CLASS: "text-emerald-400",
    BADGE_CLASS: "bg-emerald-500/15 text-emerald-300",
  },
  PROFICIENT: {
    ACCENT_CLASS: "text-blue-400",
    BADGE_CLASS: "bg-blue-500/15 text-blue-300",
  },
  DEVELOPING: {
    ACCENT_CLASS: "text-amber-400",
    BADGE_CLASS: "bg-amber-500/15 text-amber-300",
  },
  GETTING_STARTED: {
    ACCENT_CLASS: "text-red-400",
    BADGE_CLASS: "bg-red-500/15 text-red-300",
  },
} as const;

/**
 * Weak area styling
 */
export const WEAK_AREA_STYLES = {
  CRITICAL: {
    BADGE: "bg-red-600 text-white shadow-sm",
    GLOW: "from-rose-500/20 via-orange-500/10 to-transparent",
    BORDER: "border-red-500/50",
  },
  HIGH: {
    BADGE: "bg-amber-500/20 text-amber-800 dark:text-amber-100",
    GLOW: "from-amber-500/20 via-yellow-500/10 to-transparent",
    BORDER: "border-amber-500/30",
  },
  MEDIUM: {
    BADGE: "bg-sky-500/15 text-sky-200",
    GLOW: "from-sky-500/20 via-cyan-500/10 to-transparent",
    BORDER: "border-sky-500/25",
  },
} as const;

/**
 * Result tier configurations
 */
export const RESULT_TIER_CONFIGS = {
  EXPERT: {
    TITLE: "Expert Tier",
    HEADLINE: "Outstanding mastery!",
    DESCRIPTION: "You nailed this attempt with interview-ready precision. Keep the momentum going!",
    ACCENT_CLASS: "text-emerald-400",
    BADGE_CLASS: "bg-emerald-500/15 text-emerald-300",
    GRADIENT_CLASS: "from-emerald-500/20 via-emerald-500/10 to-sky-500/0",
  },
  PROFICIENT: {
    TITLE: "Proficient Tier",
    HEADLINE: "You're on track!",
    DESCRIPTION: "Great performance across core topics. A few focused reps will unlock the next tier.",
    ACCENT_CLASS: "text-teal-300",
    BADGE_CLASS: "bg-teal-500/15 text-teal-200",
    GRADIENT_CLASS: "from-teal-500/15 via-cyan-500/10 to-transparent",
  },
  DEVELOPING: {
    TITLE: "Developing Tier",
    HEADLINE: "Solid foundation!",
    DESCRIPTION: "You're building reliable instincts. Tackle the focus areas below to level up fast.",
    ACCENT_CLASS: "text-amber-300",
    BADGE_CLASS: "bg-amber-500/15 text-amber-200",
    GRADIENT_CLASS: "from-amber-500/15 via-orange-500/10 to-transparent",
  },
  GETTING_STARTED: {
    TITLE: "Launch Tier",
    HEADLINE: "Every expert starts here!",
    DESCRIPTION: "Great first step. Follow the curated recommendations to build confidence quickly.",
    ACCENT_CLASS: "text-sky-300",
    BADGE_CLASS: "bg-sky-500/15 text-sky-200",
    GRADIENT_CLASS: "from-sky-500/15 via-indigo-500/10 to-transparent",
  },
} as const;

/**
 * Stat card labels
 */
export const STAT_CARD_LABELS = {
  CORRECT_ANSWERS: "Correct Answers",
  TIME_SPENT: "Time Spent",
  STRONGEST_TOPIC: "Strongest Topic",
  NEXT_FOCUS: "Next Focus",
  QUESTIONS_MASTERED: "Questions mastered",
  FOCUSED_PRACTICE: "Focused practice",
  ACCURACY: "accuracy",
} as const;

/**
 * Weak area accuracy tiers
 */
export const WEAK_AREA_ACCURACY_TIERS = [
  { THRESHOLD: 0.5, TONE: "critical", LABEL: "Critical" },
  { THRESHOLD: 0.7, TONE: "caution", LABEL: "Needs Focus" },
  { THRESHOLD: 0.85, TONE: "watch", LABEL: "Monitor" },
] as const;

/**
 * Confetti colors for celebration
 */
export const CONFETTI_COLORS = ["#34d399", "#22c55e", "#fde047", "#38bdf8", "#f97316"] as const;
