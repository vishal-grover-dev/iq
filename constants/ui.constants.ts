/**
 * UI-related constants
 *
 * Contains constants for UI labels, button text, form elements, and other UI-related strings.
 */

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
