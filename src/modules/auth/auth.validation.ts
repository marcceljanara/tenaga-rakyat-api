import { z, ZodType } from 'zod';
import { VerificationPurpose } from '@prisma/client';

export class AuthValidation {
  static readonly VERIFY_EMAIL: ZodType = z.object({
    token: z.string().min(1, 'Token is required'),
  });

  static readonly RESEND_VERIFICATION: ZodType = z.object({
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => ({
        message: 'Purpose must be REGISTER, CHANGE_EMAIL, or RESET_PASSWORD',
      }),
    }),
  });

  static readonly SEND_VERIFICATION_EMAIL: ZodType = z.object({
    email: z.string().email('Invalid email format').max(255),
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => ({
        message: 'Purpose must be REGISTER, CHANGE_EMAIL, or RESET_PASSWORD',
      }),
    }),
  });

  static readonly SEND_EMAIL_FORGOT_PASSWORD: ZodType = z.object({
    email: z.string().email('Invalid email format').max(255),
  });

  static readonly VERIFY_AND_RESET_PASSWORD: ZodType = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters long')
      .max(255),
    confirmNewPassword: z
      .string()
      .min(8, 'Confirm new password must be at least 8 characters long')
      .max(255),
  });

  static readonly CHANGE_EMAIL: ZodType = z.object({
    newEmail: z.string().email('Invalid email format').max(255),
  });
}
