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
  TransactionResponse,
  WalletResponse,
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

    if (!wallet) {
      throw new HttpException('Wallet tidak ditemukan', 404);
    }

    // Simpan transaksi pending di database
    const transaction = await this.prismaService.transaction.create({
      data: {
        amount: userRequest.balance,
        transaction_type: TransactionType.FUNDING,
        status: TransactonStatus.PENDING,
        destination_wallet_id: wallet.id,
        source_wallet_id: null,
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
        where: { id: Number(trx.destination_wallet_id) },
        data: { balance: { increment: trx.amount } },
      });

      // Update status transaksi
      await tx.transaction.update({
        where: { id: orderId },
        data: { status: TransactonStatus.COMPLETED },
      });
    });
  }

  async getWallet(userId: string): Promise<WalletResponse> {
    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: userId,
      },
    });

    if (!wallet) {
      throw new HttpException('Wallet tidak ditemukan', 404);
    }

    return this.mapToWalletResponse(wallet);
  }

  async getWalletTransaction(walletId: number, userId: string) {
    // Cari wallet yang benar-benar milik user
    const wallet = await this.prismaService.wallet.findFirst({
      where: {
        id: walletId,
        user_id: userId,
      },
    });
    // console.log(wallet);

    if (!wallet) {
      throw new HttpException(
        'Wallet tidak ditemukan atau tidak dimiliki user',
        404,
      );
    }

    // Ambil transaksi wallet tersebut
    const transactions = await this.prismaService.transaction.findMany({
      where: {
        OR: [
          { destination_wallet_id: walletId },
          { source_wallet_id: walletId },
        ],
      },
    });

    return {
      transactions: transactions.map((transaction) =>
        this.mapToTransactionResponse(transaction),
      ),
    };
  }

  private mapToWalletResponse(wallet: any): WalletResponse {
    return {
      id: Number(wallet.id),
      user_id: wallet.user_id,
      balance: Number(wallet.balance),
      status: wallet.status,
    };
  }

  private mapToTransactionResponse(transaction: any): TransactionResponse {
    return {
      id: Number(transaction.id),
      source_wallet_id: Number(transaction.source_wallet_id),
      destination_wallet_id: Number(transaction.destination_wallet_id),
      job_id: Number(transaction.job_id),
      amount: Number(transaction.amount),
      transaction_type: transaction.transaction_type,
      status: transaction.status,
      created_at: transaction.created_at,
      updated_at: transaction.updated_at,
    };
  }
}
