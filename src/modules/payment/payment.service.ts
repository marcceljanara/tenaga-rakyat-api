import {
  HttpException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import { Logger } from 'winston';
import {
  AddBalanceWalletInitRequest,
  TopupCallbackRequest,
  TopupWalletRequest,
} from '../../model/payment.model';
import { PaymentValidation } from './payment.validation';
import { TransactionType, TransactonStatus, User } from '@prisma/client';
import { MidtransService } from './midtrans/midtrans.service';

@Injectable()
export class PaymentService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private midtransService: MidtransService,
  ) {}

  async addBalance(request: AddBalanceWalletInitRequest): Promise<void> {
    this.logger.debug(`Add balance wallet initial ${JSON.stringify(request)}`);
    const userRequest: AddBalanceWalletInitRequest =
      this.validationService.validate(PaymentValidation.TOPUP_ADMIN, request);

    await this.prismaService.$transaction(async (tx) => {
      const wallet = await tx.wallet.updateMany({
        where: {
          user_id: userRequest.user_id,
        },
        data: {
          balance: {
            increment: userRequest.balance,
          },
        },
      });
      await tx.transaction.create({
        data: {
          amount: userRequest.balance,
          transaction_type: TransactionType.FUNDING,
          status: TransactonStatus.COMPLETED,
        },
      });
      if (!wallet.count) {
        throw new HttpException('Wallet not found', 404);
      }
    });
  }

  async createTopupTransaction(request: TopupWalletRequest, user: User) {
    // Validasi input
    const userRequest = this.validationService.validate(
      PaymentValidation.TOPUP_WALLET,
      request,
    );

    // Ambil wallet user
    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: user.id,
      },
    });

    // Simpan transaksi pending di database
    const transaction = await this.prismaService.transaction.create({
      data: {
        amount: userRequest.balance,
        transaction_type: TransactionType.FUNDING,
        status: TransactonStatus.PENDING,
        source_wallet_id: wallet?.id || null,
      },
    });

    const orderId = String(transaction.id);

    // Buat transaksi Snap
    const midtransRes = await this.midtransService.createTransaction({
      orderId,
      amount: userRequest.balance,
      customerName: user.id,
    });

    return midtransRes; // {token, redirectUrl}
  }

  async handleCallback(body: TopupCallbackRequest) {
    const isValid = this.midtransService.verifySignature(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // update status DB
    const orderId: number = Number(body.order_id);
    if (body.transaction_status === 'settlement') {
      await this.completeTopup(orderId);
    }
    return { success: true };
  }

  async completeTopup(orderId: number) {
    await this.prismaService.$transaction(async (tx) => {
      const trx = await tx.transaction.findUnique({
        where: { id: Number(orderId) },
      });

      if (!trx) throw new Error('Transaction not found');
      if (trx.status === TransactonStatus.COMPLETED) return;

      // Tambah saldo
      await tx.wallet.update({
        where: { id: Number(trx.source_wallet_id) },
        data: { balance: { increment: trx.amount } },
      });

      // Update status transaksi
      await tx.transaction.update({
        where: { id: orderId },
        data: { status: TransactonStatus.COMPLETED },
      });
    });
  }
}
