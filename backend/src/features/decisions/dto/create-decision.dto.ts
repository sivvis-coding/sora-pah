import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateDecisionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  rationale: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  linkedIdeaIds?: string[];
}
