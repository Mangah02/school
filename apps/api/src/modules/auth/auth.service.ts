// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../core/prisma/prisma.service';
import { RedisService } from '../../core/redis/redis.service';
import { LoginDto } from './dto/login.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private redis: RedisService,
  ) {}

  /**
   * Validates user credentials and handles account lockout (Milestone 4.6)
   */
  async validateUser(email: string, password: string) {
    const lockoutKey = `lockout:${email.toLowerCase()}`;
    const attempts = await this.redis.get(lockoutKey);
    
    // SRS 3.1.2: Lock after 4 consecutive failed logins
    if (attempts && parseInt(attempts) >= 4) {
      this.logger.warn(`Locked account login attempt for ${email}`);
      throw new UnauthorizedException('Account locked due to too many failed attempts. Try again in 30 minutes.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, school: true }
    });

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // SRS 3.2: bcrypt with salt rounds >= 12
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      // Increment lockout counter
      const newAttempts = await this.redis.incr(lockoutKey);
      if (newAttempts === 1) {
        // Set expiry on the first attempt
        await this.redis.expire(lockoutKey, 1800); // 30 minutes
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset attempts on success
    await this.redis.del(lockoutKey);

    // SRS 36.6: Audit login event
    await this.prisma.auditLog.create({
      data: {
        school_id: user.school_id,
        user_id: user.id,
        action: 'LOGIN',
        entity_type: 'User',
        entity_id: user.id,
      }
    });

    return user;
  }

  /**
   * Issues JWT and Refresh Token (Milestones 4.4 & 4.5)
   */
  async login(loginDto: LoginDto, ipAddress: string) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const payload = { 
      sub: user.id, 
      email: user.email, 
      school_id: user.school_id, 
      role: user.role.name 
    };

    // SRS 3.1.2: Access token 5-hour expiry
    const accessToken = this.jwtService.sign(payload, { expiresIn: '5h' });
    
    // SRS 3.1.2: Refresh token 30-day sliding window
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
    
    // Store refresh token in Redis for sliding window & revocation
    await this.redis.set(`refresh:${user.id}`, refreshToken, 'EX', 30 * 24 * 60 * 60);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.name,
        school_id: user.school_id
      }
      // Note: Refresh token is NOT returned in JSON, it's set as an httpOnly cookie in the Controller
    };
  }

  // apps/api/src/modules/auth/auth.service.ts (Additions to existing class)
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

// ... inside AuthService class ...

  /**
   * SRS 3.1.3: Step 1 - Generate and send OTP
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    
    // Security: Do not reveal if user exists or not
    if (!user || !user.is_active || user.is_deleted) {
      return { message: 'If the email exists, an OTP has been sent.' };
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Store in Redis for 15 minutes (SRS 3.1.3)
    await this.redis.set(`otp:${email.toLowerCase()}`, otp, 'EX', 900);

    // TODO: Trigger Email Service (Module 8/12) to send OTP
    this.logger.log(`[MOCK EMAIL] OTP for ${email} is: ${otp}`);

    return { message: 'If the email exists, an OTP has been sent.' };
  }

  /**
   * SRS 3.1.3: Step 2 - Verify OTP and issue short-lived reset token
   */
  async verifyOtp(email: string, otp: string) {
    const storedOtp = await this.redis.get(`otp:${email.toLowerCase()}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Invalidate OTP immediately after use (prevent replay)
    await this.redis.del(`otp:${email.toLowerCase()}`);

    // Issue a short-lived reset token (valid for 10 mins)
    const resetToken = this.jwtService.sign(
      { email: email.toLowerCase(), purpose: 'password_reset' },
      { expiresIn: '10m' }
    );

    return { resetToken };
  }

  /**
   * SRS 3.1.3: Step 3 - Reset password with complexity & history checks
   */
  async resetPassword(resetToken: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(resetToken);
      if (payload.purpose !== 'password_reset') throw new Error();
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const user = await this.prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) throw new UnauthorizedException('User not found');

    // SRS 3.1.3: Cannot reuse last 3 passwords
    const history = user.password_history || [];
    for (const oldHash of history) {
      const isMatch = await bcrypt.compare(newPassword, oldHash);
      if (isMatch) {
        throw new BadRequestException('Cannot reuse any of your last 3 passwords');
      }
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 12);

    // Update user: push current hash to history, keep max 3
    const updatedHistory = [user.password_hash, ...history].slice(0, 3);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        password_history: updatedHistory,
        failed_login_attempts: 0, // Reset lockout on successful reset
      },
    });

    // Invalidate all active refresh tokens (force re-login on all devices)
    await this.redis.del(`refresh:${user.id}`);

    return { message: 'Password reset successfully' };
  }


  /**
   * Handles Refresh Token logic (Sliding Window)
   */
  async refreshTokens(userId: string, refreshToken: string) {
    const storedToken = await this.redis.get(`refresh:${userId}`);
    
    if (!storedToken || storedToken !== refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true }
    });

    if (!user || !user.is_active || user.is_deleted) {
      throw new UnauthorizedException('User no longer active');
    }

    const payload = { sub: user.id, email: user.email, school_id: user.school_id, role: user.role.name };
    
    // Issue new access token
    const newAccessToken = this.jwtService.sign(payload, { expiresIn: '5h' });
    
    // Slide the window: extend refresh token expiry in Redis
    await this.redis.expire(`refresh:${userId}`, 30 * 24 * 60 * 60);

    return { accessToken: newAccessToken };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
  }
}