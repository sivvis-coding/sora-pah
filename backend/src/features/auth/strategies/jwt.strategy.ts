import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const isDevMode = configService.get('AUTH_DEV_MODE') === 'true';
    const devSecret = configService.get('AUTH_DEV_SECRET') || 'sora-dev-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: isDevMode,
      // In dev mode: use a symmetric secret.
      // In production: use Azure AD JWKS endpoint.
      ...(isDevMode
        ? { secretOrKey: devSecret }
        : {
            secretOrKeyProvider: (_req: any, _token: any, done: any) => {
              // Dynamic JWKS fetch for Azure AD
              const jwksClient = require('jwks-rsa')({
                jwksUri: `https://login.microsoftonline.com/${configService.get('AZURE_AD_TENANT_ID')}/discovery/v2.0/keys`,
                cache: true,
                rateLimit: true,
              });
              const jwt = require('jsonwebtoken');
              const decoded = jwt.decode(_token, { complete: true });
              if (!decoded?.header?.kid) {
                return done(new UnauthorizedException('Invalid token'));
              }
              jwksClient.getSigningKey(
                decoded.header.kid,
                (err: any, key: any) => {
                  if (err) return done(err);
                  done(null, key.getPublicKey());
                },
              );
            },
            audience: configService.get('AZURE_AD_CLIENT_ID'),
          }),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.oid && !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Auto-create user on first login
    return this.authService.validateOrCreateUser(payload);
  }
}
