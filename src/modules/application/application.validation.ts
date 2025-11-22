import z from 'zod';

export class ApplicationValidation {
  static readonly APPLY_JOB = z.object({
    cover_letter: z.string().min(10).max(5000, {
      message: 'Cover letter harus antara 10-5000 karakter',
    }),
  });

  static readonly UPDATE_STATUS = z.object({
    status: z.enum(['ACCEPTED', 'REJECTED', 'UNDER_REVIEW'], {
      message: 'Status hanya boleh ACCEPTED, REJECTED atau UNDER_REVIEW',
    }),
  });

  static readonly QUERY_PARAMS = z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: 'Page harus lebih dari 0' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0 && val <= 100, {
        message: 'Limit harus antara 1-100',
      }),
    status: z.enum(['OPEN', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS']).optional(),
    sort_by: z
      .enum(['created_at', 'updated_at', 'status'])
      .optional()
      .default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  });

  static readonly SEARCH_PARAMS = z.object({
    keyword: z.string().optional(),
    status: z.enum(['OPEN', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS']).optional(),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, { message: 'Page harus lebih dari 0' }),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine((val) => val > 0 && val <= 100, {
        message: 'Limit harus antara 1-100',
      }),
    sort_by: z
      .enum(['created_at', 'updated_at', 'status'])
      .optional()
      .default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  });
}
