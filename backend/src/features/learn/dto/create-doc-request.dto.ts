import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDocRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
