import { Injectable, Inject } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Narrative } from '../interfaces/narrative.interface';
import { CreateNarrativeDto } from '../dto/create-narrative.dto';
import { UpdateNarrativeDto } from '../dto/update-narrative.dto';

const CONTAINER = 'narratives';

@Injectable()
export class NarrativeRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Narrative[]> {
    const { resources } = await this.container.items
      .query<Narrative>('SELECT * FROM c WHERE c.isDeleted = false ORDER BY c.createdAt DESC')
      .fetchAll();
    return resources;
  }

  async findById(id: string): Promise<Narrative | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Narrative>();
      return resource && !resource.isDeleted ? resource : undefined;
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateNarrativeDto, createdBy: string): Promise<Narrative> {
    const narrative: Narrative = {
      id: uuid(),
      title: dto.title,
      description: dto.description ?? '',
      why: dto.why,
      decisionId: dto.decisionId,
      originIdeaId: dto.originIdeaId,
      clickupTaskIds: dto.clickupTaskIds ?? [],
      createdBy,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };
    await this.container.items.create(narrative);
    return narrative;
  }

  async update(id: string, dto: UpdateNarrativeDto): Promise<Narrative | undefined> {
    const existing = await this.findById(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...dto };
    await this.container.item(id, id).replace(updated);
    return updated;
  }

  async softDelete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;

    existing.isDeleted = true;
    existing.deletedAt = new Date().toISOString();
    await this.container.item(id, id).replace(existing);
    return true;
  }
}
