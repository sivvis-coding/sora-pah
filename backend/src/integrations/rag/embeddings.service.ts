import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * OpenAI Embeddings service.
 * Uses text-embedding-3-small (1536 dimensions).
 */
@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly apiKey: string;
  private readonly model = 'text-embedding-3-small';
  private readonly url = 'https://api.openai.com/v1/embeddings';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
  }

  /**
   * Embed multiple texts in a single API call.
   * OpenAI supports up to 2048 inputs per call; we batch at 100 for safety.
   */
  async embed(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY not configured — cannot generate embeddings');
    }

    const results: number[][] = [];
    const batchSize = 100;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      this.logger.log(
        `Embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} (${batch.length} texts)`,
      );

      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI embeddings error ${res.status}: ${body}`);
      }

      const data = (await res.json()) as {
        data: Array<{ embedding: number[]; index: number }>;
      };

      // Sort by index to maintain order
      const sorted = data.data.sort((a, b) => a.index - b.index);
      results.push(...sorted.map((d) => d.embedding));

      // Rate limiting: small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return results;
  }

  /** Embed a single text. */
  async embedSingle(text: string): Promise<number[]> {
    const [vec] = await this.embed([text]);
    return vec;
  }
}
