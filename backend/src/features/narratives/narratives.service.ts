import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NarrativeRepository } from './repositories/narrative.repository';
import { ClickupService, ClickupTask } from '../../integrations/clickup.service';
import { CreateNarrativeDto } from './dto/create-narrative.dto';
import { UpdateNarrativeDto } from './dto/update-narrative.dto';
import { Narrative } from './interfaces/narrative.interface';

export interface NarrativeWithStatus extends Narrative {
  executionStatus: 'to do' | 'in progress' | 'done' | 'unknown';
  clickupTasks: ClickupTask[];
}

@Injectable()
export class NarrativesService {
  private readonly clickupListId: string;

  constructor(
    private readonly repo: NarrativeRepository,
    private readonly clickup: ClickupService,
    private readonly config: ConfigService,
  ) {
    this.clickupListId = this.config.get<string>('CLICKUP_LIST_ID', '');
  }

  async findAll(): Promise<NarrativeWithStatus[]> {
    const narratives = await this.repo.findAll();

    // Fetch all ClickUp tasks once (cached per request)
    const allTasks = this.clickupListId
      ? await this.clickup.getTasks(this.clickupListId)
      : [];
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));

    return narratives.map((n) => this.enrichWithStatus(n, taskMap));
  }

  async findById(id: string): Promise<NarrativeWithStatus> {
    const narrative = await this.repo.findById(id);
    if (!narrative) throw new NotFoundException('Narrative not found');

    const allTasks = this.clickupListId
      ? await this.clickup.getTasks(this.clickupListId)
      : [];
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));

    return this.enrichWithStatus(narrative, taskMap);
  }

  async create(dto: CreateNarrativeDto, createdBy: string): Promise<Narrative> {
    return this.repo.create(dto, createdBy);
  }

  async update(id: string, dto: UpdateNarrativeDto): Promise<Narrative> {
    const updated = await this.repo.update(id, dto);
    if (!updated) throw new NotFoundException('Narrative not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.repo.softDelete(id);
    if (!deleted) throw new NotFoundException('Narrative not found');
  }

  /**
   * Returns active ClickUp tasks for the home feed — "Work in Progress".
   */
  async getWorkInProgress(): Promise<ClickupTask[]> {
    if (!this.clickupListId) return [];
    const tasks = await this.clickup.getTasks(this.clickupListId);
    // Only show tasks that are actively being worked on (not done/closed)
    return tasks.filter(
      (t) => !['done', 'closed', 'complete'].includes(t.status.toLowerCase()),
    );
  }

  private enrichWithStatus(
    narrative: Narrative,
    taskMap: Map<string, ClickupTask>,
  ): NarrativeWithStatus {
    const linkedTasks = narrative.clickupTaskIds
      .map((id) => taskMap.get(id))
      .filter(Boolean) as ClickupTask[];

    let executionStatus: NarrativeWithStatus['executionStatus'] = 'unknown';
    if (linkedTasks.length > 0) {
      const statuses = linkedTasks.map((t) => t.status.toLowerCase());
      if (statuses.every((s) => ['done', 'closed', 'complete'].includes(s))) {
        executionStatus = 'done';
      } else if (statuses.some((s) => s.includes('progress') || s === 'in development')) {
        executionStatus = 'in progress';
      } else {
        executionStatus = 'to do';
      }
    }

    return { ...narrative, executionStatus, clickupTasks: linkedTasks };
  }
}
