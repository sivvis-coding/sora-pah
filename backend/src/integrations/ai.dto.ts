import { IsString, IsNotEmpty, MinLength, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ImproveIdeaDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsString()
  @IsOptional()
  problem?: string;

  @IsString()
  @IsOptional()
  solutionIdea?: string;
}

export class ClassifyIntentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  text: string;
}

export class GenerateUserStoryDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  problem?: string;

  @IsString()
  @IsOptional()
  value?: string;

  @IsString()
  @IsOptional()
  solutionIdea?: string;
}

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  question: string;

  /** Prior messages for conversational context (matches InMemorySaver behaviour) */
  @IsOptional()
  history?: ChatMessageDto[];
}

/**
 * Send a fully-formed UserStory to the ClickUp Product Backlog.
 * All fields map to the workspace custom field IDs in ClickupService.
 * The user must explicitly trigger this action (human-in-the-loop).
 */
export class SendToClickUpDto {
  /** The idea this US was generated from — status is set to 'backlog' automatically */
  @IsString()
  @IsNotEmpty()
  ideaId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  userStoryStatement: string;

  @IsString()
  @IsNotEmpty()
  functionalDescription: string;

  @IsString()
  @IsNotEmpty()
  acceptanceCriteriaInGherkin: string;

  @IsString()
  @IsOptional()
  constraints?: string;

  @IsString()
  @IsOptional()
  outOfScope?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;
}

export class FindSimilarIdeasDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  text: string;

  /** Existing ideas to compare against (id + title + description) */
  @IsArray()
  @IsOptional()
  ideas?: Array<{ id: string; title: string; description: string }>;
}

export class ConverseTurnDto {
  @IsString()
  @IsNotEmpty()
  role: 'user' | 'assistant';

  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ConverseIdeaDto {
  /** Latest user message */
  @IsString()
  @IsNotEmpty()
  message: string;

  /** ID of the previous response from OpenAI (null on first turn) */
  @IsString()
  @IsOptional()
  previousResponseId?: string | null;
}

export class IndexDocsDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  docIds: string[];
}
