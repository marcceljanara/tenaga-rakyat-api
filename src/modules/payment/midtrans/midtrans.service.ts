import { Injectable } from '@nestjs/common';
import midtransClient from 'midtrans-client';
import { midtransConfig } from './midtrans.config';
import crypto from 'crypto';
import { MidtransSnapParams } from '../../../model/payment.model';

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;

  constructor() {
    this.snap = new midtransClient.Snap({
      isProduction: midtransConfig.isProduction,
      serverKey: midtransConfig.serverKey,
      clientKey: midtransConfig.clientKey,
    });
  }

  async createTransaction(params: {
    orderId: string;
    amount: number;
    customerName?: string;
    customerEmail?: string;
  }) {
    const { orderId, amount, customerName, customerEmail } = params;

    const parameter: MidtransSnapParams = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: customerName ?? 'Guest',
        email: customerEmail ?? 'guest@example.com',
      },
      item_details: [
        {
          id: '1',
          price: amount,
          quantity: 1,
          name: 'Topup Wallet',
        },
      ],
    };

    try {
      const transaction = await this.snap.createTransaction(parameter);

      return {
        token: transaction.token,
        redirectUrl: transaction.redirect_url,
      };
    } catch (err) {
      console.error('Midtrans error:', err);
      throw new Error('Failed to create Midtrans transaction');
    }
  }

  /**
   * (Opsional) verifikasi signature pada callback Midtrans
   */
  verifySignature(
    orderId: string,
    statusCode: string,
    grossAmount: string,
    signature: string,
  ): boolean {
    const payload =
      orderId + statusCode + grossAmount + midtransConfig.serverKey;

    const generatedSignature = crypto
      .createHash('sha512')
      .update(payload)
      .digest('hex');

    return generatedSignature === signature;
  }
}
