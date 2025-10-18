/**
 * Theme-related constants
 *
 * Contains constants for theme functionality that don't require enums.
 */

/**
 * Theme configuration
 */
export const THEME_CONFIG = {
  LABELS: {
    SWITCH_TO_LIGHT: "Switch to light mode",
    SWITCH_TO_DARK: "Switch to dark mode",
    LIGHT_MODE: "Light mode",
    DARK_MODE: "Dark mode",
  },
  VALUES: {
    LIGHT: "light",
    DARK: "dark",
    SYSTEM: "system",
  },
  CLASSES: {
    LIGHT: "light",
    DARK: "dark",
  },
  STORAGE: {
    KEY: "theme",
  },
} as const;
