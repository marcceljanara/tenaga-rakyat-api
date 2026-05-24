import { z, ZodType } from 'zod';

// Validation
export class AdminValidation {
  static readonly CREATE: ZodType = z.object({
    full_name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nama lengkap wajib diisi'
            : 'Nama lengkap harus berupa teks',
      })
      .min(3, 'Nama lengkap minimal 3 karakter')
      .max(255, 'Nama lengkap maksimal 255 karakter'),
    phone_number: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nomor telepon wajib diisi'
            : 'Nomor telepon harus berupa teks',
      })
      .min(10, 'Nomor telepon minimal 10 karakter')
      .max(20, 'Nomor telepon maksimal 20 karakter')
      .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +'),
    email: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Email wajib diisi'
            : 'Email harus berupa teks',
      })
      .email('Format email tidak valid')
      .max(255, 'Email maksimal 255 karakter'),
    password: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password wajib diisi'
            : 'Password harus berupa teks',
      })
      .min(8, 'Password minimal 8 karakter')
      .max(255, 'Password maksimal 255 karakter'),
  });

  static readonly UPDATE: ZodType = z.object({
    full_name: z
      .string({
        error: () => 'Nama lengkap harus berupa teks',
      })
      .min(3, 'Nama lengkap minimal 3 karakter')
      .max(255, 'Nama lengkap maksimal 255 karakter')
      .optional(),
    phone_number: z
      .string({
        error: () => 'Nomor telepon harus berupa teks',
      })
      .min(10, 'Nomor telepon minimal 10 karakter')
      .max(20, 'Nomor telepon maksimal 20 karakter')
      .regex(/^[0-9+]+$/, 'Nomor telepon hanya boleh berisi angka dan tanda +')
      .optional(),
    email: z
      .string({
        error: () => 'Email harus berupa teks',
      })
      .email('Format email tidak valid')
      .max(255, 'Email maksimal 255 karakter')
      .optional(),
  });

  static readonly CHANGE_PASSWORD: ZodType = z.object({
    new_password: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password baru wajib diisi'
            : 'Password baru harus berupa teks',
      })
      .min(8, 'Password baru minimal 8 karakter')
      .max(255, 'Password baru maksimal 255 karakter'),
  });
}
