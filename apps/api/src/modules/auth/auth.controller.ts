// apps/api/src/modules/auth/auth.controller.ts
import { 
  Controller, Post, Body, UseGuards, Req, Res, 
  HttpCode, HttpStatus, Ip, UnauthorizedException 
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Req() req: Request & { user: any }, 
    @Res({ passthrough: true }) res: Response,
    @Ip() ip: string,
    @Body() body: any 
  ) {
    console.log('🎯 [AuthController] login() reached!');
    console.log('🎯 [AuthController] Received body:', body);
    
    const user = await this.authService.validateUser(body.email, body.password);
    console.log('🎯 [AuthController] validateUser returned:', user ? 'SUCCESS' : 'FAILED');

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const loginResult = await this.authService.login(user, ip);

    if (loginResult.refreshToken) {
      res.cookie('refresh_token', loginResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // ✅ FIX: 'lax' allows cross-port localhost requests to send cookies
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

  @Public() // ✅ FIX: Refresh endpoint MUST be public to allow access token renewal without a valid access token
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshTokens(
    @Req() req: Request & { cookies?: any }, 
    @Res({ passthrough: true }) res: Response
  ) {
    console.log('🎯 [AuthController] refreshTokens() reached!');
    console.log('🎯 [AuthController] Cookies received:', req.cookies);
    
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      console.warn('⚠️ [AuthController] Refresh token missing in cookies');
      throw new UnauthorizedException('Refresh token missing');
    }

    const decoded = this.authService['jwtService'].decode(refreshToken) as any;
    if (!decoded || !decoded.sub) {
      console.warn('⚠️ [AuthController] Invalid refresh token payload');
      throw new UnauthorizedException('Invalid refresh token');
    }

    console.log('🎯 [AuthController] Calling authService.refreshTokens for user:', decoded.sub);
    const result = await this.authService.refreshTokens(decoded.sub, refreshToken);
    
    console.log('🎯 [AuthController] Refresh successful');
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