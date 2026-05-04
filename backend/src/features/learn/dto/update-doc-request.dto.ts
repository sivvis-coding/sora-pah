import { IsIn, IsOptional, IsString } from 'class-validator';
import { DocRequestStatus } from '../interfaces/doc-request.interface';

export class UpdateDocRequestDto {
  @IsString()
  @IsIn(['open', 'documented'])
  @IsOptional()
  status?: DocRequestStatus;

  @IsString()
  @IsOptional()
  linkedDocUrl?: string;

  @IsString()
  @IsOptional()
  linkedDocTitle?: string;
}
