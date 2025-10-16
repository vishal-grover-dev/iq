/**
 * Ingestion-related types and enums
 *
 * Contains types and enums for document ingestion, processing, and management.
 */

/**
 * Ingestion status enum
 */
export enum EIngestionStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

/**
 * Ingestion type enum
 */
export enum EIngestionType {
  REPO = "repo",
  WEB = "web",
  MANUAL = "manual",
}

/**
 * Document processing stage enum
 */
export enum EDocumentProcessingStage {
  FETCHING = "fetching",
  EXTRACTING = "extracting",
  NORMALIZING = "normalizing",
  CHUNKING = "chunking",
  EMBEDDING = "embedding",
  PERSISTING = "persisting",
  COMPLETED = "completed",
}

/**
 * Content extraction method enum
 */
export enum EContentExtractionMethod {
  READABILITY = "readability",
  MARKDOWN = "markdown",
  HTML_PARSER = "html_parser",
  CUSTOM = "custom",
}

/**
 * Chunking strategy enum
 */
export enum EChunkingStrategy {
  RECURSIVE_CHARACTER = "recursive_character",
  SEMANTIC = "semantic",
  FIXED_SIZE = "fixed_size",
  SLIDING_WINDOW = "sliding_window",
}

/**
 * Label confidence level enum
 */
export enum ELabelConfidenceLevel {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  UNKNOWN = "unknown",
}

/**
 * Ingestion metadata interface
 */
export interface IIngestionMetadata {
  totalPlanned?: number;
  processed?: number;
  currentPathOrUrl?: string;
  step?: EDocumentProcessingStage;
  errorsCount?: number;
  lastUpdatedAt?: string;
  batch?: {
    totalPlanned: number;
    nextStart: number;
    batchSize: number;
  };
}

/**
 * Document chunk interface
 */
export interface IDocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokens: number;
  embedding?: number[];
  labels?: Record<string, unknown>;
}

/**
 * Ingestion event interface
 */
export interface IIngestionEvent {
  id: string;
  ingestionId: string;
  stage: EDocumentProcessingStage;
  message: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Label classification result interface
 */
export interface ILabelClassificationResult {
  topic: string;
  subtopic: string | null;
  version: string | null;
  confidence: number;
  method: string;
  hints?: string[];
}
