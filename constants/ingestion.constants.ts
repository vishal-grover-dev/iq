/**
 * Ingestion-related constants
 *
 * Contains static configuration, labels, and defaults shared across ingestion flows.
 */

import { EIngestionMode, EIngestionStage, EIngestionStatus } from "@/types/ingestion.types";

export const INGESTION_DEFAULTS = {
  [EIngestionMode.REPO]: {
    MAX_FILES: 200,
    BATCH_SIZE: 50,
  },
  [EIngestionMode.WEB]: {
    DEPTH: 2,
    MAX_PAGES: 50,
    CRAWL_DELAY_MS: 300,
  },
} as const;

export const INGESTION_STATUS_LABELS = {
  [EIngestionStatus.PENDING]: "Pending",
  [EIngestionStatus.PROCESSING]: "Processing",
  [EIngestionStatus.AWAITING_NEXT_BATCH]: "Awaiting next batch",
  [EIngestionStatus.COMPLETED]: "Completed",
  [EInestionStatus.FAILED]: "Failed",
} as const;

export const INGESTION_STAGE_LABELS = {
  [EIngestionStage.IDLE]: "Idle",
  [EIngestionStage.VALIDATING]: "Validating",
  [EIngestionStage.PLANNING]: "Planning",
  [EIngestionStage.CRAWLING]: "Crawling",
  [EIngestionStage.FETCHING]: "Fetching",
  [EIngestionStage.CHUNKING]: "Chunking",
  [EIngestionStage.EMBEDDING]: "Embedding",
  [EIngestionStage.WRITING]: "Writing",
  [EIngestionStage.COMPLETED]: "Completed",
} as const;

export const INGESTION_TOAST_MESSAGES = {
  STARTED: "Ingestions started. Tracking progress…",
  FAILED: "Failed to create ingestion(s)",
  COMPLETED: "Ingestion completed",
} as const;

export const INGESTION_TOAST_TITLES = {
  PROGRESS: (ingestionId: string, step: string) => `Ingestion ${ingestionId.slice(0, 8)}: ${step}`,
  ERROR: "Ingestion error",
} as const;

export const INGESTION_PROGRESS_DESCRIPTIONS = {
  processed: (processed?: number, total?: number) =>
    typeof processed === "number" && typeof total === "number" ? `${processed}/${total}` : undefined,
  current: (pathOrUrl?: string) => (pathOrUrl ? `Current: ${pathOrUrl}` : undefined),
} as const;
