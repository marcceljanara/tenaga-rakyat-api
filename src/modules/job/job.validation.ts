import z from 'zod';

export class JobValidation {
  static readonly CREATE_JOB = z.object({
    title: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Judul pekerjaan wajib diisi'
            : 'Judul pekerjaan harus berupa teks',
      })
      .min(5, 'Judul pekerjaan minimal 5 karakter')
      .max(255, 'Judul pekerjaan maksimal 255 karakter'),
    description: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Deskripsi pekerjaan wajib diisi'
            : 'Deskripsi pekerjaan harus berupa teks',
      })
      .min(20, 'Deskripsi pekerjaan minimal 20 karakter')
      .max(5000, 'Deskripsi pekerjaan maksimal 5000 karakter'),
    location_label: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Label lokasi wajib diisi'
            : 'Label lokasi harus berupa teks',
      })
      .max(255, 'Label lokasi maksimal 255 karakter'),
    address_detail: z
      .string({
        error: () => 'Detail alamat harus berupa teks',
      })
      .max(500, 'Detail alamat maksimal 500 karakter')
      .optional(),
    compensation_amount: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Jumlah kompensasi wajib diisi'
            : 'Jumlah kompensasi harus berupa angka',
      })
      .positive('Kompensasi harus lebih dari 0')
      .max(999999999999, 'Kompensasi terlalu besar'),
    payment_method: z.enum(['ESCROW_SYSTEM', 'CASH_OFFLINE'], {
      error: () => 'Metode pembayaran tidak valid (harus ESCROW_SYSTEM atau CASH_OFFLINE)',
    }),
    job_latitude: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Latitude pekerjaan wajib diisi'
            : 'Latitude pekerjaan harus berupa angka',
      })
      .min(-90, 'Latitude minimal -90')
      .max(90, 'Latitude maksimal 90'),
    job_longitude: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Longitude pekerjaan wajib diisi'
            : 'Longitude pekerjaan harus berupa angka',
      })
      .min(-180, 'Longitude minimal -180')
      .max(180, 'Longitude maksimal 180'),
  });

  static readonly UPDATE_JOB = z.object({
    title: z
      .string({
        error: () => 'Judul pekerjaan harus berupa teks',
      })
      .min(5, 'Judul pekerjaan minimal 5 karakter')
      .max(255, 'Judul pekerjaan maksimal 255 karakter')
      .optional(),
    description: z
      .string({
        error: () => 'Deskripsi pekerjaan harus berupa teks',
      })
      .min(20, 'Deskripsi pekerjaan minimal 20 karakter')
      .max(5000, 'Deskripsi pekerjaan maksimal 5000 karakter')
      .optional(),
    location_label: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Label lokasi wajib diisi'
            : 'Label lokasi harus berupa teks',
      })
      .max(255, 'Label lokasi maksimal 255 karakter'),
    address_detail: z
      .string({
        error: () => 'Detail alamat harus berupa teks',
      })
      .max(500, 'Detail alamat maksimal 500 karakter')
      .optional(),
    compensation_amount: z
      .number({
        error: () => 'Jumlah kompensasi harus berupa angka',
      })
      .positive('Kompensasi harus lebih dari 0')
      .max(999999999999, 'Kompensasi terlalu besar')
      .optional(),
  });

  static readonly UPDATE_WORKER_JOB_STATUS = z.object({
    status: z.enum(['IN_PROGRESS', 'COMPLETED'], {
      error: () => 'Status pekerjaan pekerja tidak valid (harus IN_PROGRESS atau COMPLETED)',
    }),
  });

  static readonly UPDATE_EMPLOYER_JOB_STATUS = z.object({
    status: z.enum(['CANCELLED', 'APPROVED', 'REJECTED'], {
      error: () => 'Status pekerjaan pemberi kerja tidak valid (harus CANCELLED, APPROVED, atau REJECTED)',
    }),
  });

  static readonly SEARCH_QUERY = z.object({
    keyword: z
      .string({
        error: () => 'Kata kunci pencarian harus berupa teks',
      })
      .optional(),
    location: z
      .string({
        error: () => 'Lokasi pencarian harus berupa teks',
      })
      .optional(),
    min_compensation: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    max_compensation: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined)),
    status: z
      .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
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
      .enum(['posted_at', 'compensation_amount', 'title'], {
        error: () => 'Kolom pengurutan tidak valid',
      })
      .optional()
      .default('posted_at'),
    sort_order: z
      .enum(['asc', 'desc'], {
        error: () => 'Arah pengurutan harus asc atau desc',
      })
      .optional()
      .default('desc'),
  });

  static readonly HISTORY_QUERY = z.object({
    status: z
      .enum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
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
      .enum(['posted_at', 'status'], {
        error: () => 'Kolom pengurutan tidak valid',
      })
      .optional()
      .default('posted_at'),
    sort_order: z
      .enum(['asc', 'desc'], {
        error: () => 'Arah pengurutan harus asc atau desc',
      })
      .optional()
      .default('desc'),
  });
}
