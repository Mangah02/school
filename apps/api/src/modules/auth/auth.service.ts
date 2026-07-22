// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  // Safely get the underlying Redis client
  private get redisClient() {
    return this.redis.client;
  }

  async validateUser(email: string, password: string) {
    console.log('🔍 [DEBUG 1] validateUser called with email:', email);
    
    // ✅ FIX: Explicitly type attempts and safely parse Redis string to number
    let attempts: number = 0;
    try {
      const lockoutKey = `lockout:${email.toLowerCase()}`;
      const attemptsStr = await this.redisClient.get(lockoutKey);
      attempts = attemptsStr ? Number(attemptsStr) : 0;
      console.log('🔍 [DEBUG 2] Redis lockout attempts:', attempts);
    } catch (e: any) {
      console.warn('⚠️ Redis lockout check skipped (degraded mode):', e.message);
    }
    
    if (attempts >= 4) {
      this.logger.warn(`Locked account login attempt for ${email}`);
      throw new UnauthorizedException('Account locked due to too many failed attempts. Try again in 30 minutes.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { role: true, school: true }
    });
    console.log('🔍 [DEBUG 3] User found in DB:', user ? `YES (ID: ${user.id})` : 'NO');

    if (!user || !user.is_active || user.is_deleted) {
      console.log('🔍 [DEBUG 4] User rejected. Active:', user?.is_active, 'Deleted:', user?.is_deleted);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('🔍 [DEBUG 5] Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔍 [DEBUG 6] Password match result:', isPasswordValid);

    if (!isPasswordValid) {
      try {
        const lockoutKey = `lockout:${email.toLowerCase()}`;
        const newAttempts = await this.redisClient.incr(lockoutKey);
        if (newAttempts === 1) {
          await this.redisClient.expire(lockoutKey, 1800);
        }
      } catch (e: any) {
        console.warn('⚠️ Redis lockout increment skipped:', e.message);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      const lockoutKey = `lockout:${email.toLowerCase()}`;
      await this.redisClient.del(lockoutKey);
    } catch (e: any) {
      console.warn('⚠️ Redis lockout clear skipped:', e.message);
    }

    console.log('🔍 [DEBUG 7] Password valid! Creating audit log...');
    await this.prisma.auditLog.create({
      data: {
        school_id: user.school_id,
        user_id: user.id,
        action: 'LOGIN',
        entity_type: 'User',
        entity_id: user.id,
      }
    });
    console.log('🔍 [DEBUG 8] Returning user successfully!');
    return user;
  }

  async login(user: any, ipAddress: string) {
    const payload = { 
      sub: user.id, 
      email: user.email, 
      school_id: user.school_id, 
      role: user.role.name 
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '5h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    
    try {
      await this.redisClient.set(`refresh:${user.id}`, refreshToken, 'EX', 30 * 24 * 60 * 60);
    } catch (e: any) {
      console.warn('⚠️ Redis refresh token storage skipped:', e.message);
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        school_id: user.school_id
      }
    };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email: email.toLowerCase() } });
    if (!user || !user.is_active || user.is_deleted) {
      return { message: 'If the email exists, an OTP has been sent.' };
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    try {
      await this.redisClient.set(`otp:${email.toLowerCase()}`, otp, 'EX', 900);
    } catch (e: any) {
      console.warn('⚠️ Redis OTP storage skipped:', e.message);
    }

    this.logger.log(`[MOCK EMAIL] OTP for ${email} is: ${otp}`);
    return { message: 'If the email exists, an OTP has been sent.' };
  }

  async verifyOtp(email: string, otp: string) {
    let storedOtp: string | null = null;
    try {
      storedOtp = await this.redisClient.get(`otp:${email.toLowerCase()}`);
    } catch (e: any) {
      console.warn('⚠️ Redis OTP check skipped:', e.message);
    }

    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    try {
      await this.redisClient.del(`otp:${email.toLowerCase()}`);
    } catch (e: any) {
      console.warn('⚠️ Redis OTP deletion skipped:', e.message);
    }

    const resetToken = this.jwtService.sign(
      { email: email.toLowerCase(), purpose: 'password_reset' },
      { expiresIn: '10m' }
    );

    return { resetToken };
  }

  async resetPassword(resetToken: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken);
      if (payload.purpose !== 'password_reset') throw new Error();
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findFirst({ where: { email: payload.email } });
    if (!user) throw new UnauthorizedException('User not found');

    const history = user.password_history || [];
    for (const oldHash of history) {
      const isMatch = await bcrypt.compare(newPassword, oldHash);
      if (isMatch) {
        throw new BadRequestException('Cannot reuse any of your last 3 passwords');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    const updatedHistory = [user.password_hash, ...history].slice(0, 3);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        password_history: updatedHistory,
      },
    });

    try {
      await this.redisClient.del(`refresh:${user.id}`);
    } catch (e: any) {
      console.warn('⚠️ Redis refresh token invalidation skipped:', e.message);
    }

    return { message: 'Password reset successfully' };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    let storedToken: string | null = null;
    let redisError = false;

    try {
      storedToken = await this.redisClient.get(`refresh:${userId}`);
    } catch (e: any) {
      console.warn('⚠️ Redis refresh token check skipped (degraded mode):', e.message);
      redisError = true;
    }
    
    if (!redisError && (!storedToken || storedToken !== refreshToken)) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      include: { role: true }
    });

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('User no longer active');
    }

    const payload = { sub: user.id, email: user.email, school_id: user.school_id, role: user.role.name };
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '5h' });
    
    try {
      await this.redisClient.expire(`refresh:${userId}`, 30 * 24 * 60 * 60);
    } catch (e: any) {
      console.warn('⚠️ Redis refresh token expiry update skipped:', e.message);
    }

    return { accessToken: newAccessToken };
  }

  async logout(userId: string) {
    try {
      await this.redisClient.del(`refresh:${userId}`);
    } catch (e: any) {
      console.warn('⚠️ Redis logout skipped:', e.message);
    }
  }
}