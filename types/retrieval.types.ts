export enum EBloomLevel {
  REMEMBER = "Remember",
  UNDERSTAND = "Understand",
  APPLY = "Apply",
  ANALYZE = "Analyze",
  EVALUATE = "Evaluate",
  CREATE = "Create",
}

export interface IRetrievalFilters {
  board: string;
  grade: string;
  subject: string;
  resourceType?: string;
  chapterNumber?: string;
  chapterName?: string;
  subjectWide?: boolean;
}

export interface IRetrievalRequest {
  filters: IRetrievalFilters;
  query: string;
  topK?: number;
  alpha?: number;
  bloomTargets?: EBloomLevel[];
  bloomDistribution?: Record<EBloomLevel, number>;
}

export interface IRetrievalItem {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokens: number;
  score: number;
  title?: string | null;
  bucket: string;
  path: string;
  rerankScore?: number;
  fusedScore?: number;
}

export interface IRetrievalResponseDebug {
  vectorMs?: number;
  keywordMs?: number;
  rerankMs?: number;
  bloomHintApplied?: boolean;
}

export interface IRetrievalResponse {
  ok: boolean;
  items: IRetrievalItem[];
  debug?: IRetrievalResponseDebug;
}

export interface IRetrievalEnhancementRequest {
  rawQuery: string;
  filters: IRetrievalFilters;
}

export interface IRetrievalEnhancementResponse {
  ok: boolean;
  enhancedQuery: string;
  explanations: string[];
  termHighlights?: string[];
  debug?: { ms?: number };
}

