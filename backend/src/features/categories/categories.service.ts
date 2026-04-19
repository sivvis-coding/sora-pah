import { Injectable, NotFoundException } from '@nestjs/common';
import { CategoryRepository } from './repositories/category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './interfaces/category.interface';

@Injectable()
export class CategoriesService {
  constructor(private readonly categoryRepo: CategoryRepository) {}

  /** All authenticated users get active categories only */
  findActive(): Promise<Category[]> {
    return this.categoryRepo.findAll(true);
  }

  /** Admin gets all (including inactive) */
  findAll(): Promise<Category[]> {
    return this.categoryRepo.findAll(false);
  }

  async findById(id: string): Promise<Category> {
    const cat = await this.categoryRepo.findById(id);
    if (!cat) throw new NotFoundException(`Category ${id} not found`);
    return cat;
  }

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.categoryRepo.create(dto);
  }

  update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    return this.categoryRepo.update(id, dto);
  }

  delete(id: string): Promise<void> {
    return this.categoryRepo.softDelete(id);
  }
}
