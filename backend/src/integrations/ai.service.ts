import { Injectable, Logger } from '@nestjs/common';

/**
 * Placeholder for OpenAI integration.
 * Will handle: summarization, suggestion generation, Q&A assistance.
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  async summarize(_text: string): Promise<string> {
    this.logger.warn('AIService.summarize() called — not implemented yet');
    return 'AI summarization placeholder';
  }

  async generateSuggestion(_context: string): Promise<string> {
    this.logger.warn('AIService.generateSuggestion() called — not implemented yet');
    return 'AI suggestion placeholder';
  }
}
