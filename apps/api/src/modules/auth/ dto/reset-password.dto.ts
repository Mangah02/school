// apps/api/src/modules/auth/dto/reset-password.dto.ts
import { IsString, MinLength, Matches, NotEquals } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  resetToken: string; // Issued after OTP verification

  // SRS 3.1.3: min 8 chars, uppercase, number, symbol
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
    message: 'Password too weak. Requires 8+ chars, uppercase, lowercase, number, and symbol.',
  })
  newPassword: string;
}