import { useEffect, useState } from "react";
import { EAnimationDuration, EAnimationTranslate, EAnimationScale, ANIMATION_EASING } from "@/types/app.types";

// Re-export for convenience
export { EAnimationDuration, EAnimationTranslate, EAnimationScale, ANIMATION_EASING };

/**
 * Hook to detect if user prefers reduced motion.
 * Returns true if prefers-reduced-motion is set to "reduce".
 *
 * @returns boolean - true if reduced motion is preferred
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (client-side only)
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Common animation variants for question transitions.
 * Includes reduced motion fallbacks.
 */
export const questionTransitionVariants = {
  /** Initial state when entering */
  enter: (prefersReducedMotion: boolean) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : EAnimationTranslate.SMALL,
  }),
  /** Active state (fully visible) */
  center: {
    opacity: 1,
    y: 0,
  },
  /** Exit state when leaving */
  exit: (prefersReducedMotion: boolean) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : -EAnimationTranslate.SMALL,
  }),
};

/**
 * Transition config for question changes.
 * Exit: 180ms, Enter: 200ms with 50ms delay.
 */
export const questionTransition = (prefersReducedMotion: boolean) => ({
  enter: {
    duration: prefersReducedMotion ? 0.1 : EAnimationDuration.MODERATE,
    delay: prefersReducedMotion ? 0 : 0.05,
    ease: ANIMATION_EASING.easeOut,
  },
  exit: {
    duration: prefersReducedMotion ? 0.1 : EAnimationDuration.BASE,
    ease: ANIMATION_EASING.easeOut,
  },
});

/**
 * Stagger children animation for lists.
 * Used for review list items.
 */
export const staggerChildrenVariants = {
  hidden: { opacity: 0 },
  visible: (prefersReducedMotion: boolean) => ({
    opacity: 1,
    transition: {
      staggerChildren: prefersReducedMotion ? 0 : 0.02, // 20ms between items
      delayChildren: 0,
    },
  }),
};

/**
 * Individual item animation for staggered lists.
 */
export const staggerItemVariants = {
  hidden: (prefersReducedMotion: boolean) => ({
    opacity: 0,
    y: prefersReducedMotion ? 0 : -EAnimationTranslate.MEDIUM,
  }),
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: EAnimationDuration.MODERATE,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

/**
 * Results summary orchestrated reveal sequence.
 * Total orchestration: ~600ms.
 */
export const resultsOrchestrationVariants = {
  /** Score card (step 1) */
  scoreCard: (prefersReducedMotion: boolean) => ({
    initial: {
      opacity: 0,
      scale: prefersReducedMotion ? 1 : EAnimationScale.ENTER,
    },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: prefersReducedMotion ? 0.15 : 0.28,
        ease: ANIMATION_EASING.easeOut,
      },
    },
  }),
  /** Celebration message (step 2) */
  message: (prefersReducedMotion: boolean) => ({
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: prefersReducedMotion ? 0.1 : EAnimationDuration.MODERATE,
        delay: prefersReducedMotion ? 0 : 0.1,
      },
    },
  }),
  /** Breakdown sections (step 3) - staggered */
  section: (index: number, prefersReducedMotion: boolean) => ({
    initial: {
      opacity: 0,
      y: prefersReducedMotion ? 0 : -EAnimationTranslate.MEDIUM,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.15 : EAnimationDuration.MODERATE,
        delay: prefersReducedMotion ? 0 : 0.2 + index * 0.08, // 80ms stagger
        ease: ANIMATION_EASING.easeOut,
      },
    },
  }),
};
