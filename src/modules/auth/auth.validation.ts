import { z, ZodType } from 'zod';
import { VerificationPurpose } from '@prisma/client';

export class AuthValidation {
  static readonly VERIFY_EMAIL: ZodType = z.object({
    token: z.string().min(1, 'Token is required'),
  });

  static readonly RESEND_VERIFICATION: ZodType = z.object({
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => ({
        message: 'Purpose must be REGISTER, CHANGE_EMAIL, or LOGIN',
      }),
    }),
  });

  static readonly SEND_VERIFICATION_EMAIL: ZodType = z.object({
    email: z.string().email('Invalid email format').max(255),
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => ({
        message: 'Purpose must be REGISTER, CHANGE_EMAIL, or LOGIN',
      }),
    }),
  });
}
