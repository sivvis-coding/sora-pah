import { IsBoolean, IsHexColor, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsNumber()
  @IsOptional()
  order?: number;
}
