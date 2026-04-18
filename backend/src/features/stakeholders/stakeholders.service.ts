import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { StakeholderProfile } from './interfaces/stakeholder-profile.interface';
import { AssignStakeholderDto } from './dto/assign-stakeholder.dto';
import { UpdateStakeholderDto } from './dto/update-stakeholder.dto';

@Injectable()
export class StakeholdersService {
  private profiles: StakeholderProfile[] = [];

  findByProduct(productId: string): StakeholderProfile[] {
    return this.profiles.filter((p) => p.productId === productId);
  }

  assign(dto: AssignStakeholderDto): StakeholderProfile {
    const existing = this.profiles.find(
      (p) => p.userId === dto.userId && p.productId === dto.productId,
    );
    if (existing) {
      throw new ConflictException('User is already a stakeholder for this product');
    }

    const profile: StakeholderProfile = {
      id: uuid(),
      userId: dto.userId,
      productId: dto.productId,
      weight: dto.weight,
      isVIP: dto.isVIP ?? false,
    };
    this.profiles.push(profile);
    return profile;
  }

  updateWeight(id: string, dto: UpdateStakeholderDto): StakeholderProfile {
    const profile = this.profiles.find((p) => p.id === id);
    if (!profile) throw new NotFoundException(`Stakeholder profile ${id} not found`);
    if (dto.weight !== undefined) profile.weight = dto.weight;
    return profile;
  }

  remove(id: string): void {
    const index = this.profiles.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Stakeholder profile ${id} not found`);
    this.profiles.splice(index, 1);
  }
}
