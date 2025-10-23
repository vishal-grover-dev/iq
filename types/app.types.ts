export enum ETheme {
  LIGHT = "light",
  DARK = "dark",
}

export type TResolvedTheme = ETheme.LIGHT | ETheme.DARK;

export interface IThemeContextValue {
  theme: ETheme;
  resolvedTheme: TResolvedTheme;
  setTheme: (theme: ETheme) => void;
  toggleTheme: () => void;
}

/**
 * Animation duration values in seconds (for Framer Motion).
 * Follows the evaluate page animation spec.
 */
export enum EAnimationDuration {
  /** Fast transitions (120ms) - micro-interactions, hover states */
  FAST = 0.12,
  /** Base transitions (180ms) - standard UI transitions, button clicks */
  BASE = 0.18,
  /** Moderate transitions (250ms) - question transitions, list items */
  MODERATE = 0.25,
  /** Slow transitions (400ms) - charts, scroll animations */
  SLOW = 0.4,
  /** Orchestration delay (600ms) - total time for multi-step reveals */
  ORCHESTRATION = 0.6,
}

/**
 * Animation translate distances in pixels.
 */
export enum EAnimationTranslate {
  /** Small distance for subtle movement */
  SMALL = 8,
  /** Medium distance for noticeable transitions */
  MEDIUM = 12,
}

/**
 * Animation scale values for hover/active states.
 */
export enum EAnimationScale {
  /** Slight scale down for click feedback */
  DOWN = 0.96,
  /** Slight scale up for hover emphasis */
  UP = 1.01,
  /** Scale for enter animations */
  ENTER = 0.95,
}

/**
 * Animation easing presets (cubic bezier arrays for Framer Motion).
 * Cannot be enums due to array values.
 */
export const ANIMATION_EASING = {
  /** Ease out - snappy, natural feel for most transitions */
  easeOut: [0.4, 0, 0.2, 1] as const,
  /** Ease in-out - smooth, balanced for dialogs and modals */
  easeInOut: [0.4, 0, 0.6, 1] as const,
  /** Ease in - subtle entrance */
  easeIn: [0.4, 0, 1, 1] as const,
} as const;

// API Response & Data Types
export interface IApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface IPaginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type TResult<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Error Types
export type TDomainError =
  | { kind: "ValidationError"; details: string }
  | { kind: "NotFound"; resource: string }
  | { kind: "ExternalServiceError"; service: string; message: string }
  | { kind: "Unknown"; message: string };
