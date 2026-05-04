import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Idea, IdeaUserStory } from '../interfaces/idea.interface';
import { IdeaStatus } from '../constants/idea-status';
import { CreateIdeaDto } from '../dto/create-idea.dto';

const CONTAINER = 'ideas';

const IDEA_FIELDS: (keyof Idea)[] = [
  'id', 'title', 'description', 'problem', 'value', 'solutionIdea',
  'productId', 'tagIds', 'createdBy', 'status', 'discardReason',
  'decisionId', 'userStory', 'voteCount', 'createdAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: Idea): Idea {
  const clean = {} as Idea;
  for (const key of IDEA_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class IdeaRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Idea[]> {
    const { resources } = await this.container.items
      .query<Idea>("SELECT * FROM c WHERE c.isDeleted = false AND c.status = 'open' ORDER BY c.voteCount DESC")
      .fetchAll();
    return resources.map(sanitize);
  }

  async findClosed(): Promise<Idea[]> {
    const { resources } = await this.container.items
      .query<Idea>("SELECT * FROM c WHERE c.isDeleted = false AND c.status != 'open' ORDER BY c.createdAt DESC")
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<Idea | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Idea>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateIdeaDto, createdBy: string): Promise<Idea> {
    const idea: Idea = {
      id: uuid(),
      title: dto.title,
      description: dto.description,
      problem: dto.problem,
      value: dto.value,
      solutionIdea: dto.solutionIdea ?? null,
      productId: dto.productId ?? null,
      tagIds: dto.tagIds ?? [],
      createdBy,
      status: IdeaStatus.OPEN,
      discardReason: null,
      decisionId: null,
      userStory: null,
      voteCount: 0,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<Idea>(idea);
    return sanitize(resource!);
  }

  async updateStatus(id: string, status: IdeaStatus, discardReason?: string): Promise<Idea> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Idea ${id} not found`);
    const updated: Idea = {
      ...existing,
      status,
      discardReason: status === IdeaStatus.DISCARDED ? (discardReason ?? null) : null,
    };
    const { resource } = await this.container.item(id, id).replace<Idea>(updated);
    return sanitize(resource!);
  }

  async incrementVoteCount(id: string, delta: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Idea ${id} not found`);
    const updated: Idea = { ...existing, voteCount: existing.voteCount + delta };
    await this.container.item(id, id).replace<Idea>(updated);
  }

  async updateUserStory(id: string, userStory: IdeaUserStory): Promise<Idea> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Idea ${id} not found`);
    const updated: Idea = { ...existing, userStory };
    const { resource } = await this.container.item(id, id).replace<Idea>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Idea ${id} not found`);
    const updated: Idea = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<Idea>(updated);
  }

  async updateTags(id: string, tagIds: string[]): Promise<Idea> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Idea ${id} not found`);
    const updated: Idea = { ...existing, tagIds };
    const { resource } = await this.container.item(id, id).replace<Idea>(updated);
    return sanitize(resource!);
  }
}
