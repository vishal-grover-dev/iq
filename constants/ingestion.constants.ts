/**
 * Ingestion-related constants
 *
 * Contains constants for document ingestion, processing, and management.
 */

/**
 * Ingestion processing limits
 */
export const INGESTION_LIMITS = {
  MAX_BATCH_SIZE: 200,
  MAX_PAGES_PER_CRAWL: 50,
  MAX_CRAWL_DEPTH: 2,
  MIN_CRAWL_DELAY_MS: 300,
  MAX_CONTENT_LENGTH: 10000,
  MAX_CHUNK_SIZE: 2000,
  CHUNK_OVERLAP_PERCENTAGE: 15,
} as const;

/**
 * Content extraction configuration
 */
export const CONTENT_EXTRACTION_CONFIG = {
  READABILITY_TIMEOUT_MS: 10000,
  MIN_CONTENT_LENGTH: 100,
  MAX_CONTENT_LENGTH: 50000,
  EXCLUDED_SELECTORS: [
    "nav",
    "header",
    "footer",
    "aside",
    ".navigation",
    ".menu",
    ".sidebar",
    ".ads",
    ".advertisement",
  ],
  INCLUDE_SELECTORS: [
    "main",
    "article",
    ".content",
    ".main-content",
    ".post-content",
    ".entry-content",
  ],
} as const;

/**
 * Chunking configuration
 */
export const CHUNKING_CONFIG = {
  DEFAULT_CHUNK_SIZE: 1500,
  DEFAULT_CHUNK_OVERLAP: 150,
  MIN_CHUNK_SIZE: 100,
  MAX_CHUNK_SIZE: 3000,
  PRESERVE_HEADERS: true,
  PRESERVE_CODE_BLOCKS: true,
} as const;

/**
 * Embedding configuration
 */
export const EMBEDDING_CONFIG = {
  BATCH_SIZE: 64,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TRUNCATE_LENGTH: 8000,
  DIMENSIONS: 1536,
} as const;

/**
 * Web crawling configuration
 */
export const WEB_CRAWLING_CONFIG = {
  DEFAULT_USER_AGENT: "IQ-Crawler/1.0 (+https://iq.example.com/bot)",
  RESPECT_ROBOTS_TXT: true,
  MAX_CONCURRENT_REQUESTS: 4,
  REQUEST_TIMEOUT_MS: 30000,
  FOLLOW_REDIRECTS: true,
  MAX_REDIRECTS: 3,
} as const;

/**
 * File processing configuration
 */
export const FILE_PROCESSING_CONFIG = {
  SUPPORTED_EXTENSIONS: [".md", ".mdx", ".txt", ".html", ".htm"],
  MAX_FILE_SIZE_MB: 10,
  ENCODING: "utf-8",
  PRESERVE_METADATA: true,
} as const;

/**
 * Quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  MIN_CONTENT_QUALITY_SCORE: 0.5,
  MIN_LABEL_CONFIDENCE: 0.8,
  MAX_DUPLICATE_SIMILARITY: 0.9,
  MIN_UNIQUE_CONTENT_RATIO: 0.7,
} as const;

/**
 * Error messages for ingestion
 */
export const INGESTION_ERROR_MESSAGES = {
  INVALID_URL: "Invalid URL provided",
  CRAWL_FAILED: "Web crawling failed",
  EXTRACTION_FAILED: "Content extraction failed",
  CHUNKING_FAILED: "Document chunking failed",
  EMBEDDING_FAILED: "Embedding generation failed",
  PERSISTENCE_FAILED: "Data persistence failed",
  BATCH_SIZE_EXCEEDED: "Batch size exceeds maximum limit",
  DEPTH_LIMIT_EXCEEDED: "Crawl depth limit exceeded",
  CONTENT_TOO_SHORT: "Content is too short to process",
  CONTENT_TOO_LONG: "Content exceeds maximum length",
  UNSUPPORTED_FILE_TYPE: "Unsupported file type",
  FILE_TOO_LARGE: "File size exceeds maximum limit",
} as const;

/**
 * Success messages for ingestion
 */
export const INGESTION_SUCCESS_MESSAGES = {
  CRAWL_COMPLETED: "Web crawling completed successfully",
  EXTRACTION_COMPLETED: "Content extraction completed successfully",
  CHUNKING_COMPLETED: "Document chunking completed successfully",
  EMBEDDING_COMPLETED: "Embedding generation completed successfully",
  PERSISTENCE_COMPLETED: "Data persistence completed successfully",
  INGESTION_COMPLETED: "Document ingestion completed successfully",
} as const;
