import { z, ZodType } from 'zod';

export class UserPhotoValidation {
  static readonly ADD: ZodType = z.object({
    description: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Deskripsi foto wajib diisi'
            : 'Deskripsi foto harus berupa teks',
      })
      .min(1, 'Deskripsi foto tidak boleh kosong')
      .max(1000, 'Deskripsi foto maksimal 1000 karakter'),
  });

  static readonly EDIT: ZodType = z.object({
    description: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Deskripsi foto wajib diisi'
            : 'Deskripsi foto harus berupa teks',
      })
      .min(1, 'Deskripsi foto tidak boleh kosong')
      .max(1000, 'Deskripsi foto maksimal 1000 karakter'),
  });
}
