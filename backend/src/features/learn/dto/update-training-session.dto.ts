import { IsIn, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { TrainingStatus } from '../interfaces/training-session.interface';

export class UpdateTrainingSessionDto {
  @IsString()
  @IsIn(['proposed', 'scheduled', 'completed', 'cancelled'])
  @IsOptional()
  status?: TrainingStatus;

  @IsString()
  @IsOptional()
  scheduledAt?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  durationMinutes?: number;

  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  location?: string;
}
