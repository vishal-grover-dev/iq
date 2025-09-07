export interface IUploadedObject {
  originalFileName: string;
  storagePath: string;
  bucket: string;
  mimeType?: string;
}

export interface IIngestSummary {
  ok: boolean;
  ingestionId: string;
  message: string;
  chunks: number;
  vectors: number;
}

export interface IEmbeddingRequestItem {
  id: string;
  text: string;
}

export interface IEmbeddingResultItem {
  id: string;
  embedding: number[];
}

export interface ILangchainChunk {
  index: number;
  content: string;
  tokens: number;
}
