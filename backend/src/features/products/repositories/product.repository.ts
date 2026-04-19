import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { Product } from '../interfaces/product.interface';
import { CreateProductDto } from '../dto/create-product.dto';
import { UpdateProductDto } from '../dto/update-product.dto';

const CONTAINER = 'products';

const PRODUCT_FIELDS: (keyof Product)[] = [
  'id', 'name', 'description', 'ownerId', 'createdAt', 'isDeleted', 'deletedAt',
];

function sanitize(raw: Product): Product {
  const clean = {} as Product;
  for (const key of PRODUCT_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class ProductRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<Product[]> {
    const { resources } = await this.container.items
      .query<Product>('SELECT * FROM c WHERE c.isDeleted = false')
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<Product | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<Product>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async create(dto: CreateProductDto, ownerId: string): Promise<Product> {
    const product: Product = {
      id: uuid(),
      name: dto.name,
      description: dto.description,
      ownerId,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
    };
    const { resource } = await this.container.items.create<Product>(product);
    return sanitize(resource!);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Product ${id} not found`);
    const updated: Product = { ...existing, ...dto };
    const { resource } = await this.container.item(id, id).replace<Product>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`Product ${id} not found`);
    const updated: Product = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<Product>(updated);
  }
}
