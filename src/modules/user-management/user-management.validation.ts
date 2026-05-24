import { z, ZodType } from 'zod';

// Validation
export class UserManagementValidation {
  static readonly UPDATE_VERIFICATION: ZodType = z.object({
    verification_status: z.enum([
      'UNVERIFIED',
      'EMAIL_VERIFIED',
      'FULL_VERIFIED',
    ], {
      error: () => 'Status verifikasi tidak valid (harus UNVERIFIED, EMAIL_VERIFIED, atau FULL_VERIFIED)',
    }),
  });

  static readonly SUSPEND_WALLET: ZodType = z.object({
    reason: z
      .string({
        error: () => 'Alasan penangguhan harus berupa teks',
      })
      .max(500, 'Alasan penangguhan maksimal 500 karakter')
      .optional(),
  });
}
