import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { MsGraphService } from '../../integrations/msgraph.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { User } from './interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';

@Injectable()
export class UsersService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly graphService: MsGraphService,
  ) {}

  findAll(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  async findById(id: string): Promise<User | undefined> {
    return this.userRepo.findById(id);
  }

  findByOid(oid: string): Promise<User | undefined> {
    return this.userRepo.findByOid(oid);
  }

  create(dto: CreateUserDto): Promise<User> {
    return this.userRepo.create(dto);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    return this.userRepo.update(id, dto);
  }

  /**
   * Invite a user from Azure AD by email.
   * Resolves the AAD profile via Graph, fetches their photo,
   * then creates or updates the SORA user in Cosmos.
   */
  async invite(dto: InviteUserDto): Promise<User> {
    // Resolve user in Azure AD
    const aadUser = await this.graphService.resolveByEmail(dto.email);
    if (!aadUser) {
      throw new BadRequestException(
        `No Azure AD user found with email: ${dto.email}`,
      );
    }

    // Fetch their photo
    const photoBase64 = await this.graphService.getUserPhoto(aadUser.oid);

    // Create or update in Cosmos
    return this.userRepo.upsertByOid({
      oid: aadUser.oid,
      email: aadUser.mail || aadUser.userPrincipalName,
      name: aadUser.displayName,
      role: dto.role ?? UserRole.STANDARD,
      vipLevel: dto.vipLevel ?? 0,
      photoBase64: photoBase64 ?? undefined,
      department: aadUser.department ?? undefined,
      jobTitle: aadUser.jobTitle ?? undefined,
    });
  }

  /**
   * Get user's cached avatar (base64).
   * If not cached, try to fetch from Graph and cache it.
   */
  async getAvatar(id: string): Promise<string | null> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);

    // Return cached photo if available
    if (user.photoBase64) return user.photoBase64;

    // Try to fetch from Graph and cache it
    const photo = await this.graphService.getUserPhoto(user.oid);
    if (photo) {
      await this.userRepo.update(id, { photoBase64: photo });
    }
    return photo;
  }
}
