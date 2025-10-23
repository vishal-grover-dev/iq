/**
 * Generation-related types and enums
 *
 * Contains enums and types for MCQ generation, AI prompts, and related functionality.
 */

import type { IMcqItemView } from "./mcq.types";

/**
 * MCQ generation request parameters
 */
export type TMcqGenerationRequest = {
  topic?: string;
  subtopic?: string | null;
  version?: string | null;
  codingMode?: boolean;
};

/**
 * Document with labels from ingestion
 */
export type TDocumentWithLabels = {
  id: string;
  labels: Record<string, unknown>;
  ingestion_id: string;
};

/**
 * MCQ revision request parameters
 */
export type TMcqRevisionRequest = {
  instruction: string;
  currentMcq: IMcqItemView;
};

/**
 * RPC context result from retrieval
 */
export type TRpcContextResult = {
  title: string | null;
  path: string;
  content: string;
};

/**
 * MCQ save request - accepts either wrapped item or direct MCQItemView
 */
export type TMcqSaveRequest = {
  item?: IMcqItemView;
  requireCode?: boolean;
} & IMcqItemView;

/**
 * Fused retrieval result from hybrid search RPC
 */
export interface IRetrievalResult {
  document_id: string;
  chunk_index: number;
  content: string;
  tokens: number;
  score: number;
  title: string | null;
  bucket: string;
  path: string;
}

/**
 * SSE event names for MCQ generation pipeline
 */
export type TSseEventName =
  | "generation_started"
  | "generation_complete"
  | "neighbors"
  | "judge_started"
  | "judge_result"
  | "finalized"
  | "error";

/**
 * Arguments for orchestrating MCQ generation SSE
 */
export interface IOrchestrateArgs {
  userId: string;
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  codingMode?: boolean;
  maxNeighbors?: number;
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
