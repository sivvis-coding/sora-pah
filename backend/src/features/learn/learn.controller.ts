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
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';
import { LearnService } from './learn.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { UpdateTrainingSessionDto } from './dto/update-training-session.dto';
import { JoinTrainingDto } from './dto/join-training.dto';
import { CreateDocRequestDto } from './dto/create-doc-request.dto';
import { UpdateDocRequestDto } from './dto/update-doc-request.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { SuggestDto } from './dto/suggest.dto';

@Controller('learn')
export class LearnController {
  constructor(private readonly learnService: LearnService) {}

  // ─── Suggestions ────────────────────────────────────────────────────────────

  @Post('suggest')
  @HttpCode(HttpStatus.OK)
  async suggest(@Body() dto: SuggestDto) {
    const questions = await this.learnService.searchQuestions(dto.text);
    return {
      questions: questions.slice(0, 5).map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        answerCount: q.answers.length,
        resolved: q.resolved,
      })),
    };
  }

  // ─── Questions ──────────────────────────────────────────────────────────────

  @Get('questions')
  findAllQuestions() {
    return this.learnService.findAllQuestions();
  }

  @Get('questions/:id')
  findQuestion(@Param('id') id: string) {
    return this.learnService.findQuestionById(id);
  }

  @Post('questions')
  createQuestion(@Body() dto: CreateQuestionDto, @CurrentUser() user: User) {
    return this.learnService.createQuestion(dto.content, user.id, user.name);
  }

  @Post('questions/:id/answers')
  addAnswer(
    @Param('id') id: string,
    @Body() dto: CreateAnswerDto,
    @CurrentUser() user: User,
  ) {
    return this.learnService.addAnswer(id, dto.content, user.id, user.name);
  }

  @Patch('questions/:id/accept/:answerId')
  @HttpCode(HttpStatus.OK)
  acceptAnswer(@Param('id') id: string, @Param('answerId') answerId: string) {
    return this.learnService.acceptAnswer(id, answerId);
  }

  @Patch('questions/:id/resolve')
  @HttpCode(HttpStatus.OK)
  resolveQuestion(@Param('id') id: string) {
    return this.learnService.resolveQuestion(id);
  }

  /** Owner or admin can delete */
  @Delete('questions/:id')
  @HttpCode(HttpStatus.OK)
  async deleteQuestion(@Param('id') id: string, @CurrentUser() user: User) {
    const isAdmin = user.role === UserRole.ADMIN;
    await this.learnService.deleteQuestion(id, user.id, isAdmin);
    return { deleted: true };
  }

  /** Admin: manually trigger bot RAG lookup on a question (returns diagnostics) */
  @Post('questions/:id/bot-answer')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  triggerBotAnswer(@Param('id') id: string) {
    return this.learnService.triggerBotAnswer(id);
  }

  // ─── Training ───────────────────────────────────────────────────────────────

  @Get('training')
  findAllTraining() {
    return this.learnService.findAllTrainingSessions();
  }

  @Get('training/:id')
  findTraining(@Param('id') id: string) {
    return this.learnService.findTrainingSessionById(id);
  }

  /** Anyone can propose training */
  @Post('training')
  createTraining(@Body() dto: CreateTrainingSessionDto, @CurrentUser() user: User) {
    return this.learnService.createTrainingSession(dto, user.id, user.name);
  }

  /** Admin schedules / updates status */
  @Patch('training/:id')
  @Roles(UserRole.ADMIN)
  updateTraining(@Param('id') id: string, @Body() dto: UpdateTrainingSessionDto) {
    return this.learnService.updateTrainingSession(id, dto);
  }

  /** Join with availability preferences */
  @Post('training/:id/join')
  @HttpCode(HttpStatus.OK)
  joinTraining(
    @Param('id') id: string,
    @Body() dto: JoinTrainingDto,
    @CurrentUser() user: User,
  ) {
    return this.learnService.joinTrainingSession(id, {
      userId: user.id,
      userName: user.name,
      slots: dto.slots,
    });
  }

  @Post('training/:id/leave')
  @HttpCode(HttpStatus.OK)
  leaveTraining(@Param('id') id: string, @CurrentUser() user: User) {
    return this.learnService.leaveTrainingSession(id, user.id);
  }

  @Delete('training/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteTraining(@Param('id') id: string) {
    await this.learnService.deleteTrainingSession(id);
    return { deleted: true };
  }

  // ─── Doc Requests ───────────────────────────────────────────────────────────

  @Get('doc-requests')
  findAllDocRequests() {
    return this.learnService.findAllDocRequests();
  }

  @Get('doc-requests/:id')
  findDocRequest(@Param('id') id: string) {
    return this.learnService.findDocRequestById(id);
  }

  @Post('doc-requests')
  createDocRequest(@Body() dto: CreateDocRequestDto, @CurrentUser() user: User) {
    return this.learnService.createDocRequest(dto, user.id, user.name);
  }

  /** Admin updates status + links documentation */
  @Patch('doc-requests/:id')
  @Roles(UserRole.ADMIN)
  updateDocRequest(@Param('id') id: string, @Body() dto: UpdateDocRequestDto) {
    return this.learnService.updateDocRequest(id, dto);
  }

  @Post('doc-requests/:id/like')
  @HttpCode(HttpStatus.OK)
  toggleLike(@Param('id') id: string, @CurrentUser() user: User) {
    return this.learnService.toggleDocRequestLike(id, user.id);
  }

  @Post('doc-requests/:id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: User,
  ) {
    return this.learnService.addDocRequestComment(id, dto.content, user.id, user.name);
  }

  @Delete('doc-requests/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deleteDocRequest(@Param('id') id: string) {
    await this.learnService.deleteDocRequest(id);
    return { deleted: true };
  }
}
