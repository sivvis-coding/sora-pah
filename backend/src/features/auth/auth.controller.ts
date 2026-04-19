import {
  Controller, Get, Post, Param,
  ForbiddenException, NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from '../users/users.service';
import { User } from '../users/interfaces/user.interface';
import { UserRole } from '../../common/constants/user-role';

@Controller('auth')
export class AuthController {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {}

  /**
   * Dev-only endpoint — returns a properly HS256-signed JWT.
   * Disabled in production (AUTH_DEV_MODE !== 'true').
   */
  @Post('dev-token')
  @Public()
  getDevToken() {
    if (this.configService.get('AUTH_DEV_MODE') !== 'true') {
      throw new ForbiddenException('Dev token endpoint is disabled in production');
    }

    const secret = this.configService.get('AUTH_DEV_SECRET') || 'sora-dev-secret';
    const token = jwt.sign(
      {
        oid: 'dev-user-oid-001',
        email: 'dev@sora.local',
        name: 'Dev User',
        preferred_username: 'dev@sora.local',
        role: UserRole.ADMIN,
      },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' },
    );

    return { token };
  }

  /**
   * Admin + dev-mode only — returns a signed JWT for another user.
   * Lets admins test the app from another user's perspective.
   */
  @Post('impersonate/:userId')
  @Roles(UserRole.ADMIN)
  async impersonate(@Param('userId') userId: string) {
    if (this.configService.get('AUTH_DEV_MODE') !== 'true') {
      throw new ForbiddenException('Impersonation only available in dev mode');
    }

    const target = await this.usersService.findById(userId);
    if (!target) throw new NotFoundException(`User ${userId} not found`);

    const secret = this.configService.get('AUTH_DEV_SECRET') || 'sora-dev-secret';
    const token = jwt.sign(
      {
        oid: target.oid,
        email: target.email,
        name: target.name,
        role: target.role,
      },
      secret,
      { algorithm: 'HS256', expiresIn: '4h' },
    );

    return { token };
  }

  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
