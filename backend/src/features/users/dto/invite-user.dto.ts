import { IsEmail, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { UserRole } from '../../../common/constants/user-role';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  role?: UserRole;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  vipLevel?: number;
}
