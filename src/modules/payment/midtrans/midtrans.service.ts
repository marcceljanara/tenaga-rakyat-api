import { Inject, Injectable } from '@nestjs/common';
import midtransClient from 'midtrans-client';
import { midtransConfig } from './midtrans.config';
import crypto from 'crypto';
import { MidtransSnapParams } from '../../../model/payment.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {
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
    itemName?: string;
  }) {
    const { orderId, amount, customerName, customerEmail, itemName } = params;

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
          name: itemName || 'Topup Credit',
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
      this.logger.error('[Midtrans] createTransaction failed', {
        orderId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new Error('Failed to create Midtrans transaction');
    }
  }

  /**
   * [WAJIB] Verifikasi signature dari Midtrans webhook notification.
   * Signature = SHA512(order_id + status_code + gross_amount + server_key)
   * Ref: https://docs.midtrans.com/docs/https-notification-webhooks
   *
   * JANGAN lewati verifikasi ini — tanpa ini siapa pun bisa mengirim
   * fake webhook dan menambah kredit secara ilegal.
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
