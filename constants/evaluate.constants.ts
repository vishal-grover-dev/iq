/**
 * Evaluation-related constants
 *
 * Contains simple constants for evaluation functionality that don't require enums.
 */

import { EResultsPageLabels, EWeakAreaLabels } from "@/types/evaluate.types";

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
    TITLE: EResultsPageLabels.EXPERT_TIER,
    HEADLINE: EResultsPageLabels.EXPERT_HEADLINE,
    DESCRIPTION: EResultsPageLabels.EXPERT_DESCRIPTION,
    ACCENT_CLASS: "text-emerald-400",
    BADGE_CLASS: "bg-emerald-500/15 text-emerald-300",
    GRADIENT_CLASS: "from-emerald-500/20 via-emerald-500/10 to-sky-500/0",
  },
  PROFICIENT: {
    TITLE: EResultsPageLabels.PROFICIENT_TIER,
    HEADLINE: EResultsPageLabels.PROFICIENT_HEADLINE,
    DESCRIPTION: EResultsPageLabels.PROFICIENT_DESCRIPTION,
    ACCENT_CLASS: "text-teal-300",
    BADGE_CLASS: "bg-teal-500/15 text-teal-200",
    GRADIENT_CLASS: "from-teal-500/15 via-cyan-500/10 to-transparent",
  },
  DEVELOPING: {
    TITLE: EResultsPageLabels.DEVELOPING_TIER,
    HEADLINE: EResultsPageLabels.DEVELOPING_HEADLINE,
    DESCRIPTION: EResultsPageLabels.DEVELOPING_DESCRIPTION,
    ACCENT_CLASS: "text-amber-300",
    BADGE_CLASS: "bg-amber-500/15 text-amber-200",
    GRADIENT_CLASS: "from-amber-500/15 via-orange-500/10 to-transparent",
  },
  GETTING_STARTED: {
    TITLE: EResultsPageLabels.GETTING_STARTED_TIER,
    HEADLINE: EResultsPageLabels.GETTING_STARTED_HEADLINE,
    DESCRIPTION: EResultsPageLabels.GETTING_STARTED_DESCRIPTION,
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
 * Results page loading and error states
 */
export const RESULTS_PAGE_STATES = {
  LOADING_RESULTS: "Loading results...",
  FAILED_TO_LOAD_RESULTS: "Failed to load results",
  RESULTS_NOT_FOUND: "Results not found",
  RETURN_TO_EVALUATE_BUTTON: "Return to Evaluate",
} as const;

/**
 * Weak area accuracy tiers
 */
export const WEAK_AREA_ACCURACY_TIERS = [
  { THRESHOLD: 0.5, TONE: "critical", LABEL: EWeakAreaLabels.CRITICAL_LEVEL },
  { THRESHOLD: 0.7, TONE: "caution", LABEL: EWeakAreaLabels.NEEDS_FOCUS },
  { THRESHOLD: 0.85, TONE: "watch", LABEL: EWeakAreaLabels.MONITOR_LEVEL },
] as const;

/**
 * Confetti colors for celebration
 */
export const CONFETTI_COLORS = ["#34d399", "#22c55e", "#fde047", "#38bdf8", "#f97316"] as const;

/**
 * Question selection and similarity configuration
 */
export const EVALUATE_SELECTION_CONFIG = {
  // Similarity thresholds for duplicate detection
  SIMILARITY: {
    ATTEMPT_THRESHOLD: 0.85, // Similarity check threshold for questions already asked in attempt
    BANK_THRESHOLD_HIGH: 0.92, // High similarity threshold for bank candidates
    BANK_THRESHOLD_MEDIUM: 0.85, // Medium similarity threshold for bank candidates
    TEXT_SIMILARITY_JACCARD_THRESHOLD: 0.7, // Jaccard similarity for text-based comparison
  },

  // Penalty scores applied to candidates for similarity issues
  PENALTIES: {
    BANK_SIMILARITY_HIGH: 50, // High penalty for high similarity to attempt questions
    BANK_SIMILARITY_MEDIUM: 25, // Medium penalty for medium similarity to attempt questions
    BANK_NEIGHBOR_HIGH: 30, // High penalty for high similarity to other questions
    BANK_NEIGHBOR_MEDIUM: 15, // Medium penalty for medium similarity to other questions
    CROSS_ATTEMPT_FRESHNESS: 15, // Penalty for questions seen recently in other attempts
  },

  // Topic balance configuration
  TOPIC_BALANCE: {
    LIMIT: 24, // Maximum questions from a single topic (40% of 60)
    EARLY_STAGE_CAP: 18, // Early attempt cap (≤20 questions): 30% of 60
    MID_STAGE_CAP: 24, // Mid attempt cap (21-40 questions): 40% of 60
    EARLY_STAGE_THRESHOLD: 20, // Number of questions to consider "early stage"
    MID_STAGE_THRESHOLD: 40, // Number of questions to consider "mid stage"
    EARLY_PENALTY: 40, // Penalty for exceeding early stage cap
    MID_PENALTY: 25, // Penalty for exceeding mid stage cap
  },

  // Scoring boosts for candidate preferences
  CANDIDATE_SCORING: {
    TOPIC_BOOST: 50, // Boost for preferred topic match
    SUBTOPIC_BOOST: 30, // Boost for preferred subtopic match
    BLOOM_BOOST: 20, // Boost for preferred Bloom level match
    CODING_BOOST: 40, // Boost for coding mode match when requested
    TOPK_COUNT: 8, // Number of top candidates for stochastic selection
  },

  // MCQ generation configuration
  GENERATION: {
    MAX_ATTEMPTS: 3, // Maximum generation retry attempts
    INITIAL_ATTEMPT: 1, // First attempt number
    RELAXATION_STEPS: 2, // Number of relaxation steps before max attempts
    NEGATIVE_EXAMPLES_LIMIT: 25, // Maximum negative examples to maintain
    NEGATIVE_EXAMPLES_LOOKAHEAD: 20, // Questions to look back for negative examples
    NEIGHBOR_TOPK: 8, // Number of neighbors to check during generation
    NEIGHBOR_HIGH_SIMILARITY_THRESHOLD: 0.92, // Threshold for neighbor similarity gate
  },

  // Assignment retry configuration
  ASSIGNMENT: {
    MAX_RETRIES: 3, // Maximum retry attempts for question assignment
    INITIAL_RETRY: 0, // Starting retry count
    EXPONENTIAL_BACKOFF_BASE_MS: 100, // Base milliseconds for exponential backoff (100ms, 200ms, 400ms)
  },

  // Bank query configuration
  BANK_QUERY: {
    LIMIT: 20, // Candidate pool size to query from bank
  },

  // Recent questions tracking for cross-attempt freshness
  RECENT_ATTEMPTS: {
    LOOK_BACK_COUNT: 2, // Number of recent completed attempts to check for freshness
  },
} as const;
