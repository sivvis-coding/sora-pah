import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateNarrativeDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  why: string;

  @IsString()
  @IsOptional()
  decisionId?: string;

  @IsString()
  @IsOptional()
  originIdeaId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  clickupTaskIds?: string[];
}
