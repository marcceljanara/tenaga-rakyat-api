import { z, ZodType } from 'zod';

// Validation
export class UserManagementValidation {
  static readonly UPDATE_VERIFICATION: ZodType = z.object({
    verification_status: z.enum([
      'UNVERIFIED',
      'PENDING',
      'VERIFIED',
      'REJECTED',
    ]),
  });

  static readonly SUSPEND_WALLET: ZodType = z.object({
    reason: z.string().max(500).optional(),
  });
}
