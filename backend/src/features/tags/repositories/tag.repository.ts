import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Tag } from '../interfaces/tag.interface';
import { CreateTagDto } from '../dto/create-tag.dto';
import { UpdateTagDto } from '../dto/update-tag.dto';

const CONTAINER = 'tags';

// Palette rotated by index for auto-colour assignment
const PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
  '#f97316', '#a855f7',
];

@Injectable()
export class TagRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Tag[]> {
    const { resources } = await this.container.items
      .query<Tag>('SELECT * FROM c ORDER BY c.usageCount DESC')
      .fetchAll();
    return resources;
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map((_, i) => `@id${i}`).join(', ');
    const parameters = ids.map((id, i) => ({ name: `@id${i}`, value: id }));
    const { resources } = await this.container.items
      .query<Tag>({ query: `SELECT * FROM c WHERE c.id IN (${placeholders})`, parameters })
      .fetchAll();
    return resources;
  }

  async findByName(name: string): Promise<Tag | undefined> {
    const normalised = name.toLowerCase().trim();
    const { resources } = await this.container.items
      .query<Tag>({
        query: 'SELECT * FROM c WHERE c.name = @name',
        parameters: [{ name: '@name', value: normalised }],
      })
      .fetchAll();
    return resources[0];
  }

  async create(dto: CreateTagDto, createdBy: string): Promise<Tag> {
    const all = await this.findAll();
    const color = dto.color ?? PALETTE[all.length % PALETTE.length];
    const tag: Tag = {
      id: uuid(),
      name: dto.name.toLowerCase().trim(),
      color,
      usageCount: 0,
      createdBy,
      createdAt: new Date().toISOString(),
    };
    const { resource } = await this.container.items.create<Tag>(tag);
    return resource!;
  }

  async update(id: string, dto: UpdateTagDto): Promise<Tag> {
    const { resource: existing } = await this.container.item(id, id).read<Tag>();
    if (!existing) throw new NotFoundException(`Tag ${id} not found`);
    const updated: Tag = {
      ...existing,
      ...(dto.name ? { name: dto.name.toLowerCase().trim() } : {}),
      ...(dto.color ? { color: dto.color } : {}),
    };
    const { resource } = await this.container.item(id, id).replace<Tag>(updated);
    return resource!;
  }

  async delete(id: string): Promise<void> {
    await this.container.item(id, id).delete();
  }

  async incrementUsage(ids: string[], delta: 1 | -1): Promise<void> {
    await Promise.allSettled(
      ids.map(async (id) => {
        const { resource } = await this.container.item(id, id).read<Tag>();
        if (!resource) return;
        const updated: Tag = {
          ...resource,
          usageCount: Math.max(0, resource.usageCount + delta),
        };
        await this.container.item(id, id).replace<Tag>(updated);
      }),
    );
  }
}
