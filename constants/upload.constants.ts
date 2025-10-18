/**
 * Upload-related constants
 *
 * Contains labels, placeholders, toast messages, and status messages for upload flows.
 */

/**
 * Upload page labels
 */
export const UPLOAD_PAGE_LABELS = {
  TITLE: "Ingest Sources",
  DESCRIPTION: "Add documentation sources for interview streams or upload academic PDFs.",
} as const;

/**
 * Upload form labels
 */
export const UPLOAD_FORM_LABELS = {
  CONTENT_CATEGORY_LABEL: "Content category",
  SUBMIT_BUTTON: "Submit",
  PLACEHOLDER_CATEGORY: "Select category",
  SEARCH_PLACEHOLDER: "Search category...",
  EMPTY_MESSAGE: "No category found.",
} as const;

/**
 * Upload toast messages
 */
export const UPLOAD_TOAST_MESSAGES = {
  INGESTIONS_STARTED: "Ingestions started. Tracking progress…",
  INGESTION_FAILED: "Failed to create ingestion(s)",
  UPLOAD_COMPLETED: "Upload completed.",
  ERROR_GENERIC: "Something went wrong. Please retry.",
} as const;

/**
 * Upload status messages
 */
export const UPLOAD_STATUS_MESSAGES = {
  COMPLETED: "Upload completed.",
  FAILED: "Something went wrong. Please retry.",
} as const;

/**
 * Completion modal labels
 */
export const COMPLETION_MODAL_LABELS = {
  DIALOG_TITLE: "Indexing completed",
  DIALOG_DESCRIPTION: "Embeddings generated for the following topics and subtopics.",
  EMBEDDINGS_GENERATED: "Embeddings generated for:",
  TOPICS_LABEL: "Topics",
  SUBTOPICS_LABEL: "Subtopics",
} as const;
