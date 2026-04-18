import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateStakeholderDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  weight?: number;
}
