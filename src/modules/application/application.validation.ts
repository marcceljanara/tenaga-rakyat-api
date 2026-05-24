import z from 'zod';

export class ApplicationValidation {
  static readonly APPLY_JOB = z.object({
    cover_letter: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Surat lamaran (cover letter) wajib diisi'
            : 'Surat lamaran (cover letter) harus berupa teks',
      })
      .min(10, 'Surat lamaran (cover letter) minimal 10 karakter')
      .max(5000, 'Surat lamaran (cover letter) maksimal 5000 karakter'),
  });

  static readonly UPDATE_STATUS = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'UNDER_REVIEW'], {
      error: () => 'Status lamaran tidak valid (harus ACCEPTED, REJECTED, atau UNDER_REVIEW)',
    }),
  });

  static readonly QUERY_PARAMS = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: 'Halaman (page) harus lebih dari 0' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0 && val <= 100, {
        message: 'Limit data harus antara 1-100',
      }),
    status: z
      .enum(['OPEN', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS'], {
        error: () => 'Filter status tidak valid',
      })
      .optional(),
    sort_by: z
      .enum(['created_at', 'updated_at', 'status'], {
        error: () => 'Kolom pengurutan tidak valid',
      })
      .optional()
      .default('created_at'),
    sort_order: z
      .enum(['asc', 'desc'], {
        error: () => 'Arah pengurutan harus asc atau desc',
      })
      .optional()
      .default('desc'),
  });

  static readonly SEARCH_PARAMS = z.object({
    keyword: z
      .string({
        error: () => 'Kata kunci pencarian harus berupa teks',
      })
      .optional(),
    status: z
      .enum(['OPEN', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS'], {
        error: () => 'Filter status tidak valid',
      })
      .optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: 'Halaman (page) harus lebih dari 0' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0 && val <= 100, {
        message: 'Limit data harus antara 1-100',
      }),
    sort_by: z
      .enum(['created_at', 'updated_at', 'status'], {
        error: () => 'Kolom pengurutan tidak valid',
      })
      .optional()
      .default('created_at'),
    sort_order: z
      .enum(['asc', 'desc'], {
        error: () => 'Arah pengurutan harus asc atau desc',
      })
      .optional()
      .default('desc'),
  });
}
