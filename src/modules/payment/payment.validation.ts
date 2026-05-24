import { WithdrawStatus, WithdrawType } from '@prisma/client';
import z from 'zod';

export class PaymentValidation {
  static readonly TOPUP_WALLET = z.object({
    balance: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Jumlah saldo wajib diisi'
            : 'Jumlah saldo harus berupa angka',
      })
      .positive('Jumlah saldo harus lebih dari 0'),
  });

  static readonly TOPUP_ADMIN = z.object({
    user_id: z.uuidv4(),
    balance: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Jumlah saldo wajib diisi'
            : 'Jumlah saldo harus berupa angka',
      })
      .positive('Jumlah saldo harus lebih dari 0'),
  });

  static readonly ADD_WITHDRAW_METHOD = z.object({
    method: z.enum([WithdrawType.BANK_TRANSFER, WithdrawType.EWALLET], {
      error: () => 'Metode penarikan tidak valid (harus BANK_TRANSFER atau EWALLET)',
    }),
    provider: z.enum(['Dana', 'OVO', 'BRI', 'BNI', 'Mandiri'], {
      error: () => 'Penyedia (provider) penarikan tidak valid',
    }),
    account_name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nama pemilik rekening wajib diisi'
            : 'Nama pemilik rekening harus berupa teks',
      })
      .min(3, 'Nama pemilik rekening minimal 3 karakter')
      .max(100, 'Nama pemilik rekening maksimal 100 karakter'),
    account_number: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nomor rekening wajib diisi'
            : 'Nomor rekening harus berupa teks',
      })
      .min(3, 'Nomor rekening minimal 3 karakter')
      .max(50, 'Nomor rekening maksimal 50 karakter'),
  });

  static readonly CREATE_WITHDRAW_REQUEST = z.object({
    amount: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Jumlah penarikan wajib diisi'
            : 'Jumlah penarikan harus berupa angka',
      })
      .positive('Jumlah penarikan harus lebih dari 0')
      .min(10000, 'Batas minimum penarikan adalah Rp 10.000'),
    method_id: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'ID metode penarikan wajib diisi'
            : 'ID metode penarikan harus berupa angka',
      })
      .int('ID metode penarikan harus berupa bilangan bulat')
      .positive('ID metode penarikan tidak valid'),
  });

  static readonly LOCK_WITHDRAW = z.object({
    admin_note: z
      .string({
        error: () => 'Catatan admin harus berupa teks',
      })
      .max(255, 'Catatan admin maksimal 255 karakter')
      .optional(),
  });

  static readonly APPROVE_WITHDRAW = z.object({
    admin_note: z
      .string({
        error: () => 'Catatan admin harus berupa teks',
      })
      .max(255, 'Catatan admin maksimal 255 karakter')
      .optional(),
  });

  static readonly REJECT_WITHDRAW = z.object({
    admin_note: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Alasan penolakan wajib diisi'
            : 'Alasan penolakan harus berupa teks',
      })
      .min(1, 'Alasan penolakan wajib diisi')
      .max(255, 'Alasan penolakan maksimal 255 karakter'),
  });

  static readonly SEND_WITHDRAW = z.object({
    transfer_receipt: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Bukti transfer wajib diunggah'
            : 'Tautan bukti transfer harus berupa teks',
      })
      .url('Tautan bukti transfer tidak valid'),
  });

  static readonly WITHDRAW_QUERY = z.object({
    status: z
      .enum([
        WithdrawStatus.PENDING,
        WithdrawStatus.PROCESSING,
        WithdrawStatus.APPROVED,
        WithdrawStatus.REJECTED,
        WithdrawStatus.SENT,
      ], {
        error: () => 'Filter status penarikan tidak valid',
      })
      .optional(),
    user_id: z
      .string({
        error: () => 'ID user harus berupa teks',
      })
      .uuid('Format ID user tidak valid')
      .optional(),
  });

  static readonly WITHDRAW_PREVIEW = z.object({
    amount: z.coerce
      .number({
        error: () => 'Jumlah penarikan harus berupa angka',
      })
      .min(1, 'Jumlah penarikan minimal 1'),
    method_id: z.coerce
      .number({
        error: () => 'ID metode penarikan harus berupa angka',
      })
      .int('ID metode penarikan harus berupa bilangan bulat')
      .min(1, 'ID metode penarikan minimal 1'),
  });

  // ================CREDIT POSTING==================
  static readonly ADD_POSTING_CREDIT_PACKAGE = z.object({
    name: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'Nama paket kredit wajib diisi'
            : 'Nama paket kredit harus berupa teks',
      })
      .min(3, 'Nama paket kredit minimal 3 karakter')
      .max(255, 'Nama paket kredit maksimal 255 karakter'),
    credit_amount: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Jumlah kredit wajib diisi'
            : 'Jumlah kredit harus berupa angka',
      })
      .min(1, 'Jumlah kredit minimal 1')
      .max(999, 'Jumlah kredit maksimal 999'),
    price: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'Harga paket wajib diisi'
            : 'Harga paket harus berupa angka',
      })
      .positive('Harga paket harus lebih dari 0'),
  });

  static readonly EDIT_POSTING_CREDIT_PACKAGE = z.object({
    name: z
      .string({
        error: () => 'Nama paket kredit harus berupa teks',
      })
      .min(3, 'Nama paket kredit minimal 3 karakter')
      .max(255, 'Nama paket kredit maksimal 255 karakter')
      .optional(),
    credit_amount: z
      .number({
        error: () => 'Jumlah kredit harus berupa angka',
      })
      .min(1, 'Jumlah kredit minimal 1')
      .max(999, 'Jumlah kredit maksimal 999')
      .optional(),
    price: z
      .number({
        error: () => 'Harga paket harus berupa angka',
      })
      .positive('Harga paket harus lebih dari 0')
      .optional(),
    is_active: z
      .boolean({
        error: () => 'Status aktif paket harus berupa boolean',
      })
      .optional(),
  });

  static readonly TOP_UP_CREDIT = z.object({
    package_id: z
      .number({
        error: (issue) =>
          issue.input === undefined
            ? 'ID paket kredit wajib diisi'
            : 'ID paket kredit harus berupa angka',
      })
      .min(1, 'ID paket kredit minimal 1')
      .positive('ID paket kredit tidak valid'),
  });
}
