import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { AuthService } from '../auth.service';
import { AppConfigService } from '../../../database/app-config.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private authService: AuthService,
    private appConfig: AppConfigService,
  ) {
    const isDevMode = configService.get('AUTH_DEV_MODE') === 'true';
    const devSecret = configService.get('AUTH_DEV_SECRET') || 'sora-dev-secret';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: isDevMode,
      // Dynamic key provider: routes HS256 (local admin) vs RS256 (Azure AD)
      secretOrKeyProvider: (
        _req: any,
        rawToken: string,
        done: (err: any, key?: string) => void,
      ) => {
        try {
          const decoded = jwt.decode(rawToken, { complete: true }) as jwt.Jwt | null;

          // HS256 → local admin token (bootstrap / dev-token)
          if (decoded?.header?.alg === 'HS256') {
            return done(null, devSecret);
          }

          // RS256 → Azure AD token via JWKS
          if (!decoded?.header?.kid) {
            return done(new UnauthorizedException('Invalid token: missing kid'));
          }

          // Read tenant ID dynamically from AppConfigService
          appConfig
            .get('azure_ad', 'tenantId')
            .then((tenantId) => {
              if (!tenantId) {
                return done(new UnauthorizedException('Azure AD not configured'));
              }

              const jwksClient = require('jwks-rsa')({
                jwksUri: `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`,
                cache: true,
                rateLimit: true,
              });

              jwksClient.getSigningKey(
                decoded!.header.kid,
                (err: any, key: any) => {
                  if (err) return done(err);
                  done(null, key.getPublicKey());
                },
              );
            })
            .catch((err: any) => done(err));
        } catch (err) {
          done(new UnauthorizedException('Invalid token'));
        }
      },
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.oid && !payload.email) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // For Azure AD tokens, validate audience dynamically
    if (payload.aud) {
      const clientId = await this.appConfig.get('azure_ad', 'clientId');
      if (clientId && payload.aud !== clientId) {
        throw new UnauthorizedException('Invalid audience');
      }
    }

    // Auto-create user on first login
    return this.authService.validateOrCreateUser(payload);
  }
}
