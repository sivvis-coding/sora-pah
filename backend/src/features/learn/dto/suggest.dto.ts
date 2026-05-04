import { IsNotEmpty, IsString } from 'class-validator';

export class SuggestDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}
