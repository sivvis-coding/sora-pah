import { Injectable, Inject } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Decision } from '../interfaces/decision.interface';
import { CreateDecisionDto } from '../dto/create-decision.dto';

const CONTAINER = 'decisions';

@Injectable()
export class DecisionRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Decision[]> {
    const { resources } = await this.container.items
      .query<Decision>('SELECT * FROM c ORDER BY c.createdAt DESC')
      .fetchAll();
    return resources;
  }

  async create(dto: CreateDecisionDto, createdBy: string): Promise<Decision> {
    const decision: Decision = {
      id: uuid(),
      title: dto.title,
      rationale: dto.rationale,
      linkedIdeaIds: dto.linkedIdeaIds ?? [],
      createdBy,
      createdAt: new Date().toISOString(),
    };
    await this.container.items.create(decision);
    return decision;
  }
}
