/**
 * Ingestion-related types and enums
 *
 * Contains enums and interfaces shared across ingestion flows (repo/web) for
 * consistent typing between client, services, and API routes.
 */

export enum EIngestionMode {
  REPO = "repo",
  WEB = "web",
}

export enum EIngestionStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  AWAITING_NEXT_BATCH = "awaiting_next_batch",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum EIngestionStage {
  IDLE = "idle",
  VALIDATING = "validating",
  PLANNING = "planning",
  CRAWLING = "crawling",
  FETCHING = "fetching",
  CHUNKING = "chunking",
  EMBEDDING = "embedding",
  WRITING = "writing",
  COMPLETED = "completed",
}

export interface IIngestionBatchCursor {
  totalPlanned: number;
  nextStart: number;
  batchSize: number;
}

export interface IIngestionProgress {
  step?: EIngestionStage;
  processed?: number;
  totalPlanned?: number;
  currentPathOrUrl?: string;
  errorsCount?: number;
  coverage?: {
    topics?: string[];
    subtopics?: string[];
  };
  recent?: Array<{ title: string | null; path: string }>;
  lastUpdatedAt?: string;
}

export interface IIngestionMetadata {
  mode: EIngestionMode;
  topic: string;
  subtopic?: string | null;
  version?: string | null;
  repoUrl?: string;
  maxFiles?: number;
  paths?: string[];
  depth?: number;
  maxPages?: number;
  crawlDelayMs?: number;
  overrideSubtopic?: boolean;
  batch?: IIngestionBatchCursor;
  progress?: IIngestionProgress;
}

export interface IIngestionResponse {
  ok: boolean;
  ingestionId: string;
  message: string;
  chunks: number;
  vectors: number;
  completed?: boolean;
  processed?: number;
  total?: number;
}

export interface IIngestionPlanSlice {
  name: string;
  start: number;
  end: number;
  count: number;
}

export interface IRepoIngestionPlan {
  ok: boolean;
  total: number;
  batchSize: number;
  slices: IIngestionPlanSlice[];
  categories: Record<string, number>;
}

export interface IWebIngestionPreviewPage {
  url: string;
  title?: string;
}

export interface IWebIngestionPlan {
  ok: boolean;
  count: number;
  pages: IWebIngestionPreviewPage[];
  sections?: unknown;
  quotas?: { requested: number } | undefined;
  debug?: unknown;
}

export interface IIngestionProgressInfo {
  ingestionId: string;
  inflightStep?: EIngestionStage | string;
  processed?: number;
  totalPlanned?: number;
  currentPathOrUrl?: string;
  topics?: string[];
  subtopics?: string[];
}

// GitHub API response types
export interface IGitHubTreeItem {
  type: "blob" | "tree" | "commit";
  path: string;
}

export interface IGitHubTreeResponse {
  tree: IGitHubTreeItem[];
}
