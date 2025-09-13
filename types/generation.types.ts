import { EBloomLevel } from "@/types/retrieval.types";

export enum EMcqDifficulty {
  EASY = "Easy",
  MEDIUM = "Medium",
  HARD = "Hard",
}

export interface IGenerateMcqFilters {
  topic: string;
  subtopic?: string;
  version?: string;
}

export interface IGenerateMcqRequest {
  filters: IGenerateMcqFilters;
  count: number;
  difficulty?: EMcqDifficulty;
  bloomLevels?: EBloomLevel[];
}

export interface IMcqCitation {
  url?: string;
  sectionTitle?: string;
  documentId?: string;
  chunkIndex?: number;
  bucket?: string;
  path?: string;
}

export interface IMcqItemPayloadLabels {
  difficulty: EMcqDifficulty;
  bloom: EBloomLevel;
  topic: string;
  subtopic?: string;
  version?: string;
}

export interface IMcqItemPayload {
  question: string;
  options: string[]; // length 4
  correctIndex: number; // 0..3
  explanation: string;
  citations: IMcqCitation[];
  labels: IMcqItemPayloadLabels;
}

export interface IGenerateMcqResponse {
  ok: boolean;
  stored: number;
  itemIds: string[];
}
