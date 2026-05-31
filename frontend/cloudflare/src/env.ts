export interface Env {
  AI: Ai;
  STORAGE?: R2Bucket;
  STREAM?: StreamBinding;
  VECTOR_INDEX?: VectorizeIndex;
  R2_PUBLIC_URL?: string;
  CONVEX_URL?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
}

export interface UploadMetadata {
  filename: string;
  contentType: string;
  subjectId?: string;
  materialId?: string;
  title?: string;
  description?: string;
}

export interface IngestResult {
  objectKey: string;
  chunkCount: number;
  extractedTextPreview: string;
  vectorIds: string[];
}
