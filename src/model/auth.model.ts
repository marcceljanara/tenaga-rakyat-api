import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VerificationPurpose } from '@prisma/client';

export class VerifyEmailRequest {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Email verification token' })
  token: string;
}

export class VerifyAndResetPasswordRequest {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'Reset password token' })
  token: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'New password' })
  newPassword: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Confirm new password' })
  confirmNewPassword: string;
}

export class VerifyEmailResponse {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  userId?: string;
}

export class ResendVerificationRequest {
  @ApiProperty({ enum: ['REGISTER', 'EMAIL_CHANGE', 'PASSWORD_RESET'], example: 'REGISTER' })
  purpose: VerificationPurpose;
}

export class ResendVerificationResponse {
  @ApiProperty()
  message: string;
}

export class SendVerificationEmailRequest {
  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ enum: ['REGISTRATION', 'EMAIL_CHANGE', 'PASSWORD_RESET'] })
  purpose: VerificationPurpose;
}

export class SendEmailForgotPasswordRequest {
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  email: string;
}

export class ChangeEmailRequest {
  @ApiProperty({ example: 'newemail@example.com', description: 'New email address' })
  newEmail: string;
}