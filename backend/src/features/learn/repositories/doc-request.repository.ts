import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { DocRequest, DocRequestComment } from '../interfaces/doc-request.interface';
import { CreateDocRequestDto } from '../dto/create-doc-request.dto';

const CONTAINER = 'doc-requests';

const FIELDS: (keyof DocRequest)[] = [
  'id', 'title', 'description', 'requestedBy', 'requestedByName',
  'status', 'linkedDocUrl', 'linkedDocTitle',
  'likeIds', 'comments', 'createdAt', 'updatedAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: DocRequest): DocRequest {
  const clean = {} as DocRequest;
  for (const key of FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  // Defaults for array fields — old v1 documents won't have these
  clean.likeIds = clean.likeIds ?? [];
  clean.comments = clean.comments ?? [];
  clean.description = clean.description ?? '';
  // Migrate old v1 statuses to current schema
  const s = clean.status as string;
  clean.status = (s === 'open' || s === 'documented') ? clean.status : 'open';
  return clean;
}

@Injectable()
export class DocRequestRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<DocRequest[]> {
    const { resources } = await this.container.items
      .query<DocRequest>('SELECT * FROM c WHERE c.isDeleted = false ORDER BY c.createdAt DESC')
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<DocRequest | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<DocRequest>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateDocRequestDto, userId: string, userName: string): Promise<DocRequest> {
    const now = new Date().toISOString();
    const request: DocRequest = {
      id: uuid(),
      title: dto.title,
      description: dto.description,
      requestedBy: userId,
      requestedByName: userName,
      status: 'open',
      linkedDocUrl: null,
      linkedDocTitle: null,
      likeIds: [],
      comments: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<DocRequest>(request);
    return sanitize(resource!);
  }

  async update(id: string, partial: Partial<DocRequest>): Promise<DocRequest> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Doc request ${id} not found`);
    const updated: DocRequest = {
      ...existing,
      ...partial,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<DocRequest>(updated);
    return sanitize(resource!);
  }

  async toggleLike(id: string, userId: string): Promise<DocRequest> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Doc request ${id} not found`);
    const hasLiked = existing.likeIds.includes(userId);
    const updated: DocRequest = {
      ...existing,
      likeIds: hasLiked
        ? existing.likeIds.filter((uid) => uid !== userId)
        : [...existing.likeIds, userId],
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<DocRequest>(updated);
    return sanitize(resource!);
  }

  async addComment(id: string, content: string, authorId: string, authorName: string): Promise<DocRequest> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Doc request ${id} not found`);
    const comment: DocRequestComment = {
      id: uuid(),
      content,
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
    };
    const updated: DocRequest = {
      ...existing,
      comments: [...existing.comments, comment],
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<DocRequest>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Doc request ${id} not found`);
    const updated: DocRequest = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<DocRequest>(updated);
  }
}
