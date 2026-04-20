import { IsString, IsNotEmpty, MinLength, IsOptional } from 'class-validator';

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
