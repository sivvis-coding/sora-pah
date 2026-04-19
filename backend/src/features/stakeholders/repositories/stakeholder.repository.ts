import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { StakeholderProfile } from '../interfaces/stakeholder-profile.interface';
import { AssignStakeholderDto } from '../dto/assign-stakeholder.dto';
import { UpdateStakeholderDto } from '../dto/update-stakeholder.dto';

const CONTAINER = 'stakeholders';

const STAKEHOLDER_FIELDS: (keyof StakeholderProfile)[] = [
  'id', 'userId', 'productId', 'weight', 'isVIP', 'isDeleted', 'deletedAt',
];

function sanitize(raw: StakeholderProfile): StakeholderProfile {
  const clean = {} as StakeholderProfile;
  for (const key of STAKEHOLDER_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class StakeholderRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findByProduct(productId: string): Promise<StakeholderProfile[]> {
    const { resources } = await this.container.items
      .query<StakeholderProfile>({
        query:
          'SELECT * FROM c WHERE c.productId = @productId AND c.isDeleted = false',
        parameters: [{ name: '@productId', value: productId }],
      })
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string, productId: string): Promise<StakeholderProfile | undefined> {
    try {
      const { resource } = await this.container
        .item(id, productId)
        .read<StakeholderProfile>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async findByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<StakeholderProfile | undefined> {
    const { resources } = await this.container.items
      .query<StakeholderProfile>({
        query:
          'SELECT * FROM c WHERE c.userId = @userId AND c.productId = @productId AND c.isDeleted = false',
        parameters: [
          { name: '@userId', value: userId },
          { name: '@productId', value: productId },
        ],
      })
      .fetchAll();
    return resources[0] ? sanitize(resources[0]) : undefined;
  }

  async assign(dto: AssignStakeholderDto): Promise<StakeholderProfile> {
    const existing = await this.findByUserAndProduct(dto.userId, dto.productId);
    if (existing) {
      throw new ConflictException(
        'User is already a stakeholder for this product',
      );
    }

    const profile: StakeholderProfile = {
      id: uuid(),
      userId: dto.userId,
      productId: dto.productId,
      weight: dto.weight,
      isVIP: dto.isVIP ?? false,
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<StakeholderProfile>(profile);
    return sanitize(resource!);
  }

  async updateWeight(
    id: string,
    productId: string,
    dto: UpdateStakeholderDto,
  ): Promise<StakeholderProfile> {
    const existing = await this.findById(id, productId);
    if (!existing) throw new NotFoundException(`Stakeholder profile ${id} not found`);
    const updated: StakeholderProfile = { ...existing, ...dto };
    const { resource } = await this.container
      .item(id, productId)
      .replace<StakeholderProfile>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string, productId: string): Promise<void> {
    const existing = await this.findById(id, productId);
    if (!existing) throw new NotFoundException(`Stakeholder profile ${id} not found`);
    const updated: StakeholderProfile = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, productId).replace<StakeholderProfile>(updated);
  }
}
