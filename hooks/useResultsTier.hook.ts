import { useMemo } from "react";
import { RESULT_TIER_CONFIGS } from "@/constants/evaluate.constants";
import { MedalIcon, TargetIcon, ChartLineUpIcon, RocketLaunchIcon } from "@phosphor-icons/react/dist/ssr";
import type { TResultTier } from "@/types/evaluate.types";

interface ITierConfig {
  title: string;
  headline: string;
  description: string;
  accentClass: string;
  badgeClass: string;
  gradientClass: string;
  icon: typeof MedalIcon;
}

const TIER_CONFIG: Record<TResultTier, ITierConfig> = {
  expert: {
    title: RESULT_TIER_CONFIGS.EXPERT.TITLE,
    headline: RESULT_TIER_CONFIGS.EXPERT.HEADLINE,
    description: RESULT_TIER_CONFIGS.EXPERT.DESCRIPTION,
    accentClass: RESULT_TIER_CONFIGS.EXPERT.ACCENT_CLASS,
    badgeClass: RESULT_TIER_CONFIGS.EXPERT.BADGE_CLASS,
    gradientClass: RESULT_TIER_CONFIGS.EXPERT.GRADIENT_CLASS,
    icon: MedalIcon,
  },
  proficient: {
    title: RESULT_TIER_CONFIGS.PROFICIENT.TITLE,
    headline: RESULT_TIER_CONFIGS.PROFICIENT.HEADLINE,
    description: RESULT_TIER_CONFIGS.PROFICIENT.DESCRIPTION,
    accentClass: RESULT_TIER_CONFIGS.PROFICIENT.ACCENT_CLASS,
    badgeClass: RESULT_TIER_CONFIGS.PROFICIENT.BADGE_CLASS,
    gradientClass: RESULT_TIER_CONFIGS.PROFICIENT.GRADIENT_CLASS,
    icon: TargetIcon,
  },
  developing: {
    title: RESULT_TIER_CONFIGS.DEVELOPING.TITLE,
    headline: RESULT_TIER_CONFIGS.DEVELOPING.HEADLINE,
    description: RESULT_TIER_CONFIGS.DEVELOPING.DESCRIPTION,
    accentClass: RESULT_TIER_CONFIGS.DEVELOPING.ACCENT_CLASS,
    badgeClass: RESULT_TIER_CONFIGS.DEVELOPING.BADGE_CLASS,
    gradientClass: RESULT_TIER_CONFIGS.DEVELOPING.GRADIENT_CLASS,
    icon: ChartLineUpIcon,
  },
  getting_started: {
    title: RESULT_TIER_CONFIGS.GETTING_STARTED.TITLE,
    headline: RESULT_TIER_CONFIGS.GETTING_STARTED.HEADLINE,
    description: RESULT_TIER_CONFIGS.GETTING_STARTED.DESCRIPTION,
    accentClass: RESULT_TIER_CONFIGS.GETTING_STARTED.ACCENT_CLASS,
    badgeClass: RESULT_TIER_CONFIGS.GETTING_STARTED.BADGE_CLASS,
    gradientClass: RESULT_TIER_CONFIGS.GETTING_STARTED.GRADIENT_CLASS,
    icon: RocketLaunchIcon,
  },
};

function getTierFromScore(score: number): TResultTier {
  if (score >= 90) return "expert";
  if (score >= 75) return "proficient";
  if (score >= 50) return "developing";
  return "getting_started";
}

export function useResultsTier(score: number) {
  const tier = useMemo(() => getTierFromScore(score), [score]);
  const tierConfig = useMemo(() => TIER_CONFIG[tier], [tier]);
  const showConfetti = useMemo(() => tier === "expert" && score >= 90, [tier, score]);

  return { tier, tierConfig, showConfetti };
}
