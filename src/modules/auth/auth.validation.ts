import { z, ZodType } from 'zod';
import { VerificationPurpose } from '@prisma/client';

export class AuthValidation {
  static readonly VERIFY_EMAIL: ZodType = z.object({
    token: z
      .string({
        error: (issue) =>
          issue.input === undefined ? 'Token wajib diisi' : 'Token harus berupa teks',
      })
      .min(1, 'Token wajib diisi'),
  });

  static readonly RESEND_VERIFICATION: ZodType = z.object({
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => 'Tujuan verifikasi harus REGISTER, CHANGE_EMAIL, atau RESET_PASSWORD',
    }),
  });

  static readonly SEND_VERIFICATION_EMAIL: ZodType = z.object({
    email: z
      .string({
        error: (issue) =>
          issue.input === undefined ? 'Email wajib diisi' : 'Email harus berupa teks',
      })
      .email('Format email tidak valid')
      .max(255, 'Email maksimal 255 karakter'),
    purpose: z.nativeEnum(VerificationPurpose, {
      error: () => 'Tujuan verifikasi harus REGISTER, CHANGE_EMAIL, atau RESET_PASSWORD',
    }),
  });

  static readonly SEND_EMAIL_FORGOT_PASSWORD: ZodType = z.object({
    email: z
      .string({
        error: (issue) =>
          issue.input === undefined ? 'Email wajib diisi' : 'Email harus berupa teks',
      })
      .email('Format email tidak valid')
      .max(255, 'Email maksimal 255 karakter'),
  });

  static readonly VERIFY_AND_RESET_PASSWORD: ZodType = z.object({
    token: z
      .string({
        error: (issue) =>
          issue.input === undefined ? 'Token wajib diisi' : 'Token harus berupa teks',
      })
      .min(1, 'Token wajib diisi'),
    newPassword: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Password baru wajib diisi'
            : 'Password baru harus berupa teks',
      })
      .min(8, 'Password baru minimal 8 karakter')
      .max(255, 'Password baru maksimal 255 karakter'),
    confirmNewPassword: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Konfirmasi password baru wajib diisi'
            : 'Konfirmasi password baru harus berupa teks',
      })
      .min(8, 'Konfirmasi password baru minimal 8 karakter')
      .max(255, 'Konfirmasi password baru maksimal 255 karakter'),
  });

  static readonly CHANGE_EMAIL: ZodType = z.object({
    newEmail: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Email baru wajib diisi'
            : 'Email baru harus berupa teks',
      })
      .email('Format email baru tidak valid')
      .max(255, 'Email baru maksimal 255 karakter'),
  });
}
