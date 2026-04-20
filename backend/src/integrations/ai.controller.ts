import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AIService } from './ai.service';
import { ClickupService } from './clickup.service';
import {
  ImproveIdeaDto,
  ClassifyIntentDto,
  GenerateUserStoryDto,
  AskQuestionDto,
  SendToClickUpDto,
} from './ai.dto';

@Controller('ai')
export class AIController {
  constructor(
    private readonly aiService: AIService,
    private readonly clickupService: ClickupService,
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

  /**
   * POST /api/ai/send-to-clickup
   *
   * Human-in-the-loop gate: the frontend shows the full story and waits for
   * explicit user confirmation before calling this endpoint.
   * Mirrors the Python agent's HumanInTheLoopMiddleware(interrupt_on={"save_user_story": True}).
   */
  @Post('send-to-clickup')
  @HttpCode(HttpStatus.CREATED)
  sendToClickUp(@Body() dto: SendToClickUpDto) {
    return this.clickupService.createUserStoryTask({
      title: dto.title,
      description: dto.description,
      userStoryStatement: dto.userStoryStatement,
      functionalDescription: dto.functionalDescription,
      acceptanceCriteriaInGherkin: dto.acceptanceCriteriaInGherkin,
      constraints: dto.constraints ?? '',
      outOfScope: dto.outOfScope ?? '',
      requestedBy: dto.requestedBy ?? 'Product Owner / SORA',
    });
  }
}
