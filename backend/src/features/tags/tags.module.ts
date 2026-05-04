import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagRepository } from './repositories/tag.repository';
import { TagSuggestionService } from './tag-suggestion.service';

@Module({
  controllers: [TagsController],
  providers: [TagsService, TagRepository, TagSuggestionService],
  exports: [TagsService],
})
export class TagsModule {}
