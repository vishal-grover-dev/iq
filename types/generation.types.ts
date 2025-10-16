/**
 * Generation-related types and enums
 *
 * Contains enums and types for MCQ generation, AI prompts, and related functionality.
 */

/**
 * AI prompt template types
 */
export enum EMcqPromptTemplates {
  GENERATOR_SYSTEM_INTRO = "You generate high-quality multiple-choice questions (MCQs) with citations.",
  RULES_HEADER = "Rules:",
  NEGATIVE_EXAMPLES_INTRO = "Avoid generating MCQs similar to the following question gists:",
  CONTEXT_HEADER = "Context (use for grounding and citations):",
  CODING_TASK_INSTRUCTION = "Task: Generate ONE coding MCQ. MUST include a fenced code block (```js``` or ```tsx```) in the dedicated 'code' field (3–50 lines). Do NOT place the code in the question; reference the snippet in prose. Ask about behavior/bugs/fixes.",
  REVISER_SYSTEM_INTRO = "You are an expert MCQ reviser. Your task is to modify an existing multiple-choice question based on user instructions.",
  JUDGE_SYSTEM_INTRO = "You are an MCQ quality judge. Evaluate clarity, correctness, option plausibility, single correct answer, appropriate difficulty and Bloom level, presence of citations grounded in context, and DUPLICATE RISK.",
  JUDGE_VERDICT_FORMAT = "Return STRICT JSON: { verdict: 'approve' | 'revise', reasons: string[], suggestions?: string[] }",
}

/**
 * OpenAI model names
 */
export enum EOpenAIModels {
  TEXT_EMBEDDING_SMALL = "text-embedding-3-small",
  GPT_4O_MINI = "gpt-4o-mini",
}

/**
 * OpenAI error messages
 */
export enum EOpenAIErrorMessages {
  MISSING_API_KEY = "Missing OPENAI_API_KEY",
  EMBEDDINGS_COUNT_MISMATCH = "OpenAI embeddings count mismatch for batch",
  EMBEDDINGS_FAILED = "OpenAI embeddings failed",
  GENERATION_FAILED = "OpenAI generation failed",
  RERANKING_FAILED = "OpenAI reranking failed",
  CLASSIFICATION_FAILED = "OpenAI classification failed",
}

/**
 * Generation API error messages
 */
export enum EGenerationApiErrorMessages {
  FAILED_TO_GENERATE_MCQ = "Failed to generate MCQ",
  FAILED_TO_SAVE_MCQ = "Failed to save MCQ",
  INVALID_QUESTION_FORMAT = "Invalid question format",
  DUPLICATE_QUESTION = "Question already exists",
  MISSING_REQUIRED_FIELDS = "Missing required fields",
}

/**
 * Ingestion API error messages
 */
export enum EIngestionApiErrorMessages {
  INVALID_INGESTION_TYPE = "Invalid ingestion type",
  INVALID_URL = "Invalid URL",
  CRAWL_FAILED = "Crawl failed",
  PROCESSING_FAILED = "Processing failed",
  INVALID_TOPIC = "Invalid topic",
  INVALID_SUBTOPIC = "Invalid subtopic",
  MAX_PAGES_EXCEEDED = "Maximum pages exceeded",
  INVALID_DEPTH = "Invalid crawl depth",
}

/**
 * Retrieval API error messages
 */
export enum ERetrievalApiErrorMessages {
  FAILED_TO_RETRIEVE_CONTEXT = "Failed to retrieve context",
  INVALID_QUERY = "Invalid query",
  NO_RESULTS_FOUND = "No results found",
  EMBEDDING_FAILED = "Embedding generation failed",
}

/**
 * Common API error messages
 */
export enum EApiErrorMessages {
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",
  NOT_FOUND = "Not found",
  INTERNAL_SERVER_ERROR = "Internal server error",
  BAD_REQUEST = "Bad request",
  VALIDATION_ERROR = "Validation error",
}

/**
 * Authentication-related error messages
 */
export enum EAuthErrorMessages {
  AUTHENTICATION_REQUIRED = "Authentication required",
  INVALID_CREDENTIALS = "Invalid credentials",
  TOKEN_EXPIRED = "Token expired",
  ACCESS_DENIED = "Access denied",
}

/**
 * Database operation error messages
 */
export enum EDatabaseErrorMessages {
  CONNECTION_FAILED = "Database connection failed",
  QUERY_FAILED = "Database query failed",
  TRANSACTION_FAILED = "Database transaction failed",
  CONSTRAINT_VIOLATION = "Database constraint violation",
  DUPLICATE_KEY = "Duplicate key violation",
}
