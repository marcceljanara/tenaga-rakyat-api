import { z, ZodType } from 'zod';

export class UserPhotoValidation {
  static readonly ADD: ZodType = z.object({
    description: z.string().min(1).max(1000),
  });

  static readonly EDIT: ZodType = z.object({
    description: z.string().min(1).max(1000),
  });
}
