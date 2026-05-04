import { Injectable, ConflictException } from '@nestjs/common';
import { TagRepository } from './repositories/tag.repository';
import { Tag } from './interfaces/tag.interface';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly tagRepo: TagRepository) {}

  findAll(): Promise<Tag[]> {
    return this.tagRepo.findAll();
  }

  findByIds(ids: string[]): Promise<Tag[]> {
    return this.tagRepo.findByIds(ids);
  }

  async create(dto: CreateTagDto, createdBy: string): Promise<Tag> {
    const existing = await this.tagRepo.findByName(dto.name);
    if (existing) throw new ConflictException(`Tag "${dto.name}" already exists`);
    return this.tagRepo.create(dto, createdBy);
  }

  /**
   * Find-or-create by name. Used by AI suggestion flow and bulk tag apply.
   * Returns existing tag if name matches (case-insensitive), creates new otherwise.
   */
  async findOrCreate(name: string, createdBy: string): Promise<Tag> {
    const existing = await this.tagRepo.findByName(name);
    if (existing) return existing;
    return this.tagRepo.create({ name }, createdBy);
  }

  update(id: string, dto: UpdateTagDto): Promise<Tag> {
    return this.tagRepo.update(id, dto);
  }

  delete(id: string): Promise<void> {
    return this.tagRepo.delete(id);
  }

  incrementUsage(ids: string[], delta: 1 | -1): Promise<void> {
    return this.tagRepo.incrementUsage(ids, delta);
  }
}
