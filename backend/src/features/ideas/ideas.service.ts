import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { IdeaRepository } from './repositories/idea.repository';
import { VoteRepository } from './repositories/vote.repository';
import { CommentRepository } from './repositories/comment.repository';
import { CreateIdeaDto } from './dto/create-idea.dto';
import { Idea } from './interfaces/idea.interface';
import { Vote } from './interfaces/vote.interface';
import { Comment } from './interfaces/comment.interface';
import { IdeaStatus } from './constants/idea-status';

@Injectable()
export class IdeasService {
  constructor(
    private readonly ideaRepo: IdeaRepository,
    private readonly voteRepo: VoteRepository,
    private readonly commentRepo: CommentRepository,
  ) {}

  findAll(): Promise<Idea[]> {
    return this.ideaRepo.findAll();
  }

  async findById(id: string): Promise<Idea> {
    const idea = await this.ideaRepo.findById(id);
    if (!idea) throw new NotFoundException(`Idea ${id} not found`);
    return idea;
  }

  async getVotes(ideaId: string): Promise<Vote[]> {
    return this.voteRepo.findByIdea(ideaId);
  }

  /** Check if a specific user has voted on an idea */
  async findUserVote(ideaId: string, userId: string): Promise<Vote | undefined> {
    if (!userId) return undefined;
    return this.voteRepo.findByUserAndIdea(userId, ideaId);
  }

  create(dto: CreateIdeaDto, userId: string): Promise<Idea> {
    return this.ideaRepo.create(dto, userId);
  }

  updateStatus(id: string, status: IdeaStatus): Promise<Idea> {
    return this.ideaRepo.updateStatus(id, status);
  }

  async vote(ideaId: string, userId: string, comment?: string): Promise<Vote> {
    await this.findById(ideaId);

    const existing = await this.voteRepo.findByUserAndIdea(userId, ideaId);
    if (existing) throw new ConflictException('You have already voted on this idea');

    const vote = await this.voteRepo.create(ideaId, userId, comment);
    await this.ideaRepo.incrementVoteCount(ideaId, 1);
    return vote;
  }

  async removeVote(ideaId: string, userId: string): Promise<void> {
    const existing = await this.voteRepo.findByUserAndIdea(userId, ideaId);
    if (!existing) throw new NotFoundException('Vote not found');

    await this.voteRepo.delete(existing.id, ideaId);
    await this.ideaRepo.incrementVoteCount(ideaId, -1);
  }

  delete(id: string): Promise<void> {
    return this.ideaRepo.softDelete(id);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  getComments(ideaId: string): Promise<Comment[]> {
    return this.commentRepo.findByIdea(ideaId);
  }

  getCommentCount(ideaId: string): Promise<number> {
    return this.commentRepo.countByIdea(ideaId);
  }

  async addComment(ideaId: string, userId: string, content: string): Promise<Comment> {
    await this.findById(ideaId); // ensure idea exists
    return this.commentRepo.create(ideaId, userId, content);
  }

  async deleteComment(commentId: string, ideaId: string): Promise<void> {
    await this.commentRepo.softDelete(commentId, ideaId);
  }
}
