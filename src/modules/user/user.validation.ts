import z from 'zod';

export class UserValidation {
  static readonly REGISTER = z.object({
    full_name: z.string().min(1).max(255),
    phone_number: z.string().min(12).max(15),
    email: z.email(),
    password: z.string().min(8).max(100),
    role_id: z
      .number()
      .int()
      .refine((id) => [1, 2].includes(id), {
        message:
          'Role tidak valid. Hanya pekerja atau pemberi_kerja yang diperbolehkan',
      }),
  });

  static readonly LOGIN = z.object({
    email: z.email(),
    password: z.string().min(8).max(100),
  });
}
