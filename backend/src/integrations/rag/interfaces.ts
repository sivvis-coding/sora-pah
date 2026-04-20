/**
 * RAG pipeline types.
 */

/** A chunk of text extracted from a ClickUp doc page */
export interface DocChunk {
  content: string;
  docId: string;
  pageId: string;
  docTitle: string;
  pageTitle: string;
  chunkIndex: number;
}

/** Stored record in the Cosmos "embeddings" container */
export interface EmbeddingRecord {
  id: string;
  docId: string;      // partition key
  pageId: string;
  docTitle: string;
  pageTitle: string;
  chunkIndex: number;
  content: string;
  embedding: number[];  // 1536-dim float32
  indexedAt: string;
}

/** Result of a vector similarity search */
export interface RetrievedChunk {
  content: string;
  docTitle: string;
  pageTitle: string;
  score: number;
}

/** Stats returned after indexing */
export interface IndexingResult {
  docsProcessed: number;
  pagesProcessed: number;
  chunksStored: number;
  chunksDeleted: number;
  durationMs: number;
}
