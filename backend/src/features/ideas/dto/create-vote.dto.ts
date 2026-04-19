import { IsOptional, IsString } from 'class-validator';

export class CreateVoteDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
