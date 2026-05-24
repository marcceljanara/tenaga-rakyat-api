import z from 'zod';

export class ReviewValidation {
  static readonly CREATE_REVIEW = z.object({
    job_id: z
      .number({
        error: (issue) =>
          issue.input === undefined ? 'ID pekerjaan wajib diisi' : 'ID pekerjaan harus berupa angka',
      })
      .int('ID pekerjaan harus berupa bilangan bulat')
      .positive('ID pekerjaan tidak valid'),
    rating: z
      .number({
        error: (issue) =>
          issue.input === undefined ? 'Rating wajib diisi' : 'Rating harus berupa angka',
      })
      .min(1, 'Rating minimal 1.0')
      .max(5, 'Rating maksimal 5.0')
      .refine((val) => val * 2 === Math.floor(val * 2), {
        message: 'Rating harus kelipatan 0.5 (contoh: 1.0, 1.5, 2.0)',
      }),
    comment: z
      .string({
        error: () => 'Komentar harus berupa teks',
      })
      .max(2000, 'Komentar maksimal 2000 karakter')
      .optional(),
    is_anonymous: z
      .boolean({
        error: () => 'Status anonim harus berupa boolean',
      })
      .optional()
      .default(false),
  });

  static readonly UPDATE_REVIEW = z.object({
    rating: z
      .number({
        error: () => 'Rating harus berupa angka',
      })
      .min(1, 'Rating minimal 1.0')
      .max(5, 'Rating maksimal 5.0')
      .refine((val) => val * 2 === Math.floor(val * 2), {
        message: 'Rating harus kelipatan 0.5',
      })
      .optional(),
    comment: z
      .string({
        error: () => 'Komentar harus berupa teks',
      })
      .max(2000, 'Komentar maksimal 2000 karakter')
      .optional(),
    is_anonymous: z
      .boolean({
        error: () => 'Status anonim harus berupa boolean',
      })
      .optional(),
  });
}
