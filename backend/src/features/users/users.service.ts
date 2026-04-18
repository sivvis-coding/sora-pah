import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { User } from './interfaces/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

/**
 * In-memory user store. Will be replaced with Cosmos DB repository.
 */
@Injectable()
export class UsersService {
  private users: User[] = [];

  findAll(): User[] {
    return this.users;
  }

  findById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  findByOid(oid: string): User | undefined {
    return this.users.find((u) => u.oid === oid);
  }

  create(dto: CreateUserDto): User {
    const user: User = {
      id: uuid(),
      oid: dto.oid,
      email: dto.email,
      name: dto.name,
      role: dto.role || 'standard',
      vipLevel: 0,
      createdAt: new Date().toISOString(),
    };
    this.users.push(user);
    return user;
  }

  update(id: string, dto: UpdateUserDto): User | undefined {
    const user = this.findById(id);
    if (!user) return undefined;
    Object.assign(user, dto);
    return user;
  }
}
