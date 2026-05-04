import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Question, Answer } from '../interfaces/question.interface';

const CONTAINER = 'questions';

const FIELDS: (keyof Question)[] = [
  'id', 'content', 'authorId', 'authorName', 'answers',
  'resolved', 'createdAt', 'updatedAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: Question): Question {
  const clean = {} as Question;
  for (const key of FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  // Default for array field — safety net
  clean.answers = (clean.answers ?? []).map((a: any) => ({
    ...a,
    isBot: a.isBot ?? false,
  }));
  clean.resolved = clean.resolved ?? false;
  return clean;
}

@Injectable()
export class QuestionRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Question[]> {
    const { resources } = await this.container.items
      .query<Question>('SELECT * FROM c WHERE c.isDeleted = false ORDER BY c.createdAt DESC')
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<Question | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Question>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(content: string, authorId: string, authorName: string): Promise<Question> {
    const now = new Date().toISOString();
    const question: Question = {
      id: uuid(),
      content,
      authorId,
      authorName,
      answers: [],
      resolved: false,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<Question>(question);
    return sanitize(resource!);
  }

  async addAnswer(
    questionId: string,
    content: string,
    authorId: string,
    authorName: string,
    isBot = false,
  ): Promise<Question> {
    const existing = await this.findById(questionId);
    if (!existing) throw new NotFoundException(`Question ${questionId} not found`);

    const answer: Answer = {
      id: uuid(),
      content,
      authorId,
      authorName,
      isAccepted: false,
      isBot,
      createdAt: new Date().toISOString(),
    };

    const updated: Question = {
      ...existing,
      answers: [...existing.answers, answer],
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(questionId, questionId).replace<Question>(updated);
    return sanitize(resource!);
  }

  async acceptAnswer(questionId: string, answerId: string): Promise<Question> {
    const existing = await this.findById(questionId);
    if (!existing) throw new NotFoundException(`Question ${questionId} not found`);

    const updated: Question = {
      ...existing,
      resolved: true,
      answers: existing.answers.map((a) =>
        a.id === answerId ? { ...a, isAccepted: true } : { ...a, isAccepted: false },
      ),
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(questionId, questionId).replace<Question>(updated);
    return sanitize(resource!);
  }

  async resolve(questionId: string): Promise<Question> {
    const existing = await this.findById(questionId);
    if (!existing) throw new NotFoundException(`Question ${questionId} not found`);
    const updated: Question = {
      ...existing,
      resolved: true,
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(questionId, questionId).replace<Question>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Question ${id} not found`);
    const updated: Question = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<Question>(updated);
  }

  async searchByText(text: string): Promise<Question[]> {
    const { resources } = await this.container.items
      .query<Question>({
        query: 'SELECT * FROM c WHERE c.isDeleted = false AND CONTAINS(LOWER(c.content), @text) ORDER BY c.createdAt DESC',
        parameters: [{ name: '@text', value: text.toLowerCase() }],
      })
      .fetchAll();
    return resources.map(sanitize);
  }
}
