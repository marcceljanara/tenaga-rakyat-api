import { WithdrawStatus, WithdrawType } from '@prisma/client';
import z from 'zod';

export class PaymentValidation {
  static readonly TOPUP_WALLET = z.object({
    balance: z.number().positive(),
  });

  static readonly TOPUP_ADMIN = z.object({
    user_id: z.uuidv4(),
    balance: z.number().positive(),
  });

  static readonly ADD_WITHDRAW_METHOD = z.object({
    method: z.enum([WithdrawType.BANK_TRANSFER, WithdrawType.EWALLET]),
    provider: z.enum(['Dana', 'OVO', 'BRI', 'BNI', 'Mandiri']),
    account_name: z.string().min(3).max(100),
    account_number: z.string().min(3).max(50),
  });

  static readonly CREATE_WITHDRAW_REQUEST = z.object({
    amount: z
      .number()
      .positive()
      .min(10000, 'Minimum withdraw amount is 10,000'),
    method_id: z.number().int().positive(),
  });

  static readonly LOCK_WITHDRAW = z.object({
    admin_note: z.string().max(255).optional(),
  });

  static readonly APPROVE_WITHDRAW = z.object({
    admin_note: z.string().max(255).optional(),
  });

  static readonly REJECT_WITHDRAW = z.object({
    admin_note: z.string().min(1).max(255, 'Rejection reason is required'),
  });

  static readonly SEND_WITHDRAW = z.object({
    transfer_receipt: z.string().url('Invalid receipt URL'),
  });

  static readonly WITHDRAW_QUERY = z.object({
    status: z
      .enum([
        WithdrawStatus.PENDING,
        WithdrawStatus.PROCESSING,
        WithdrawStatus.APPROVED,
        WithdrawStatus.REJECTED,
        WithdrawStatus.SENT,
      ])
      .optional(),
    user_id: z.string().uuid().optional(),
  });

  static readonly WITHDRAW_PREVIEW = z.object({
    amount: z.coerce.number().min(1),
    method_id: z.coerce.number().int().min(1),
  });
}
