import z from 'zod';

export class ReviewValidation {
  static readonly CREATE_REVIEW = z.object({
    job_id: z.number().int().positive('Job ID harus valid'),
    rating: z
      .number()
      .min(1, 'Rating minimal 1.0')
      .max(5, 'Rating maksimal 5.0')
      .refine((val) => val * 2 === Math.floor(val * 2), {
        message: 'Rating harus kelipatan 0.5 (contoh: 1.0, 1.5, 2.0)',
      }),
    comment: z.string().max(2000, 'Komentar maksimal 2000 karakter').optional(),
    is_anonymous: z.boolean().optional().default(false),
  });

  static readonly UPDATE_REVIEW = z.object({
    rating: z
      .number()
      .min(1, 'Rating minimal 1.0')
      .max(5, 'Rating maksimal 5.0')
      .refine((val) => val * 2 === Math.floor(val * 2), {
        message: 'Rating harus kelipatan 0.5',
      })
      .optional(),
    comment: z.string().max(2000).optional(),
    is_anonymous: z.boolean().optional(),
  });
}
