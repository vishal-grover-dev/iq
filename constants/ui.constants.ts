/**
 * UI-related constants
 *
 * Consolidated file containing constants for UI labels, theme, footer, button text,
 * form elements, and other UI-related strings.
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

/**
 * Footer configuration
 */
export const FOOTER_CONFIG = {
  AUTHOR: {
    NAME: "Vishal Grover",
    LINKEDIN: "https://www.linkedin.com/in/vishal-grover/",
    LINK_ARIA_LABEL: "Open Vishal Grover's LinkedIn profile",
  },
  COPY: {
    MADE_WITH_LOVE_PREFIX: "Made with",
    LOCATION_SUFFIX: "in India",
  },
  ICONS: {
    HEART_EMOJI: "❤️",
  },
} as const;

/**
 * Common UI labels used across components
 */
export const COMMON_LABELS = {
  LOADING: "Loading...",
  ERROR: "Error",
  SUCCESS: "Success",
  CANCEL: "Cancel",
  CONFIRM: "Confirm",
  SAVE: "Save",
  DELETE: "Delete",
  EDIT: "Edit",
  CLOSE: "Close",
  BACK: "Back",
  NEXT: "Next",
  PREVIOUS: "Previous",
  RETRY: "Retry",
  REFRESH: "Refresh",
} as const;

/**
 * Form-related labels
 */
export const FORM_LABELS = {
  REQUIRED: "Required",
  OPTIONAL: "Optional",
  SUBMIT: "Submit",
  RESET: "Reset",
  VALIDATION_ERROR: "Validation error",
  FIELD_REQUIRED: "This field is required",
} as const;

/**
 * Status and progress labels
 */
export const STATUS_LABELS = {
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PENDING: "Pending",
  PROCESSING: "Processing...",
  SUCCESS: "Success",
} as const;

/**
 * Accessibility labels
 */
export const ACCESSIBILITY_LABELS = {
  SKIP_TO_CONTENT: "Skip to content",
  OPEN_MENU: "Open menu",
  CLOSE_MENU: "Close menu",
  TOGGLE_THEME: "Toggle theme",
  LOADING_CONTENT: "Loading content",
} as const;
