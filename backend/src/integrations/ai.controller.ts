import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { ClickupService } from './clickup.service';
import { IdeasService } from '../features/ideas/ideas.service';
import { IdeaStatus } from '../features/ideas/constants/idea-status';
import {
  ImproveIdeaDto,
  ClassifyIntentDto,
  GenerateUserStoryDto,
  AskQuestionDto,
  SendToClickUpDto,
  FindSimilarIdeasDto,
  ConverseIdeaDto,
} from './ai.dto';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly clickupService: ClickupService,
    private readonly ideasService: IdeasService,
  ) {}

  /** POST /api/ai/improve-idea — Suggest improved title & summary */
  @Post('improve-idea')
  improveIdea(@Body() dto: ImproveIdeaDto) {
    return this.aiService.generateIdeaSummary(dto);
  }

  /** POST /api/ai/classify-intent — Classify text as bug/help/idea */
  @Post('classify-intent')
  classifyIntent(@Body() dto: ClassifyIntentDto) {
    return this.aiService.classifyIntent(dto.text);
  }

  /** POST /api/ai/generate-user-story — Generate full user story from idea */
  @Post('generate-user-story')
  generateUserStory(@Body() dto: GenerateUserStoryDto) {
    return this.aiService.generateUserStory(dto);
  }

  /** POST /api/ai/ask — Knowledge assistant Q&A with conversation history */
  @Post('ask')
  ask(@Body() dto: AskQuestionDto) {
    return this.aiService.answerQuestionFromDocs(dto.question, dto.history ?? []);
  }

  /** POST /api/ai/send-to-clickup — sends US to ClickUp and marks idea as backlog */
  @Post('send-to-clickup')
  @HttpCode(HttpStatus.CREATED)
  async sendToClickUp(@Body() dto: SendToClickUpDto) {
    const result = await this.clickupService.createUserStoryTask({
      title: dto.title,
      description: dto.description,
      userStoryStatement: dto.userStoryStatement,
      functionalDescription: dto.functionalDescription,
      acceptanceCriteriaInGherkin: dto.acceptanceCriteriaInGherkin,
      constraints: dto.constraints ?? '',
      outOfScope: dto.outOfScope ?? '',
      requestedBy: dto.requestedBy ?? 'Product Owner / SORA',
    });
    // Auto-transition idea to backlog after successful ClickUp submission
    await this.ideasService.updateStatus(dto.ideaId, IdeaStatus.BACKLOG).catch(() => {
      // Non-fatal — ClickUp task was created; log but don't fail the request
    });
    return result;
  }

  /** POST /api/ai/find-similar-ideas — Detect semantically similar existing ideas */
  @Post('find-similar-ideas')
  findSimilarIdeas(@Body() dto: FindSimilarIdeasDto) {
    return this.aiService.findSimilarIdeas(dto.text, dto.ideas ?? []);
  }

  /** POST /api/ai/converse — Multi-turn conversational idea discovery */
  @Post('converse')
  converseIdea(@Body() dto: ConverseIdeaDto) {
    return this.aiService.converse(dto.message, dto.previousResponseId ?? null, dto.images);
  }
}
