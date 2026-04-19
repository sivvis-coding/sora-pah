import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';
import { UserRole } from '../../../common/constants/user-role';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  oid: string;

  @IsOptional()
  @IsString()
  role?: UserRole;
}
