// apps/api/src/modules/auth/auth.controller.ts
import { 
  Controller, Post, Body, UseGuards, Request, Response, 
  HttpCode, HttpStatus, Ip, UnauthorizedException 
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../core/guards/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  async login(
    @Request() req, 
    @Response({ passthrough: true }) res,
    @Ip() ip: string
  ) {
    const loginResult = await this.authService.login(req.user, ip);

    // SRS / Arch Phase 2: Refresh token stored in httpOnly secure cookie
    res.cookie('refresh_token', loginResult.refreshToken || req.user.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in prod (HTTPS)
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

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
    @Request() req, 
    @Response({ passthrough: true }) res
  ) {
    // Extract refresh token from httpOnly cookie
    const refreshToken = req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // We need the user ID to check Redis. We can decode the refresh token without verifying 
    // to get the ID, or we can use a specific RefreshGuard. For simplicity and security, 
    // let's decode it to get the sub (userId) and verify it against Redis.
    const decoded = this.authService['jwtService'].decode(refreshToken) as any;
    if (!decoded || !decoded.sub) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const result = await this.authService.refreshTokens(decoded.sub, refreshToken);

    return {
      success: true,
      data: { accessToken: result.accessToken }
    };
  }

  @Public() // Bypass JwtAuthGuard
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
  async logout(@Request() req, @Response({ passthrough: true }) res) {
    await this.authService.logout(req.user.id);
    
    // Clear the refresh token cookie
    res.clearCookie('refresh_token');
    
    return { success: true, message: 'Logged out successfully' };
  }
}