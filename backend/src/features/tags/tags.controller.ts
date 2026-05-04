import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/constants/user-role';
import { User } from '../users/interfaces/user.interface';
import { TagsService } from './tags.service';
import { TagSuggestionService } from './tag-suggestion.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { SuggestTagsDto } from './dto/suggest-tags.dto';

@Controller('tags')
export class TagsController {
  constructor(
    private readonly tagsService: TagsService,
    private readonly tagSuggestionService: TagSuggestionService,
  ) {}

  /** GET /api/tags — all tags ordered by usage */
  @Get()
  findAll() {
    return this.tagsService.findAll();
  }

  /** POST /api/tags — any authenticated user can create a tag */
  @Post()
  create(@Body() dto: CreateTagDto, @CurrentUser() user: User) {
    return this.tagsService.create(dto, user.id);
  }

  /**
   * POST /api/tags/suggest
   * AI suggests 3-5 tags for a given idea title + description.
   * Returns { tags: Tag[] } — finds or creates each suggested tag.
   */
  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggest(@Body() dto: SuggestTagsDto, @CurrentUser() user: User) {
    const suggestedNames = await this.tagSuggestionService.suggestTags(
      dto.title,
      dto.description,
      dto.existingTagNames,
    );

    const tags = await Promise.all(
      suggestedNames.map((name) => this.tagsService.findOrCreate(name, user.id)),
    );

    return { tags };
  }

  /** PATCH /api/tags/:id — admin only */
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.tagsService.update(id, dto);
  }

  /** DELETE /api/tags/:id — admin only */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.tagsService.delete(id);
    return { deleted: true };
  }
}
