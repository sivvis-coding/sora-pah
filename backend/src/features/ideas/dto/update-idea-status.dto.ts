import { IsIn, IsString, IsOptional, ValidateIf } from 'class-validator';
import { IdeaStatus } from '../constants/idea-status';

export class UpdateIdeaStatusDto {
  @IsString()
  @IsIn([IdeaStatus.OPEN, IdeaStatus.BACKLOG, IdeaStatus.IMPLEMENTED, IdeaStatus.DISCARDED])
  status: IdeaStatus;

  /** Required when status === 'discarded' */
  @ValidateIf((o) => o.status === IdeaStatus.DISCARDED)
  @IsString()
  @IsOptional()
  discardReason?: string;
}
