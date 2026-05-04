import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { QuestionRepository } from './repositories/question.repository';
import { TrainingSessionRepository } from './repositories/training-session.repository';
import { DocRequestRepository } from './repositories/doc-request.repository';
import { RagService } from '../../integrations/rag/rag.service';
import { AIService } from '../../integrations/ai.service';
import { CreateTrainingSessionDto } from './dto/create-training-session.dto';
import { CreateDocRequestDto } from './dto/create-doc-request.dto';
import { Question } from './interfaces/question.interface';
import { TrainingSession, TrainingAvailability } from './interfaces/training-session.interface';
import { DocRequest, DocRequestStatus } from './interfaces/doc-request.interface';

export interface BotAnswerResult {
  answered: boolean;
  reason: 'found' | 'no_index' | 'no_results' | 'cannot_answer' | 'no_ai';
  chunkCount: number;
  topResult?: { pageTitle: string; docTitle: string; pageUrl: string };
  /** LLM's explanation when it decides not to answer */
  llmReason?: string;
}

const BOT_USER_ID = 'sora-assistant';
const BOT_USER_NAME = 'Sora Assistant';

@Injectable()
export class LearnService {
  private readonly logger = new Logger(LearnService.name);

  constructor(
    private readonly questionRepo: QuestionRepository,
    private readonly trainingRepo: TrainingSessionRepository,
    private readonly docRequestRepo: DocRequestRepository,
    private readonly ragService: RagService,
    private readonly aiService: AIService,
  ) {}

  // ─── Questions ──────────────────────────────────────────────────────────────

  findAllQuestions(): Promise<Question[]> {
    return this.questionRepo.findAll();
  }

  async findQuestionById(id: string): Promise<Question> {
    const q = await this.questionRepo.findById(id);
    if (!q) throw new NotFoundException(`Question ${id} not found`);
    return q;
  }

  async createQuestion(content: string, userId: string, userName: string): Promise<Question> {
    const question = await this.questionRepo.create(content, userId, userName);

    // Fire-and-forget: try to auto-answer from indexed docs
    this.tryAutoAnswer(question.id, content).catch((err) => {
      this.logger.warn(`RAG auto-answer failed for question ${question.id}: ${err.message}`);
    });

    return question;
  }

  addAnswer(questionId: string, content: string, userId: string, userName: string): Promise<Question> {
    return this.questionRepo.addAnswer(questionId, content, userId, userName);
  }

  acceptAnswer(questionId: string, answerId: string): Promise<Question> {
    return this.questionRepo.acceptAnswer(questionId, answerId);
  }

  resolveQuestion(questionId: string): Promise<Question> {
    return this.questionRepo.resolve(questionId);
  }

  async deleteQuestion(id: string, userId: string, isAdmin: boolean): Promise<void> {
    const question = await this.findQuestionById(id);
    if (!isAdmin && question.authorId !== userId) {
      throw new ForbiddenException('Only the author or an admin can delete this question');
    }
    return this.questionRepo.softDelete(id);
  }

  searchQuestions(text: string): Promise<Question[]> {
    return this.questionRepo.searchByText(text);
  }

  // ─── RAG auto-answer ───────────────────────────────────────────────────────

  /** Result of a bot answer attempt — used for diagnostics */
  async triggerBotAnswer(questionId: string): Promise<BotAnswerResult> {
    const question = await this.findQuestionById(questionId);
    return this.tryAutoAnswer(question.id, question.content);
  }

  /**
   * Attempt to auto-answer a question using RAG + LLM.
   *
   * Flow:
   *   1. Check RAG index exists
   *   2. Retrieve top chunks via vector search
   *   3. Send question + chunks to LLM — the LLM decides if it can answer
   *   4. If LLM says yes → post answer as bot
   *   5. If LLM says no → return why (diagnostic)
   *
   * The LLM decides relevance, not a cosine threshold.
   */
  private async tryAutoAnswer(questionId: string, content: string): Promise<BotAnswerResult> {
    const hasIndex = await this.ragService.hasIndex();
    if (!hasIndex.indexed) {
      this.logger.warn(`RAG auto-answer skipped for ${questionId}: no index`);
      return { answered: false, reason: 'no_index', chunkCount: 0 };
    }

    const chunks = await this.ragService.retrieve(content, 5);
    if (chunks.length === 0) {
      this.logger.warn(`RAG auto-answer skipped for ${questionId}: no chunks returned`);
      return { answered: false, reason: 'no_results', chunkCount: 0 };
    }

    const best = chunks[0];

    // Ask the LLM to decide
    const result = await this.aiService.answerLearnQuestion(content, chunks);

    if (!result) {
      this.logger.warn(`RAG auto-answer skipped for ${questionId}: AI not configured`);
      return {
        answered: false,
        reason: 'no_ai',
        chunkCount: chunks.length,
        topResult: { pageTitle: best.pageTitle, docTitle: best.docTitle, pageUrl: best.pageUrl },
      };
    }

    if (!result.canAnswer) {
      this.logger.log(
        `RAG auto-answer: LLM declined for ${questionId} — "${result.reason}"`,
      );
      return {
        answered: false,
        reason: 'cannot_answer',
        chunkCount: chunks.length,
        topResult: { pageTitle: best.pageTitle, docTitle: best.docTitle, pageUrl: best.pageUrl },
        llmReason: result.reason,
      };
    }

    await this.questionRepo.addAnswer(
      questionId,
      result.answer,
      BOT_USER_ID,
      BOT_USER_NAME,
      true,
    );

    this.logger.log(
      `Auto-answered question ${questionId} from LLM (top chunk: "${best.docTitle} > ${best.pageTitle}")`,
    );

    return {
      answered: true,
      reason: 'found',
      chunkCount: chunks.length,
      topResult: { pageTitle: best.pageTitle, docTitle: best.docTitle, pageUrl: best.pageUrl },
    };
  }

  // ─── Training Sessions ──────────────────────────────────────────────────────

  findAllTrainingSessions(): Promise<TrainingSession[]> {
    return this.trainingRepo.findAll();
  }

  async findTrainingSessionById(id: string): Promise<TrainingSession> {
    const s = await this.trainingRepo.findById(id);
    if (!s) throw new NotFoundException(`Training session ${id} not found`);
    return s;
  }

  createTrainingSession(
    dto: CreateTrainingSessionDto,
    userId: string,
    userName: string,
  ): Promise<TrainingSession> {
    return this.trainingRepo.create(dto, userId, userName);
  }

  updateTrainingSession(id: string, partial: Partial<TrainingSession>): Promise<TrainingSession> {
    return this.trainingRepo.update(id, partial);
  }

  joinTrainingSession(id: string, availability: TrainingAvailability): Promise<TrainingSession> {
    return this.trainingRepo.join(id, availability);
  }

  leaveTrainingSession(id: string, userId: string): Promise<TrainingSession> {
    return this.trainingRepo.leave(id, userId);
  }

  deleteTrainingSession(id: string): Promise<void> {
    return this.trainingRepo.softDelete(id);
  }

  // ─── Doc Requests ───────────────────────────────────────────────────────────

  findAllDocRequests(): Promise<DocRequest[]> {
    return this.docRequestRepo.findAll();
  }

  async findDocRequestById(id: string): Promise<DocRequest> {
    const r = await this.docRequestRepo.findById(id);
    if (!r) throw new NotFoundException(`Doc request ${id} not found`);
    return r;
  }

  createDocRequest(dto: CreateDocRequestDto, userId: string, userName: string): Promise<DocRequest> {
    return this.docRequestRepo.create(dto, userId, userName);
  }

  updateDocRequest(
    id: string,
    partial: { status?: DocRequestStatus; linkedDocUrl?: string; linkedDocTitle?: string },
  ): Promise<DocRequest> {
    return this.docRequestRepo.update(id, partial);
  }

  toggleDocRequestLike(id: string, userId: string): Promise<DocRequest> {
    return this.docRequestRepo.toggleLike(id, userId);
  }

  addDocRequestComment(id: string, content: string, userId: string, userName: string): Promise<DocRequest> {
    return this.docRequestRepo.addComment(id, content, userId, userName);
  }

  deleteDocRequest(id: string): Promise<void> {
    return this.docRequestRepo.softDelete(id);
  }
}
