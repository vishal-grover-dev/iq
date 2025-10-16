/**
 * UI-related types and enums
 *
 * Contains enums and types for UI labels, button text, form elements, and other UI-related strings.
 */

/**
 * Common UI labels used across components
 */
export enum ECommonLabels {
  LOADING = "Loading...",
  ERROR = "Error",
  SUCCESS = "Success",
  CANCEL = "Cancel",
  CONFIRM = "Confirm",
  SAVE = "Save",
  DELETE = "Delete",
  EDIT = "Edit",
  CLOSE = "Close",
  BACK = "Back",
  NEXT = "Next",
  PREVIOUS = "Previous",
  RETRY = "Retry",
  REFRESH = "Refresh",
}

/**
 * Form-related labels
 */
export enum EFormLabels {
  REQUIRED = "Required",
  OPTIONAL = "Optional",
  SUBMIT = "Submit",
  RESET = "Reset",
  VALIDATION_ERROR = "Validation error",
  FIELD_REQUIRED = "This field is required",
}

/**
 * Status and progress labels
 */
export enum EStatusLabels {
  IN_PROGRESS = "In Progress",
  COMPLETED = "Completed",
  FAILED = "Failed",
  PENDING = "Pending",
  PROCESSING = "Processing...",
  SUCCESS = "Success",
}

/**
 * Accessibility labels
 */
export enum EAccessibilityLabels {
  SKIP_TO_CONTENT = "Skip to content",
  OPEN_MENU = "Open menu",
  CLOSE_MENU = "Close menu",
  TOGGLE_THEME = "Toggle theme",
  LOADING_CONTENT = "Loading content",
}

/**
 * Button variants for consistent styling
 */
export enum EButtonVariants {
  PRIMARY = "primary",
  SECONDARY = "secondary",
  GHOST = "ghost",
  OUTLINE = "outline",
  DESTRUCTIVE = "destructive",
}

/**
 * Modal and dialog types
 */
export enum EModalTypes {
  CONFIRMATION = "confirmation",
  INFORMATION = "information",
  WARNING = "warning",
  ERROR = "error",
}

/**
 * Toast notification types
 */
export enum EToastTypes {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}
