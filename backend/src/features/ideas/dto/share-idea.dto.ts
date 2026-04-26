import { IsArray, IsEmail, IsOptional, IsString, ArrayMinSize } from 'class-validator';

export class ShareIdeaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEmail({}, { each: true })
  recipientEmails: string[];

  @IsOptional()
  @IsString()
  message?: string;
}
