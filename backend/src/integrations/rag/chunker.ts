import { DocChunk } from './interfaces';

/**
 * Markdown-aware text chunker.
 *
 * Strategy:
 *   1. Split on H2 headings (## ) — each section is a natural unit
 *   2. If a section exceeds maxTokens, split on paragraphs (\n\n)
 *   3. If a paragraph still exceeds, split on sentences
 *   4. Apply overlap: prepend last N tokens from previous chunk
 *
 * Token estimation: ~4 chars per token (rough but effective for chunking).
 */

const CHARS_PER_TOKEN = 4;
const DEFAULT_MAX_TOKENS = 800;
const DEFAULT_OVERLAP_TOKENS = 200;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function splitOnHeadings(markdown: string): string[] {
  // Split on lines that start with ## (keep the heading with its content)
  const sections: string[] = [];
  const lines = markdown.split('\n');
  let current = '';

  for (const line of lines) {
    if (/^#{1,2}\s/.test(line) && current.trim()) {
      sections.push(current.trim());
      current = line + '\n';
    } else {
      current += line + '\n';
    }
  }
  if (current.trim()) sections.push(current.trim());

  return sections;
}

function splitOnParagraphs(text: string): string[] {
  return text.split(/\n{2,}/).filter((p) => p.trim());
}

function splitOnSentences(text: string): string[] {
  // Split on sentence boundaries
  return text
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim());
}

function chunkSection(
  text: string,
  maxTokens: number,
): string[] {
  if (estimateTokens(text) <= maxTokens) return [text];

  // Try paragraph splits
  const paragraphs = splitOnParagraphs(text);
  const chunks: string[] = [];
  let buffer = '';

  for (const para of paragraphs) {
    if (estimateTokens(buffer + '\n\n' + para) > maxTokens && buffer) {
      chunks.push(buffer.trim());
      buffer = para;
    } else {
      buffer = buffer ? buffer + '\n\n' + para : para;
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());

  // Further split any chunk that still exceeds max
  const final: string[] = [];
  for (const chunk of chunks) {
    if (estimateTokens(chunk) <= maxTokens) {
      final.push(chunk);
    } else {
      // Split on sentences
      const sentences = splitOnSentences(chunk);
      let sentenceBuffer = '';
      for (const sentence of sentences) {
        if (estimateTokens(sentenceBuffer + ' ' + sentence) > maxTokens && sentenceBuffer) {
          final.push(sentenceBuffer.trim());
          sentenceBuffer = sentence;
        } else {
          sentenceBuffer = sentenceBuffer ? sentenceBuffer + ' ' + sentence : sentence;
        }
      }
      if (sentenceBuffer.trim()) final.push(sentenceBuffer.trim());
    }
  }

  return final;
}

function applyOverlap(chunks: string[], overlapTokens: number): string[] {
  if (chunks.length <= 1) return chunks;

  const overlapChars = overlapTokens * CHARS_PER_TOKEN;
  const result: string[] = [chunks[0]];

  for (let i = 1; i < chunks.length; i++) {
    const prevText = chunks[i - 1];
    const overlap = prevText.slice(-overlapChars);
    result.push(overlap + '\n...\n' + chunks[i]);
  }

  return result;
}

/**
 * Chunk a markdown document into sized pieces suitable for embedding.
 */
export function chunkMarkdown(
  markdown: string,
  meta: {
    docId: string;
    pageId: string;
    docTitle: string;
    pageTitle: string;
  },
  options: {
    maxTokens?: number;
    overlapTokens?: number;
  } = {},
): DocChunk[] {
  const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
  const overlapTokens = options.overlapTokens ?? DEFAULT_OVERLAP_TOKENS;

  if (!markdown.trim()) return [];

  // Step 1: Split on headings
  const sections = splitOnHeadings(markdown);

  // Step 2: Chunk each section
  const rawChunks: string[] = [];
  for (const section of sections) {
    rawChunks.push(...chunkSection(section, maxTokens));
  }

  // Step 3: Apply overlap
  const overlapped = applyOverlap(rawChunks, overlapTokens);

  // Step 4: Map to DocChunk
  return overlapped.map((content, i) => ({
    content,
    docId: meta.docId,
    pageId: meta.pageId,
    docTitle: meta.docTitle,
    pageTitle: meta.pageTitle,
    chunkIndex: i,
  }));
}
