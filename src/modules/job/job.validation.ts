import z from 'zod';

export class JobValidation {
  static readonly CREATE_JOB = z.object({
    title: z.string().min(5, 'Judul minimal 5 karakter').max(255),
    description: z.string().min(20, 'Deskripsi minimal 20 karakter').max(5000),
    location: z.string().max(255).optional(),
    compensation_amount: z
      .number()
      .positive('Kompensasi harus lebih dari 0')
      .max(999999999999, 'Kompensasi terlalu besar'),
  });

  static readonly UPDATE_JOB = z.object({
    title: z.string().min(5).max(255).optional(),
    description: z.string().min(20).max(5000).optional(),
    location: z.string().max(255).optional(),
    compensation_amount: z.number().positive().max(999999999999).optional(),
  });

  static readonly UPDATE_WORKER_JOB_STATUS = z.object({
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
  });

  static readonly SEARCH_QUERY = z.object({
    keyword: z.string().optional(),
    location: z.string().optional(),
    min_compensation: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    max_compensation: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    status: z
      .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .optional(),
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
      .enum(['posted_at', 'compensation_amount', 'title'])
      .optional()
      .default('posted_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  });

  static readonly HISTORY_QUERY = z.object({
    status: z
      .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
      .optional(),
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
    sort_by: z.enum(['posted_at', 'status']).optional().default('posted_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  });
}
