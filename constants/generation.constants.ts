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
 * AI service error messages
 */
export const AI_SERVICE_ERRORS = {
  MISSING_API_KEY: "Missing OPENAI_API_KEY",
  EMBEDDINGS_COUNT_MISMATCH: "OpenAI embeddings count mismatch for batch",
  EMBEDDINGS_FAILED: "OpenAI embeddings failed",
  GENERATION_FAILED: "OpenAI generation failed",
  RERANKING_FAILED: "OpenAI reranking failed",
  CLASSIFICATION_FAILED: "OpenAI classification failed",
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
export const MCQ_PROMPTS = {
  GENERATOR_SYSTEM_INTRO: "You generate high-quality multiple-choice questions (MCQs) with citations.",
  RULES_HEADER: "Rules:",
  NEGATIVE_EXAMPLES_INTRO: "Avoid generating MCQs similar to the following question gists:",
  CONTEXT_HEADER: "Context (use for grounding and citations):",
  CODING_TASK_INSTRUCTION:
    "Task: Generate ONE coding MCQ. MUST include a fenced code block (```js``` or ```tsx```) in the dedicated 'code' field (3–50 lines). Do NOT place the code in the question; reference the snippet in prose. Ask about behavior/bugs/fixes.",
  STANDARD_TASK_INSTRUCTION: "Task: Generate one MCQ adhering to labels and grounded in the context.",
  REVISER_SYSTEM_INTRO:
    "You are an expert MCQ reviser. Your task is to modify an existing multiple-choice question based on user instructions.",
  JUDGE_SYSTEM_INTRO:
    "You are an MCQ quality judge. Evaluate clarity, correctness, option plausibility, single correct answer, appropriate difficulty and Bloom level, presence of citations grounded in context, and DUPLICATE RISK.",
  JUDGE_VERDICT_FORMAT:
    "Return STRICT JSON: { verdict: 'approve' | 'revise', reasons: string[], suggestions?: string[] }",
} as const;

/**
 * MCQ generation page labels
 */
export const MCQ_PAGE_LABELS = {
  CODING_QUESTIONS_CHECKBOX: "Coding questions",
  NEXT_BUTTON: "Next",
  SUBMIT_AND_NEXT_BUTTON: "Submit and Next",
  GENERATE_BUTTON_LOADING: "Generating...",
  SAVE_BUTTON_LOADING: "Saving...",
  AUTOMATE_BUTTON: "Automate generation",
} as const;

/**
 * MCQ generation toast messages
 */
export const MCQ_PAGE_TOAST_MESSAGES = {
  QUESTION_SAVED: "Saved question",
  QUESTION_SAVE_FAILED: "Failed to save",
  NEXT_LOADED: "Loaded next question",
  NEXT_FAILED: "Failed to generate next",
  QUESTION_REVISED: "Question revised successfully",
  REVISION_FAILED: "Failed to revise question",
  PLACEHOLDER_GENERATED: "Generated next (placeholder)",
} as const;

/**
 * Revision box labels
 */
export const REVISION_BOX_LABELS = {
  PLACEHOLDER: "Ask to tweak wording, difficulty, Bloom level, or options…",
  SEND_BUTTON: "Send",
  REVISING_BUTTON: "Revising…",
  ARIA_LABEL: "Revision instruction",
} as const;

/**
 * Automation modal labels
 */
export const AUTOMATION_MODAL_LABELS = {
  DIALOG_TITLE: "Automate generation",
  TARGET_COUNT_LABEL: "Target count",
  SENSITIVITY_LABEL: "Near-duplicate sensitivity",
  COVERAGE_LABEL: "Coverage (subtopic × difficulty × Bloom)",
  COVERAGE_PLACEHOLDER: "Placeholder coverage grid. Will fetch counts from mcq_items.",
  CLOSE_BUTTON: "Close",
  START_BUTTON: "Start",
} as const;

/**
 * Automation modal select options
 */
export const AUTOMATION_MODAL_OPTIONS = {
  TARGET_COUNTS: ["25", "50", "100"] as const,
  SENSITIVITY_LEVELS: ["Strict", "Standard", "Lenient"] as const,
} as const;

/**
 * Persona panel labels
 */
export const PERSONA_PANEL_LABELS = {
  HEADING: "Personas",
  GENERATION_LABEL: "Generation",
  JUDGE_LABEL: "Judge",
  FINALIZED_LABEL: "Finalized",
  WAITING_STATUS: "waiting…",
  PENDING_STATUS: "pending…",
} as const;
