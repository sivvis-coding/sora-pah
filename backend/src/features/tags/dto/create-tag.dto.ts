import { IsString, IsNotEmpty, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateTagDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a valid hex color e.g. #6366f1' })
  color?: string;
}
