import { z, ZodType } from 'zod';

// Validation
export class AdminValidation {
  static readonly CREATE: ZodType = z.object({
    full_name: z.string().min(3).max(255),
    phone_number: z
      .string()
      .min(10)
      .max(20)
      .regex(/^[0-9+]+$/),
    email: z.email().max(255),
    password: z.string().min(8).max(255),
  });

  static readonly UPDATE: ZodType = z.object({
    full_name: z.string().min(3).max(255).optional(),
    phone_number: z
      .string()
      .min(10)
      .max(20)
      .regex(/^[0-9+]+$/)
      .optional(),
    email: z.email().max(255).optional(),
  });

  static readonly CHANGE_PASSWORD: ZodType = z.object({
    new_password: z.string().min(8).max(255),
  });
}
