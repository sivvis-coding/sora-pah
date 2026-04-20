import { Injectable } from '@nestjs/common';
import { DecisionRepository } from './repositories/decision.repository';
import { CreateDecisionDto } from './dto/create-decision.dto';
import { Decision } from './interfaces/decision.interface';

@Injectable()
export class DecisionsService {
  constructor(private readonly repo: DecisionRepository) {}

  findAll(): Promise<Decision[]> {
    return this.repo.findAll();
  }

  create(dto: CreateDecisionDto, createdBy: string): Promise<Decision> {
    return this.repo.create(dto, createdBy);
  }
}
