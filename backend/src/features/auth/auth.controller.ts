import { Controller, Get, Post, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/interfaces/user.interface';

@Controller('auth')
export class AuthController {
  constructor(private configService: ConfigService) {}

  /**
   * Dev-only endpoint — returns a properly HS256-signed JWT so the frontend
   * can authenticate without a real Azure AD tenant.
   * Disabled in production (AUTH_DEV_MODE !== 'true').
   */
  @Post('dev-token')
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
      },
      secret,
      { algorithm: 'HS256', expiresIn: '24h' },
    );

    return { token };
  }

  /**
   * Returns the currently authenticated user's profile.
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: User) {
    return user;
  }
}
