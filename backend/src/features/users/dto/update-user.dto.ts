import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { UserRole } from '../../../common/constants/user-role';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  role?: UserRole;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  vipLevel?: number;

  @IsOptional()
  @IsString()
  photoBase64?: string;

  @IsOptional()
  hasSeenLanding?: boolean;
}
