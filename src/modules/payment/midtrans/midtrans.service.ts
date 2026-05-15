import { Inject, Injectable } from '@nestjs/common';
import midtransClient from 'midtrans-client';
import { midtransConfig } from './midtrans.config';
import crypto from 'crypto';
import { MidtransSnapParams } from '../../../model/payment.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { observabilityMetrics } from '../../../observability/metrics';
import { runWithSpan } from '../../../observability/tracing.util';

@Injectable()
export class MidtransService {
  private snap: midtransClient.Snap;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
    return runWithSpan(
      'midtrans.create_transaction',
      {
        'app.payment.provider': 'midtrans',
        'app.payment.operation': 'create_transaction',
      },
      async () => {
        const { orderId, amount, customerName, customerEmail, itemName } =
          params;

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
          observabilityMetrics.recordMidtransRequest({
            operation: 'create_transaction',
            result: 'success',
          });

          return {
            token: transaction.token,
            redirectUrl: transaction.redirect_url,
          };
        } catch (err) {
          observabilityMetrics.recordMidtransRequest({
            operation: 'create_transaction',
            result: 'failed',
          });
          this.logger.error('midtrans_create_transaction_failed', {
            error: err,
          });
          throw new Error('Failed to create Midtrans transaction');
        }
      },
    );
  }

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
