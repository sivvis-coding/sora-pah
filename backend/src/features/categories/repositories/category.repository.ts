import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Category } from '../interfaces/category.interface';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';

const CONTAINER = 'categories';

const CATEGORY_FIELDS: (keyof Category)[] = [
  'id', 'name', 'description', 'color', 'order', 'isActive',
  'createdAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: Category): Category {
  const clean = {} as Category;
  for (const key of CATEGORY_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class CategoryRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(activeOnly = false): Promise<Category[]> {
    const query = activeOnly
      ? 'SELECT * FROM c WHERE c.isDeleted = false AND c.isActive = true ORDER BY c.order ASC'
      : 'SELECT * FROM c WHERE c.isDeleted = false ORDER BY c.order ASC';
    const { resources } = await this.container.items
      .query<Category>(query)
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<Category | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Category>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const category: Category = {
      id: uuid(),
      name: dto.name,
      description: dto.description ?? null,
      color: dto.color ?? null,
      order: dto.order ?? 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<Category>(category);
    return sanitize(resource!);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Category ${id} not found`);
    const updated: Category = { ...existing, ...dto };
    const { resource } = await this.container.item(id, id).replace<Category>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Category ${id} not found`);
    const updated: Category = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<Category>(updated);
  }
}
