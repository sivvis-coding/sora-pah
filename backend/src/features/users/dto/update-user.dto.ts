import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: 'admin' | 'standard';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  vipLevel?: number;
}
