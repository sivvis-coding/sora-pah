import { IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateIdeaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  problem: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  solutionIdea?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tagIds?: string[];
}
