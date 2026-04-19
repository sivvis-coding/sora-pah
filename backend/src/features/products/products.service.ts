import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from './repositories/product.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './interfaces/product.interface';

@Injectable()
export class ProductsService {
  constructor(private readonly productRepo: ProductRepository) {}

  findAll(): Promise<Product[]> {
    return this.productRepo.findAll();
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepo.findById(id);
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  create(dto: CreateProductDto, ownerId: string): Promise<Product> {
    return this.productRepo.create(dto, ownerId);
  }

  update(id: string, dto: UpdateProductDto): Promise<Product> {
    return this.productRepo.update(id, dto);
  }

  delete(id: string): Promise<void> {
    return this.productRepo.softDelete(id);
  }
}
