import { Injectable, NotFoundException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { Product } from './interfaces/product.interface';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/**
 * In-memory product store. Will be replaced with Cosmos DB repository.
 */
@Injectable()
export class ProductsService {
  private products: Product[] = [];

  findAll(): Product[] {
    return this.products;
  }

  findById(id: string): Product {
    const product = this.products.find((p) => p.id === id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(dto: CreateProductDto, ownerId: string): Product {
    const product: Product = {
      id: uuid(),
      name: dto.name,
      description: dto.description,
      ownerId,
      createdAt: new Date().toISOString(),
    };
    this.products.push(product);
    return product;
  }

  update(id: string, dto: UpdateProductDto): Product {
    const product = this.findById(id);
    Object.assign(product, dto);
    return product;
  }

  delete(id: string): void {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) throw new NotFoundException(`Product ${id} not found`);
    this.products.splice(index, 1);
  }
}
