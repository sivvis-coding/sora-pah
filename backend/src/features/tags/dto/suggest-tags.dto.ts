import { IsArray, IsString, ArrayMaxSize } from 'class-validator';

export class SuggestTagsDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  /** Existing tag names to guide reuse vs creation */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(200)
  existingTagNames: string[];
}
