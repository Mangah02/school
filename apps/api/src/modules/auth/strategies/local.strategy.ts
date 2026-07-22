// apps/api/src/modules/auth/strategies/local.strategy.ts
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    console.log('🛡️ [LocalStrategy] Constructor initialized');
    // Tell Passport to look for 'email' and 'password' in the request body
    super({ usernameField: 'email', passwordField: 'password' }); 
  }

  async validate(email: string, password: string): Promise<any> {
    console.log('🛡️ [LocalStrategy] validate() CALLED! Email:', email, 'Password length:', password?.length);
    
    const user = await this.authService.validateUser(email, password);
    
    if (!user) {
      console.log('❌ [LocalStrategy] validateUser returned null/false');
      throw new UnauthorizedException('Invalid email or password');
    }
    
    console.log('✅ [LocalStrategy] validateUser succeeded, returning user');
    return user;
  }
}