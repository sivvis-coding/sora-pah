import { IsIn, IsString } from 'class-validator';
import { IdeaStatus } from '../constants/idea-status';

export class UpdateIdeaStatusDto {
  @IsString()
  @IsIn([IdeaStatus.OPEN, IdeaStatus.IN_REVIEW, IdeaStatus.CONVERTED])
  status: IdeaStatus;
}
