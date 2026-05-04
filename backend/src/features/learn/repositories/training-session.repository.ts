import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { TrainingSession, TrainingAvailability } from '../interfaces/training-session.interface';
import { CreateTrainingSessionDto } from '../dto/create-training-session.dto';

const CONTAINER = 'training-sessions';

const FIELDS: (keyof TrainingSession)[] = [
  'id', 'title', 'description', 'format', 'status',
  'proposedBy', 'proposedByName', 'attendees',
  'scheduledAt', 'durationMinutes', 'link', 'location',
  'createdAt', 'updatedAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: TrainingSession): TrainingSession {
  const clean = {} as TrainingSession;
  for (const key of FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  // Defaults for array/enum fields — old v1 documents may lack these
  clean.attendees = (clean.attendees ?? []).map((att: any) => {
    // Migrate v1 shape { dayPreferences, timePreference } → v2 { slots }
    if (att.slots) return att;
    const days: string[] = att.dayPreferences ?? [];
    const time: string = att.timePreference ?? 'all-day';
    return {
      userId: att.userId,
      userName: att.userName,
      slots: days.map((d: string) => ({ day: d, time })),
    };
  });
  clean.format = clean.format ?? 'either';
  clean.status = (['proposed', 'scheduled', 'completed', 'cancelled'].includes(clean.status))
    ? clean.status : 'proposed';
  return clean;
}

@Injectable()
export class TrainingSessionRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<TrainingSession[]> {
    const { resources } = await this.container.items
      .query<TrainingSession>('SELECT * FROM c WHERE c.isDeleted = false ORDER BY c.createdAt DESC')
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<TrainingSession | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<TrainingSession>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateTrainingSessionDto, userId: string, userName: string): Promise<TrainingSession> {
    const now = new Date().toISOString();
    const session: TrainingSession = {
      id: uuid(),
      title: dto.title,
      description: dto.description,
      format: dto.format ?? 'either',
      status: 'proposed',
      proposedBy: userId,
      proposedByName: userName,
      attendees: [],
      scheduledAt: null,
      durationMinutes: null,
      link: null,
      location: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<TrainingSession>(session);
    return sanitize(resource!);
  }

  async update(id: string, partial: Partial<TrainingSession>): Promise<TrainingSession> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Training session ${id} not found`);
    const updated: TrainingSession = {
      ...existing,
      ...partial,
      id: existing.id,
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<TrainingSession>(updated);
    return sanitize(resource!);
  }

  async join(id: string, availability: TrainingAvailability): Promise<TrainingSession> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Training session ${id} not found`);
    // Replace if already joined (update availability), otherwise add
    const filtered = existing.attendees.filter((a) => a.userId !== availability.userId);
    const updated: TrainingSession = {
      ...existing,
      attendees: [...filtered, availability],
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<TrainingSession>(updated);
    return sanitize(resource!);
  }

  async leave(id: string, userId: string): Promise<TrainingSession> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Training session ${id} not found`);
    const updated: TrainingSession = {
      ...existing,
      attendees: existing.attendees.filter((a) => a.userId !== userId),
      updatedAt: new Date().toISOString(),
    };
    const { resource } = await this.container.item(id, id).replace<TrainingSession>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Training session ${id} not found`);
    const updated: TrainingSession = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<TrainingSession>(updated);
  }
}
