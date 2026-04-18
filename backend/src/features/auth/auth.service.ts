import { Injectable, Logger } from '@nestjs/common';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UsersService } from '../users/users.service';
import { User } from '../users/interfaces/user.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private usersService: UsersService) {}

  /**
   * Validates token payload and auto-creates user on first login.
   * Returns the full User record to be attached to request.
   */
  async validateOrCreateUser(payload: JwtPayload): Promise<User> {
    const existing = this.usersService.findByOid(payload.oid);
    if (existing) {
      return existing;
    }

    this.logger.log(`Auto-creating user: ${payload.email} (${payload.oid})`);
    return this.usersService.create({
      email: payload.email,
      name: payload.name,
      oid: payload.oid,
    });
  }
}
