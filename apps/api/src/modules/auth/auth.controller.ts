// apps/api/src/modules/auth/auth.controller.ts
import { 
  Controller, Post, Body, UseGuards, Req, Res, 
  HttpCode, HttpStatus, Ip, UnauthorizedException 
} from '@nestjs/common';
import type { Request, Response } from 'express'; // ✅ FIX: Must use 'import type' for isolatedModules
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Req() req: Request & { user: any }, 
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string
  ) {
    const loginResult = await this.authService.login(req.user, ip);

    const tokenToSet = (loginResult as any).refreshToken || req.user.refreshToken;
    if (tokenToSet) {
      res.cookie('refresh_token', tokenToSet, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
    }

    return {
      success: true,
      data: {
        accessToken: loginResult.accessToken,
        user: loginResult.user
      }
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(
    @Req() req: Request & { cookies?: any }, 
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException('Refresh token missing');

    const decoded = this.authService['jwtService'].decode(refreshToken) as any;
    if (!decoded || !decoded.sub) throw new UnauthorizedException('Invalid refresh token');

    const result = await this.authService.refreshTokens(decoded.sub, refreshToken);
    return { success: true, data: { accessToken: result.accessToken } };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User logout' })
  async logout(@Req() req: Request & { user: any }, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.user.id);
    res.clearCookie('refresh_token');
    return { success: true, message: 'Logged out successfully' };
  }
}