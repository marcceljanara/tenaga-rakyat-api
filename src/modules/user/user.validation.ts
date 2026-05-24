import z from 'zod';

export class UserValidation {
  static readonly REGISTER = z.object({
    full_name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nama lengkap wajib diisi'
            : 'Nama lengkap harus berupa teks',
      })
      .min(1, 'Nama lengkap tidak boleh kosong')
      .max(255, 'Nama lengkap maksimal 255 karakter'),
    phone_number: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nomor telepon wajib diisi'
            : 'Nomor telepon harus berupa teks',
      })
      .min(12, 'Nomor telepon minimal 12 karakter')
      .max(15, 'Nomor telepon maksimal 15 karakter'),
    email: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Email wajib diisi'
            : 'Email harus berupa teks',
      })
      .email('Format email tidak valid'),
    password: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password wajib diisi'
            : 'Password harus berupa teks',
      })
      .min(8, 'Password minimal 8 karakter')
      .max(100, 'Password maksimal 100 karakter'),
    role_id: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Role wajib dipilih'
            : 'Role harus berupa angka',
      })
      .int('Role harus berupa bilangan bulat')
      .refine((id) => [1, 2].includes(id), {
        message:
          'Role tidak valid. Hanya pekerja (1) atau pemberi kerja (2) yang diperbolehkan',
      }),
  });

  static readonly LOGIN = z.object({
    email: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Email wajib diisi'
            : 'Email harus berupa teks',
      })
      .email('Format email tidak valid'),
    password: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password wajib diisi'
            : 'Password harus berupa teks',
      })
      .min(8, 'Password minimal 8 karakter')
      .max(100, 'Password maksimal 100 karakter'),
  });

  static readonly EDIT_PROFILE = z.object({
    full_name: z
      .string({
        error: () => 'Nama lengkap harus berupa teks',
      })
      .min(1, 'Nama lengkap tidak boleh kosong')
      .max(255, 'Nama lengkap maksimal 255 karakter')
      .optional(),
    phone_number: z
      .string({
        error: () => 'Nomor telepon harus berupa teks',
      })
      .min(12, 'Nomor telepon minimal 12 karakter')
      .max(15, 'Nomor telepon maksimal 15 karakter')
      .optional(),
    about: z
      .string({
        error: () => 'Deskripsi tentang Anda harus berupa teks',
      })
      .max(2500, 'Deskripsi tentang Anda maksimal 2500 karakter')
      .optional(),
    cv_url: z
      .string({
        error: () => 'Tautan CV harus berupa teks',
      })
      .max(512, 'Tautan CV maksimal 512 karakter')
      .optional(),
    location_label: z
      .string({
        error: () => 'Label lokasi harus berupa teks',
      })
      .max(255, 'Label lokasi maksimal 255 karakter')
      .optional(),
  });

  static readonly GET_PROFILE = z.object({
    id: z.uuidv4(),
  });
}
