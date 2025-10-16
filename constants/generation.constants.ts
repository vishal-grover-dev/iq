/**
 * Generation-related constants
 *
 * Contains simple constants for MCQ generation and AI functionality that don't require enums.
 */

/**
 * OpenAI API configuration
 */
export const OPENAI_CONFIG = {
  EMBEDDING_MODEL: "text-embedding-3-small",
  CHAT_MODEL: "gpt-4o-mini",
  EMBEDDING_DIMENSIONS: 1536,
  MAX_BATCH_SIZE: 256,
  DEFAULT_BATCH_SIZE: 64,
  MAX_RETRIES: 2,
  DEFAULT_TRUNCATE_CHARS: 8000,
} as const;

/**
 * MCQ generation limits
 */
export const MCQ_GENERATION_LIMITS = {
  MIN_CODE_LINES: 3,
  MAX_CODE_LINES: 50,
  MAX_NEGATIVE_EXAMPLES: 8,
  MAX_CONTEXT_ITEMS: 8,
  MAX_EXAMPLES_COUNT: 10,
} as const;

/**
 * Prompt template configuration
 */
export const PROMPT_CONFIG = {
  MAX_QUESTION_LENGTH: 1000,
  MAX_EXPLANATION_LENGTH: 500,
  MAX_OPTIONS_COUNT: 4,
  MIN_OPTIONS_COUNT: 4,
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * API response structure keys
 */
export const API_RESPONSE_KEYS = {
  DATA: "data",
  ERROR: "error",
  MESSAGE: "message",
  DETAILS: "details",
  STATUS: "status",
  SUCCESS: "success",
} as const;

/**
 * Content types
 */
export const CONTENT_TYPES = {
  JSON: "application/json",
  FORM_DATA: "multipart/form-data",
  TEXT_PLAIN: "text/plain",
  TEXT_HTML: "text/html",
} as const;

/**
 * Validation error types
 */
export const VALIDATION_ERRORS = {
  REQUIRED_FIELD: "This field is required",
  INVALID_EMAIL: "Invalid email format",
  INVALID_URL: "Invalid URL format",
  MIN_LENGTH: "Minimum length not met",
  MAX_LENGTH: "Maximum length exceeded",
  INVALID_NUMBER: "Invalid number format",
  INVALID_DATE: "Invalid date format",
  INVALID_ENUM_VALUE: "Invalid enum value",
} as const;

/**
 * AI service error messages
 */
export const AI_SERVICE_ERRORS = {
  MISSING_API_KEY: "Missing OPENAI_API_KEY",
  EMBEDDINGS_COUNT_MISMATCH: "OpenAI embeddings count mismatch for batch",
  EMBEDDINGS_FAILED: "OpenAI embeddings failed",
} as const;

/**
 * OpenAI prompt templates
 */
export const OPENAI_PROMPTS = {
  RERANKER_SYSTEM:
    "You are a reranking engine. Given a query and a list of passages, return strict JSON { items: [{ index, score }] } where index refers to the passage index and score is higher for more relevant passages. Do not include any other keys.",
  LABELER_SYSTEM: "You are a labeling classifier for documentation.",
} as const;

/**
 * MCQ prompt templates
 */
export const MCQ_PROMPT_TEMPLATES = {
  GENERATOR_SYSTEM_INTRO: "You generate high-quality multiple-choice questions (MCQs) with citations.",
  RULES_HEADER: "Rules:",
  NEGATIVE_EXAMPLES_INTRO: "Avoid generating MCQs similar to the following question gists:",
  CONTEXT_HEADER: "Context (use for grounding and citations):",
  CODING_TASK_INSTRUCTION:
    "Task: Generate ONE coding MCQ. MUST include a fenced code block (```js``` or ```tsx```) in the dedicated 'code' field (3–50 lines). Do NOT place the code in the question; reference the snippet in prose. Ask about behavior/bugs/fixes.",
  STANDARD_TASK_INSTRUCTION: "Task: Generate one MCQ adhering to labels and grounded in the context.",
} as const;
