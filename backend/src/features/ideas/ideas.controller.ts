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
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';
import { UsersService } from '../users/users.service';
import { CategoriesService } from '../categories/categories.service';
import { NotificationService } from '../../integrations/notification.service';
import { IdeasService } from './ideas.service';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { CreateVoteDto } from './dto/create-vote.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateIdeaStatusDto } from './dto/update-idea-status.dto';
import { ShareIdeaDto } from './dto/share-idea.dto';
import { IdeaUserStory } from './interfaces/idea.interface';
import { IdeaStatus } from './constants/idea-status';
import { Category } from '../categories/interfaces/category.interface';

@Controller('ideas')
export class IdeasController {
  private readonly frontendUrl: string;

  constructor(
    private readonly ideasService: IdeasService,
    private readonly usersService: UsersService,
    private readonly categoriesService: CategoriesService,
    private readonly notificationService: NotificationService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = this.config.get<string>('FRONTEND_URL')
      ?? this.config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  }

  /**
   * GET /api/ideas/closed
   * Returns closed ideas (backlog, implemented, discarded) hydrated with author + category.
   */
  @Get('closed')
  async findClosed() {
    const [ideas, allUsers, allCategories] = await Promise.all([
      this.ideasService.findClosed(),
      this.usersService.findAll().catch((): User[] => []),
      this.categoriesService.findActive().catch((): Category[] => []),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    return ideas.map((idea) => {
      const author = userMap.get(idea.createdBy);
      const category = idea.categoryId ? categoryMap.get(idea.categoryId) : undefined;
      return {
        ...idea,
        author: author
          ? { name: author.name, department: author.department ?? null, jobTitle: author.jobTitle ?? null, photoBase64: author.photoBase64 ?? null }
          : null,
        category: category
          ? { id: category.id, name: category.name, color: category.color }
          : null,
      };
    });
  }

  /**
   * GET /api/ideas
   * Returns ideas hydrated with author + category info,
   * plus the list of idea IDs the current user has voted on.
   */
  @Get()
  async findAll(@CurrentUser() user: User) {
    const [ideas, allUsers, allCategories] = await Promise.all([
      this.ideasService.findAll(),
      this.usersService.findAll().catch((): User[] => []),
      this.categoriesService.findActive().catch((): Category[] => []),
    ]);

    // Build lookup maps
    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    // Get comment counts in parallel
    const commentCounts = await Promise.all(
      ideas.map((idea) => this.ideasService.getCommentCount(idea.id).catch(() => 0)),
    );

    // Hydrate ideas
    const hydrated = ideas.map((idea, idx) => {
      const author = userMap.get(idea.createdBy);
      const category = idea.categoryId ? categoryMap.get(idea.categoryId) : undefined;
      return {
        ...idea,
        commentCount: commentCounts[idx],
        author: author
          ? {
              name: author.name,
              department: author.department ?? null,
              jobTitle: author.jobTitle ?? null,
              photoBase64: author.photoBase64 ?? null,
            }
          : null,
        category: category
          ? { id: category.id, name: category.name, color: category.color }
          : null,
      };
    });

    // Get IDs of ideas the current user has voted on (parallel)
    let votedIdeaIds: string[] = [];
    try {
      const voteChecks = await Promise.all(
        ideas.map((idea) =>
          this.ideasService.findUserVote(idea.id, user.id).then((v) => (v ? idea.id : null)),
        ),
      );
      votedIdeaIds = voteChecks.filter((id): id is string => id !== null);
    } catch {
      // If vote lookup fails, return empty — non-critical
    }

    return { ideas: hydrated, votedIdeaIds };
  }

  /** Any authenticated user can view idea detail + votes */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const [idea, votes, allUsers, allCategories] = await Promise.all([
      this.ideasService.findById(id),
      this.ideasService.getVotes(id),
      this.usersService.findAll().catch((): User[] => []),
      this.categoriesService.findActive().catch((): Category[] => []),
    ]);

    const userMap = new Map(allUsers.map((u) => [u.id, u]));
    const categoryMap = new Map(allCategories.map((c) => [c.id, c]));

    const author = userMap.get(idea.createdBy);
    const category = idea.categoryId ? categoryMap.get(idea.categoryId) : undefined;

    return {
      ...idea,
      votes,
      author: author
        ? {
            name: author.name,
            department: author.department ?? null,
            jobTitle: author.jobTitle ?? null,
            photoBase64: author.photoBase64 ?? null,
          }
        : null,
      category: category
        ? { id: category.id, name: category.name, color: category.color }
        : null,
    };
  }

  /** Any authenticated user can submit an idea */
  @Post()
  create(@Body() dto: CreateIdeaDto, @CurrentUser() user: User) {
    return this.ideasService.create(dto, user.id);
  }

  /** Any authenticated user can share an idea via Teams */
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

  /** Admin only: change idea status */
  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateIdeaStatusDto) {
    const idea = await this.ideasService.updateStatus(id, dto.status, dto.discardReason);

    // Notify idea author on non-open status changes (fire & forget)
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

  /** Admin only: save generated user story */
  @Patch(':id/user-story')
  @Roles(UserRole.ADMIN)
  updateUserStory(@Param('id') id: string, @Body() userStory: IdeaUserStory) {
    return this.ideasService.updateUserStory(id, userStory);
  }

  /** Any authenticated user can vote */
  @Post(':id/vote')
  vote(
    @Param('id') id: string,
    @Body() dto: CreateVoteDto,
    @CurrentUser() user: User,
  ) {
    return this.ideasService.vote(id, user.id, dto.comment);
  }

  /** Remove own vote */
  @Delete(':id/vote')
  @HttpCode(HttpStatus.OK)
  async removeVote(@Param('id') id: string, @CurrentUser() user: User) {
    await this.ideasService.removeVote(id, user.id);
    return { removed: true };
  }

  /** Admin only: soft delete */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string) {
    await this.ideasService.delete(id);
    return { deleted: true };
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  /** Get comments for an idea */
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
          ? {
              name: author.name,
              department: author.department ?? null,
              jobTitle: author.jobTitle ?? null,
              photoBase64: author.photoBase64 ?? null,
            }
          : null,
      };
    });
  }

  /** Add a comment to an idea */
  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.ideasService.addComment(id, user.id, dto.content);
  }

  /** Admin or comment owner can delete */
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
