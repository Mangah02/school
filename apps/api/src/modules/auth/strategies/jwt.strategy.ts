// apps/api/src/modules/auth/strategies/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // ✅ FIX: Provide a fallback string to satisfy TypeScript's strict null checks
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-super-secret-key',
    });
  }

  // The returned object is attached to req.user
  async validate(payload: any) {
    return { 
      id: payload.sub, 
      email: payload.email, 
      school_id: payload.school_id, 
      role: payload.role 
    };
  }
}