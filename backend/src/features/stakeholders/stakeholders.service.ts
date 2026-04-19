import { Injectable } from '@nestjs/common';
import { StakeholderRepository } from './repositories/stakeholder.repository';
import { AssignStakeholderDto } from './dto/assign-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';
import { StakeholderProfile } from './interfaces/stakeholder-profile.interface';

@Injectable()
export class StakeholdersService {
  constructor(private readonly stakeholderRepo: StakeholderRepository) {}

  findByProduct(productId: string): Promise<StakeholderProfile[]> {
    return this.stakeholderRepo.findByProduct(productId);
  }

  assign(dto: AssignStakeholderDto): Promise<StakeholderProfile> {
    return this.stakeholderRepo.assign(dto);
  }

  updateWeight(id: string, productId: string, dto: UpdateStakeholderDto): Promise<StakeholderProfile> {
    return this.stakeholderRepo.updateWeight(id, productId, dto);
  }

  remove(id: string, productId: string): Promise<void> {
    return this.stakeholderRepo.softDelete(id, productId);
  }
}
