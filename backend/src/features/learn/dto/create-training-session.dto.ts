import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { TrainingFormat } from '../interfaces/training-session.interface';

export class CreateTrainingSessionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsIn(['online', 'in-person', 'either'])
  @IsOptional()
  format?: TrainingFormat;
}
