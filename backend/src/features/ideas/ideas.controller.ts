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
import { ConfigService } from '@nestjs/config';
import { IsArray, IsString } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';
import { UsersService } from '../users/users.service';
import { TagsService } from '../tags/tags.service';
import { NotificationService } from '../../integrations/notification.service';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { ShareIdeaDto } from './dto/share-idea.dto';
import { IdeaUserStory } from './interfaces/idea.interface';
import { IdeaStatus } from './constants/idea-status';

class UpdateTagsDto {
  @IsArray()
  @IsString({ each: true })
  tagIds: string[];
}

@Controller('ideas')
export class IdeasController {
  private readonly frontendUrl: string;

  constructor(
    private readonly ideasService: IdeasService,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL')
      ?? this.config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  }

  /**
   * GET /api/ideas/closed
   * Returns closed ideas hydrated with author + tags.
   */
  @Get('closed')
  async findClosed() {
    const [ideas, allUsers, allTags] = await Promise.all([
      this.ideasService.findClosed(),
      this.usersService.findAll().catch((): User[] => []),
      this.tagsService.findAll().catch(() => []),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const tagMap = new Map(allTags.map((t) => [t.id, t]));

    return ideas.map((idea) => {
      const author = userMap.get(idea.createdBy);
      return {
        ...idea,
        author: author
          ? { name: author.name, department: author.department ?? null, jobTitle: author.jobTitle ?? null, photoBase64: author.photoBase64 ?? null }
          : null,
        tags: (idea.tagIds ?? []).map((id) => tagMap.get(id)).filter(Boolean),
      };
    });
  }

  /**
   * GET /api/ideas
   * Returns ideas hydrated with author + tags,
   * plus the list of idea IDs the current user has voted on.
   */
  @Get()
  async findAll(@CurrentUser() user: User) {
    const [ideas, allUsers, allTags] = await Promise.all([
      this.ideasService.findAll(),
      this.usersService.findAll().catch((): User[] => []),
      this.tagsService.findAll().catch(() => []),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const tagMap = new Map(allTags.map((t) => [t.id, t]));

    const commentCounts = await Promise.all(
      ideas.map((idea) => this.ideasService.getCommentCount(idea.id).catch(() => 0)),
    );

    const hydrated = ideas.map((idea, idx) => {
      const author = userMap.get(idea.createdBy);
      return {
        ...idea,
        commentCount: commentCounts[idx],
        author: author
          ? { name: author.name, department: author.department ?? null, jobTitle: author.jobTitle ?? null, photoBase64: author.photoBase64 ?? null }
          : null,
        tags: (idea.tagIds ?? []).map((id) => tagMap.get(id)).filter(Boolean),
      };
    });

    let votedIdeaIds: string[] = [];
    try {
      const voteChecks = await Promise.all(
        ideas.map((idea) =>
          this.ideasService.findUserVote(idea.id, user.id).then((v) => (v ? idea.id : null)),
        ),
      );
      votedIdeaIds = voteChecks.filter((id): id is string => id !== null);
    } catch {
      // non-critical
    }

    return { ideas: hydrated, votedIdeaIds };
  }

  /** GET /api/ideas/:id */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const [idea, votes, allUsers, allTags] = await Promise.all([
      this.ideasService.findById(id),
      this.ideasService.getVotes(id),
      this.usersService.findAll().catch((): User[] => []),
      this.tagsService.findAll().catch(() => []),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const tagMap = new Map(allTags.map((t) => [t.id, t]));
    const author = userMap.get(idea.createdBy);

    return {
      ...idea,
      votes,
      author: author
        ? { name: author.name, department: author.department ?? null, jobTitle: author.jobTitle ?? null, photoBase64: author.photoBase64 ?? null }
        : null,
      tags: (idea.tagIds ?? []).map((id) => tagMap.get(id)).filter(Boolean),
    };
  }

  /** POST /api/ideas — any authenticated user */
  @Post()
  async create(@Body() dto: CreateIdeaDto, @CurrentUser() user: User) {
    const idea = await this.ideasService.create(dto, user.id);
    // Bump usage counters for applied tags
    if (idea.tagIds.length > 0) {
      this.tagsService.incrementUsage(idea.tagIds, 1).catch(() => null);
    }
    return idea;
  }

  /**
   * PATCH /api/ideas/:id/tags
   * Any authenticated user can update tags on their own idea; admin can update any.
   */
  @Patch(':id/tags')
  async updateTags(
    @Param('id') id: string,
    @Body() dto: UpdateTagsDto,
    @CurrentUser() user: User,
  ) {
    const existing = await this.ideasService.findById(id);

    // Decrement old tags, increment new ones
    const removed = (existing.tagIds ?? []).filter((t) => !dto.tagIds.includes(t));
    const added = dto.tagIds.filter((t) => !(existing.tagIds ?? []).includes(t));
    if (removed.length) this.tagsService.incrementUsage(removed, -1).catch(() => null);
    if (added.length) this.tagsService.incrementUsage(added, 1).catch(() => null);

    return this.ideasService.updateTags(id, dto.tagIds);
  }

  /** POST /api/ideas/:id/share */
  @Post(':id/share')
  @HttpCode(HttpStatus.OK)
  async shareIdea(
    @Param('id') id: string,
    @Body() dto: ShareIdeaDto,
    @CurrentUser() sender: User,
  ) {
    const idea = await this.ideasService.findById(id);

    this.notificationService.shareIdea(
      dto.recipientEmails.map((email) => ({ email })),
      {
        senderName: sender.name,
        ideaTitle: idea.title,
        ideaId: idea.id,
        ideaUrl: `${this.frontendUrl}/ideas/${idea.id}`,
        message: dto.message,
      },
    );

    return { shared: true, recipientCount: dto.recipientEmails.length };
  }

  /** PATCH /api/ideas/:id/status — admin only */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateIdeaStatusDto) {
    const idea = await this.ideasService.updateStatus(id, dto.status, dto.discardReason);

    if (dto.status !== IdeaStatus.OPEN) {
      const author = await this.usersService.findById(idea.createdBy).catch(() => null);
      if (author?.email) {
        this.notificationService.notifyIdeaStatusChange({
          recipientEmail: author.email,
          recipientName: author.name,
          ideaTitle: idea.title,
          ideaId: idea.id,
          newStatus: dto.status as 'backlog' | 'implemented' | 'discarded',
          discardReason: dto.discardReason,
          ideaUrl: `${this.frontendUrl}/ideas/${idea.id}`,
        });
      }
    }

    return idea;
  }

  /** PATCH /api/ideas/:id/user-story — admin only */
  @Patch(':id/user-story')
  @Roles(UserRole.ADMIN)
  updateUserStory(@Param('id') id: string, @Body() userStory: IdeaUserStory) {
    return this.ideasService.updateUserStory(id, userStory);
  }

  /** POST /api/ideas/:id/vote */
  @Post(':id/vote')
  vote(
    @Param('id') id: string,
    @Body() dto: CreateVoteDto,
    @CurrentUser() user: User,
  ) {
    return this.ideasService.vote(id, user.id, dto.comment);
  }

  /** DELETE /api/ideas/:id/vote */
  @Delete(':id/vote')
  @HttpCode(HttpStatus.OK)
  async removeVote(@Param('id') id: string, @CurrentUser() user: User) {
    await this.ideasService.removeVote(id, user.id);
    return { removed: true };
  }

  /** DELETE /api/ideas/:id — admin only, soft delete */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.ideasService.delete(id);
    return { deleted: true };
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    const [comments, allUsers] = await Promise.all([
      this.ideasService.getComments(id),
      this.usersService.findAll().catch(() => []),
    ]);
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    return comments.map((c) => {
      const author = userMap.get(c.userId);
      return {
        ...c,
        author: author
          ? { name: author.name, department: author.department ?? null, jobTitle: author.jobTitle ?? null, photoBase64: author.photoBase64 ?? null }
          : null,
      };
    });
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.ideasService.addComment(id, user.id, dto.content);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
  ) {
    await this.ideasService.deleteComment(commentId, id);
    return { deleted: true };
  }
}
