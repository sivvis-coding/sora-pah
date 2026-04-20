import { IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateNarrativeDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  why?: string;

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
