import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  Database,
  Container,
  VectorEmbeddingDataType,
  VectorEmbeddingDistanceFunction,
  VectorIndexType,
} from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../database/cosmos.provider';
import { ClickUpDocsService } from './clickup-docs.service';
import { EmbeddingsService } from './embeddings.service';
import { chunkMarkdown } from './chunker';
import {
  DocChunk,
  EmbeddingRecord,
  RetrievedChunk,
  IndexingResult,
} from './interfaces';

/**
 * RAG Service — handles document indexing and retrieval.
 *
 * Indexing: ClickUp docs → chunk → embed → store in Cosmos "embeddings"
 * Retrieval: embed query → Cosmos vector search → return top-K chunks
 *
 * The "embeddings" container is created lazily on the first indexing run
 * so the app starts normally even when Cosmos Vector Search is not enabled.
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    @Inject(COSMOS_DATABASE) private readonly db: Database,
    private readonly clickupDocs: ClickUpDocsService,
    private readonly embeddings: EmbeddingsService,
  ) {}

  /**
   * Ensures the "embeddings" container exists with the correct vector policy.
   * Called at the start of indexing — never at module init.
   */
  private async ensureContainer(): Promise<Container> {
    const { container } = await this.db.containers.createIfNotExists({
      id: 'embeddings',
      partitionKey: { paths: ['/docId'] },
      vectorEmbeddingPolicy: {
        vectorEmbeddings: [
          {
            path: '/embedding',
            dataType: VectorEmbeddingDataType.Float32,
            dimensions: 1536,
            distanceFunction: VectorEmbeddingDistanceFunction.Cosine,
          },
        ],
      },
      indexingPolicy: {
        vectorIndexes: [{ path: '/embedding', type: VectorIndexType.DiskANN }],
      },
    } as any);
    return container;
  }

  // ─── Indexing ───────────────────────────────────────────────────────────────

  /**
   * Full re-index: fetch all docs from ClickUp, chunk, embed, upsert to Cosmos.
   * Deletes stale records for docs/pages that no longer exist.
   */
  async indexDocs(docIds: string[]): Promise<IndexingResult> {
    const startTime = Date.now();
    this.logger.log(`Starting document indexing for ${docIds.length} doc(s): ${docIds.join(', ')}`);

    // Ensure the vector container exists before writing
    const container = await this.ensureContainer();

    let pagesProcessed = 0;
    const allChunks: DocChunk[] = [];
    const activeDocIds = new Set<string>(docIds);

    // Fetch each doc by ID and chunk its pages
    for (const docId of docIds) {
      try {
        const doc = await this.clickupDocs.getDocInfo(docId);
        const pages = await this.clickupDocs.getDocPages(docId);
        this.logger.log(`  Doc "${doc.name}" (${docId}): ${pages.length} pages`);

        for (const page of pages) {
          pagesProcessed++;
          if (!page.content?.trim()) continue;

          const chunks = chunkMarkdown(page.content, {
            docId: doc.id,
            pageId: page.id,
            docTitle: doc.name,
            pageTitle: page.name,
          });
          allChunks.push(...chunks);
        }
      } catch (err) {
        this.logger.error(`Failed to process doc "${docId}": ${err}`);
      }
    }

    this.logger.log(`Total chunks to embed: ${allChunks.length}`);

    // 3. Embed all chunks
    const texts = allChunks.map((c) => c.content);
    let embeddings: number[][] = [];

    if (texts.length > 0) {
      embeddings = await this.embeddings.embed(texts);
    }

    // 4. Upsert into Cosmos
    let stored = 0;
    for (let i = 0; i < allChunks.length; i++) {
      const chunk = allChunks[i];
      const record: EmbeddingRecord = {
        id: uuid(),
        docId: chunk.docId,
        pageId: chunk.pageId,
        docTitle: chunk.docTitle,
        pageTitle: chunk.pageTitle,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: embeddings[i],
        indexedAt: new Date().toISOString(),
      };

      try {
        await container.items.upsert(record);
        stored++;
      } catch (err) {
        this.logger.error(`Failed to upsert chunk ${i}: ${err}`);
      }
    }

    // 5. Delete stale records (docs that no longer exist)
    let deleted = 0;
    try {
      const { resources: existing } = await container.items
        .query<{ id: string; docId: string }>({
          query: 'SELECT c.id, c.docId FROM c',
        })
        .fetchAll();

      for (const item of existing) {
        if (!activeDocIds.has(item.docId)) {
          await container.item(item.id, item.docId).delete();
          deleted++;
        }
      }
    } catch (err) {
      this.logger.warn(`Stale cleanup failed: ${err}`);
    }

    const result: IndexingResult = {
      docsProcessed: docIds.length,
      pagesProcessed,
      chunksStored: stored,
      chunksDeleted: deleted,
      durationMs: Date.now() - startTime,
    };

    this.logger.log(
      `Indexing complete: ${result.docsProcessed} docs, ${result.chunksStored} chunks stored, ${result.chunksDeleted} stale deleted (${result.durationMs}ms)`,
    );

    return result;
  }

  // ─── Retrieval ──────────────────────────────────────────────────────────────

  /**
   * Retrieve the top-K most relevant document chunks for a query.
   * Uses Cosmos DB vector search (DiskANN, cosine similarity).
   */
  async retrieve(query: string, topK = 5): Promise<RetrievedChunk[]> {
    // Embed the query
    const queryEmbedding = await this.embeddings.embedSingle(query);

    // Vector search query using Cosmos DB VectorDistance function
    const container = this.db.container('embeddings');
    const { resources } = await container.items
      .query<{
        content: string;
        docTitle: string;
        pageTitle: string;
        score: number;
      }>({
        query: `
          SELECT TOP @topK
            c.content,
            c.docTitle,
            c.pageTitle,
            VectorDistance(c.embedding, @queryVector) AS score
          FROM c
          ORDER BY VectorDistance(c.embedding, @queryVector)
        `,
        parameters: [
          { name: '@topK', value: topK },
          { name: '@queryVector', value: queryEmbedding },
        ],
      })
      .fetchAll();

    this.logger.log(`Retrieved ${resources.length} chunks for query`);

    return resources.map((r) => ({
      content: r.content,
      docTitle: r.docTitle,
      pageTitle: r.pageTitle,
      score: r.score,
    }));
  }

  /**
   * Check if the embeddings container has any data indexed.
   */
  async hasIndex(): Promise<{ indexed: boolean; chunkCount: number }> {
    try {
      const { resources } = await this.db.container('embeddings').items
        .query<number>({
          query: 'SELECT VALUE COUNT(1) FROM c',
        })
        .fetchAll();
      const count = resources[0] ?? 0;
      return { indexed: count > 0, chunkCount: count };
    } catch {
      return { indexed: false, chunkCount: 0 };
    }
  }
}
