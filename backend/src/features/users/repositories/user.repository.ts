import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Database } from '@azure/cosmos';
import { v4 as uuid } from 'uuid';
import { COSMOS_DATABASE } from '../../../database/cosmos.provider';
import { User } from '../interfaces/user.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRole } from '../../../common/constants/user-role';

const CONTAINER = 'users';

const USER_FIELDS: (keyof User)[] = [
  'id', 'oid', 'email', 'name', 'role', 'vipLevel',
  'createdAt', 'isDeleted', 'deletedAt', 'photoBase64',
  'department', 'jobTitle', 'hasSeenLanding',
];

/** Strip Cosmos-internal fields (_rid, _self, _etag, etc.) */
function sanitize(raw: User): User {
  const clean = {} as User;
  for (const key of USER_FIELDS) {
    if (key in raw) (clean as any)[key] = raw[key];
  }
  return clean;
}

@Injectable()
export class UserRepository {
  constructor(@Inject(COSMOS_DATABASE) private readonly db: Database) {}

  private get container() {
    return this.db.container(CONTAINER);
  }

  async findAll(): Promise<User[]> {
    const { resources } = await this.container.items
      .query<User>('SELECT * FROM c WHERE c.isDeleted = false')
      .fetchAll();
    return resources.map(sanitize);
  }

  async findById(id: string): Promise<User | undefined> {
    try {
      const { resource } = await this.container.item(id, id).read<User>();
      if (!resource || resource.isDeleted) return undefined;
      return sanitize(resource);
    } catch {
      return undefined;
    }
  }

  async findByOid(oid: string): Promise<User | undefined> {
    const { resources } = await this.container.items
      .query<User>({
        query: 'SELECT * FROM c WHERE c.oid = @oid AND c.isDeleted = false',
        parameters: [{ name: '@oid', value: oid }],
      })
      .fetchAll();
    return resources[0] ? sanitize(resources[0]) : undefined;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const user: User = {
      id: uuid(),
      oid: dto.oid,
      email: dto.email,
      name: dto.name,
      role: dto.role ?? UserRole.STANDARD,
      vipLevel: 0,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
      hasSeenLanding: false,
      department: dto.department,
      jobTitle: dto.jobTitle,
    };
    const { resource } = await this.container.items.create<User>(user);
    return sanitize(resource!);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);
    const updated: User = { ...existing, ...dto };
    const { resource } = await this.container.item(id, id).replace<User>(updated);
    return sanitize(resource!);
  }

  async softDelete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException(`User ${id} not found`);
    const updated: User = {
      ...existing,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    };
    await this.container.item(id, id).replace<User>(updated);
  }

  /**
   * Create or update a user by Azure AD oid.
   * Used by the invite flow — if user exists, updates role/vipLevel/metadata.
   */
  async upsertByOid(data: {
    oid: string;
    email: string;
    name: string;
    role: UserRole;
    vipLevel: number;
    photoBase64?: string;
    department?: string;
    jobTitle?: string;
  }): Promise<User> {
    const existing = await this.findByOid(data.oid);
    if (existing) {
      const updated: User = {
        ...existing,
        name: data.name,
        email: data.email,
        role: data.role,
        vipLevel: data.vipLevel,
        photoBase64: data.photoBase64 ?? existing.photoBase64,
        department: data.department ?? existing.department,
        jobTitle: data.jobTitle ?? existing.jobTitle,
      };
      const { resource } = await this.container.item(existing.id, existing.id).replace<User>(updated);
      return sanitize(resource!);
    }

    const user: User = {
      id: uuid(),
      oid: data.oid,
      email: data.email,
      name: data.name,
      role: data.role,
      vipLevel: data.vipLevel,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      deletedAt: null,
      hasSeenLanding: false,
      photoBase64: data.photoBase64,
      department: data.department,
      jobTitle: data.jobTitle,
    };
    const { resource } = await this.container.items.create<User>(user);
    return sanitize(resource!);
  }
}
