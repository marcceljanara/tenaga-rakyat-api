import z from 'zod';

export class PaymentValidation {
  static readonly TOPUP_WALLET = z.object({
    user_id: z.uuidv4('ID pengguna tidak valid'),
    balance: z.number().positive(),
  });
}
