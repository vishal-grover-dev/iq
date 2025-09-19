import { EInterviewTopic } from "@/types/upload.types";

export type TIngestMode = "web" | "repo";

export interface IIngestCatalogItem {
  subtopic: string;
  ingestType: TIngestMode;
  url: string;
  embedded: boolean;
}

export type TIngestCatalog = Record<EInterviewTopic | string, IIngestCatalogItem[]>;

export interface IIngestRunError {
  topic: EInterviewTopic | string;
  subtopic: string;
  url: string;
  error: string;
}

export interface IIngestRunResult {
  attempted: number;
  started: number;
  skippedDuplicateUrl: number;
  errors: IIngestRunError[];
  ids: string[];
}

export interface ILogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug?: (...args: unknown[]) => void;
}
