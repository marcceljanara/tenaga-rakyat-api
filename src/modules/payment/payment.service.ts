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
  AddPostinCreditPackageRequest,
  AddWithdrawMethodRequest,
  ApproveWithdrawRequest,
  CreateWithdrawRequestRequest,
  CreditBalanceResponse,
  EditPostingCreditPackageRequest,
  ListPostingPackageResponse,
  ListWithdrawMethodResponse,
  ListWithdrawRequestResponse,
  LockWithdrawRequest,
  PostingCreditPurchaseResponse,
  PostingPackageResponse,
  RejectWithdrawRequest,
  SendWithdrawRequest,
  TopupCallbackRequest,
  TopupCreditRequest,
  TopupWalletRequest,
  WalletResponse,
  WithdrawMethodReadyToPay,
  WithdrawMethodResponse,
  WithdrawPreviewRequest,
  WithdrawPreviewResponse,
  WithdrawRequestQueryParams,
  WithdrawRequestResponse,
} from '../../model/payment.model';
import { PaymentValidation } from './payment.validation';
import {
  Prisma,
  PurchaseStatus,
  TransactionType,
  TransactonStatus,
  User,
  WithdrawStatus,
} from '@prisma/client';
import { MidtransService } from './midtrans/midtrans.service';
import { CryptoUtil } from '../../common/crypto.util';
import { dec } from '../../common/decimal.util';
import { ROLES } from '../../common/role/role';
import { WebResponse } from '../../model/web.model';

@Injectable()
export class PaymentService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
    private midtransService: MidtransService,
  ) { }

  // ============================================================
  // EXISTING METHODS (Wallet & Topup)
  // ============================================================

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
    const userRequest = this.validationService.validate(
      PaymentValidation.TOPUP_WALLET,
      request,
    );

    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: user.id,
      },
    });

    if (!wallet) {
      throw new HttpException('Wallet tidak ditemukan', 404);
    }

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

    const midtransRes = await this.midtransService.createTransaction({
      orderId,
      amount: userRequest.balance,
      customerName: user.id,
    });

    return midtransRes;
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

    const orderId: number = Number(body.order_id);
    const grossAmount: number = Number(body.gross_amount);

    if (body.transaction_status === 'settlement') {
      await this.completeTopup(orderId, grossAmount);
    } else if (
      body.transaction_status === 'cancel' ||
      body.transaction_status === 'deny' ||
      body.transaction_status === 'expire'
    ) {
      await this.prismaService.transaction.updateMany({
        where: { id: orderId, status: TransactonStatus.PENDING },
        data: { status: TransactonStatus.FAILED },
      });
    }
    return { success: true };
  }

  async completeTopup(orderId: number, grossAmount: number) {
    await this.prismaService.$transaction(async (tx) => {
      const trx = await tx.transaction.findUnique({
        where: { id: Number(orderId) },
      });

      if (!trx) throw new Error('Transaction not found');
      if (trx.status === TransactonStatus.COMPLETED) return;
      if (Number(trx.amount) !== grossAmount) {
        throw new Error('Transaction amount mismatch');
      }

      const updatedTrx = await tx.transaction.updateMany({
        where: { id: orderId, status: TransactonStatus.PENDING },
        data: { status: TransactonStatus.COMPLETED },
      });

      if (updatedTrx.count === 0) return;

      await tx.wallet.update({
        where: { id: Number(trx.destination_wallet_id) },
        data: { balance: { increment: trx.amount } },
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

    return wallet;
  }

  async getWalletTransaction(walletId: number, userId: string) {
    const wallet = await this.prismaService.wallet.findFirst({
      where: {
        id: walletId,
        user_id: userId,
      },
    });

    if (!wallet) {
      throw new HttpException(
        'Wallet tidak ditemukan atau tidak dimiliki user',
        404,
      );
    }

    const transactions = await this.prismaService.transaction.findMany({
      where: {
        OR: [
          { destination_wallet_id: walletId },
          { source_wallet_id: walletId },
        ],
      },
    });

    return {
      transactions,
    };
  }

  // ============================================================
  // WITHDRAW METHODS
  // ============================================================

  async addWithdrawMethod(
    userId: string,
    request: AddWithdrawMethodRequest,
  ): Promise<WithdrawMethodResponse> {
    this.logger.debug(`Request add withdraw method ${JSON.stringify(request)}`);
    const userRequest: AddWithdrawMethodRequest =
      this.validationService.validate(
        PaymentValidation.ADD_WITHDRAW_METHOD,
        request,
      );

    const count = await this.prismaService.withdrawMethod.count({
      where: {
        user_id: userId,
      },
    });

    if (count >= 5)
      throw new HttpException(
        'Batas maksimal metode pembayaran yang dapat ditambahkan adalah 5',
        400,
      );

    const withdraw = await this.prismaService.withdrawMethod.create({
      data: {
        user_id: userId,
        provider: userRequest.provider,
        account_name: userRequest.account_name,
        account_number: CryptoUtil.encrypt(userRequest.account_number),
        method: userRequest.method,
      },
    });

    return {
      ...withdraw,
      account_number: CryptoUtil.decrypt(withdraw.account_number),
    };
  }

  async getWithdrawMethod(userId: string): Promise<ListWithdrawMethodResponse> {
    const withdraws = await this.prismaService.withdrawMethod.findMany({
      where: {
        user_id: userId,
        is_active: true,
      },
    });
    return {
      withdraw_methods: withdraws.map((map) => ({
        id: map.id,
        method: map.method,
        provider: map.provider,
        account_name: map.account_name,
        account_number: CryptoUtil.decrypt(map.account_number),
        is_active: map.is_active,
      })),
    };
  }

  async deleteWithdrawMethod(
    methodId: number,
    userId: string,
  ): Promise<string> {
    const withdraw = await this.prismaService.withdrawMethod.findFirst({
      where: {
        id: methodId,
        user_id: userId,
        is_active: true,
      },
    });

    if (!withdraw) {
      throw new HttpException('Metode Penarikan tidak ditemukan', 404);
    }

    await this.prismaService.withdrawMethod.delete({
      where: { id: methodId },
    });

    return 'Metode penarikan berhasil dihapus';
  }

  // ============================================================
  // WITHDRAW REQUESTS - USER
  // ============================================================

  async createWithdrawRequest(
    userId: string,
    request: CreateWithdrawRequestRequest,
  ): Promise<WithdrawRequestResponse> {
    this.logger.debug(
      `Create withdraw request ${JSON.stringify(request)} by user ${userId}`,
    );

    const userRequest = this.validationService.validate(
      PaymentValidation.CREATE_WITHDRAW_REQUEST,
      request,
    );

    // Validate withdraw method exists and belongs to user
    const withdrawMethod = await this.prismaService.withdrawMethod.findFirst({
      where: {
        id: userRequest.method_id,
        user_id: userId,
        is_active: true,
      },
    });

    if (!withdrawMethod) {
      throw new HttpException(
        'Metode penarikan tidak ditemukan atau tidak aktif',
        404,
      );
    }

    // Create withdraw request in transaction
    const withdrawRequest = await this.prismaService.$transaction(
      async (tx) => {
        // Check wallet balance
        const wallet = await tx.wallet.findUnique({
          where: { user_id: userId },
        });

        if (!wallet) {
          throw new HttpException('Wallet tidak ditemukan', 404);
        }

        if (wallet.balance.lessThan(userRequest.amount)) {
          throw new HttpException('Saldo tidak mencukupi', 400);
        }

        // Deduct balance from wallet
        const updatedWallet = await tx.wallet.updateMany({
          where: {
            id: wallet.id,
            balance: { gte: userRequest.amount }
          },
          data: {
            balance: {
              decrement: userRequest.amount,
            },
          },
        });

        if (updatedWallet.count === 0) {
          throw new HttpException('Saldo tidak mencukupi', 400);
        }

        // Create transaction record
        await tx.transaction.create({
          data: {
            amount: userRequest.amount,
            transaction_type: TransactionType.WITHDRAWAL,
            status: TransactonStatus.PENDING,
            source_wallet_id: wallet.id,
          },
        });

        // fetch data withdraw fee
        const fee = await tx.fee.findUnique({
          where: {
            name: 'withdraw_fee',
          },
        });

        if (!fee) throw new HttpException('Fee tidak ditemukan', 500);

        // Create withdraw request
        const newRequest = await tx.withdrawRequest.create({
          data: {
            user_id: userId,
            method_id: userRequest.method_id,
            amount: userRequest.amount,
            status: WithdrawStatus.PENDING,
            fee_value: fee.value,
            fee_type: fee.fee_type,
            fee_charged: fee.value,
          },
          include: {
            method: true,
          },
        });

        // Add fee to platform wallet
        await tx.platformWallet.update({
          where: {
            id: 1,
          },
          data: {
            balance: {
              increment: fee.value,
            },
          },
        });

        // Add transaction in platform transaction
        await tx.platformTransaction.create({
          data: {
            amount: fee.value,
            type: 'WITHDRAW_FEE',
            description: `Fee transaksi penarikan sebesar Rp${Number(fee.value)}`,
            reference_id: newRequest.id,
          },
        });

        return newRequest;
      },
    );

    return {
      id: withdrawRequest.id,
      amount: withdrawRequest.amount,
      fee_charged: withdrawRequest.fee_charged,
      status: withdrawRequest.status,
      created_at: withdrawRequest.created_at,
      method: {
        id: withdrawMethod.id,
        method: withdrawMethod.method,
        provider: withdrawMethod.provider,
        account_name: withdrawMethod.account_name,
        account_number: CryptoUtil.decrypt(withdrawMethod.account_number),
        is_active: withdrawMethod.is_active,
      },
    };
  }

  async withdrawPreview(
    request: WithdrawPreviewRequest,
    userId: string,
  ): Promise<WithdrawPreviewResponse> {
    const userRequest = this.validationService.validate(
      PaymentValidation.WITHDRAW_PREVIEW,
      request,
    );
    const fee = await this.prismaService.fee.findUnique({
      where: {
        name: 'withdraw_fee',
      },
    });

    if (!fee) throw new HttpException('Fee tidak ditemukan', 500);

    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
    });

    if (!wallet)
      throw new HttpException('Wallet tidak ditemukan atau tidak aktif', 404);

    const method = await this.prismaService.withdrawMethod.findUnique({
      where: {
        id: userRequest.method_id,
      },
    });

    if (!method) {
      throw new HttpException(
        'Gagal melakukan estimasi penarikan, metode pembayaran belum ditambahkan',
        400,
      );
    }

    const amountRequested = dec(userRequest.amount);

    if (wallet.balance.lessThan(amountRequested)) {
      throw new HttpException(
        'Gagal melakukan estimasi, saldo anda tidak cukup untuk melakukan withdraw',
        400,
      );
    }

    if (amountRequested.lessThan(fee.value)) {
      throw new HttpException(
        'Nominal withdraw terlalu kecil untuk dikenai fee',
        400,
      );
    }

    const netAmount = amountRequested.minus(fee.value);
    return {
      amount_requested: amountRequested,
      fee_charged: fee.value,
      net_amount: netAmount,
      can_withdraw: true,
      reason: 'VALID TRANSACTION',
    };
  }

  async getUserWithdrawRequests(
    userId: string,
  ): Promise<ListWithdrawRequestResponse> {
    const requests = await this.prismaService.withdrawRequest.findMany({
      where: {
        user_id: userId,
      },
      include: {
        method: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      requests: requests.map((req) => ({
        id: req.id,
        user_id: req.user_id,
        amount: req.amount,
        status: req.status,
        method: req.method.method,
        provider: req.method.provider,
        account_name: req.method.account_name,
        account_number: CryptoUtil.decrypt(req.method.account_number),
        created_at: req.created_at,
        admin_locked_by: req.admin_locked_by,
        admin_note: req.admin_note,
      })),
    };
  }

  async getWithdrawRequestDetail(
    requestId: number,
    userId: string,
    roleId: number,
  ): Promise<WithdrawRequestResponse> {
    const isAdmin = roleId == ROLES.ADMIN || roleId == ROLES.SUPER_ADMIN;
    const request = await this.prismaService.withdrawRequest.findFirst({
      where: {
        id: requestId,
        ...(isAdmin ? {} : { user_id: userId }),
      },
      include: {
        method: true,
      },
    });

    if (!request) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    return {
      id: request.id,
      amount: request.amount,
      fee_charged: request.fee_charged,
      status: request.status,
      created_at: request.created_at,
      admin_note: request.admin_note,
      transfer_receipt: request.transfer_receipt,
      admin_locked_by: request.admin_locked_by,
      admin_approved_by: request.admin_approved_by,
      admin_rejected_by: request.admin_rejected_by,
      method: {
        id: request.method.id,
        method: request.method.method,
        provider: request.method.provider,
        account_name: request.method.account_name,
        account_number: CryptoUtil.decrypt(request.method.account_number),
        is_active: request.method.is_active,
      },
    };
  }

  // ============================================================
  // WITHDRAW REQUESTS - ADMIN
  // ============================================================

  async getAllWithdrawRequests(
    query: WithdrawRequestQueryParams,
  ): Promise<ListWithdrawRequestResponse> {
    const validatedQuery = this.validationService.validate(
      PaymentValidation.WITHDRAW_QUERY,
      query,
    );

    const where: any = {};
    if (validatedQuery.status) {
      where.status = validatedQuery.status;
    }
    if (validatedQuery.user_id) {
      where.user_id = validatedQuery.user_id;
    }

    const requests = await this.prismaService.withdrawRequest.findMany({
      where,
      include: {
        method: true,
        user: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return {
      requests: requests.map((req) => ({
        id: req.id,
        user_id: req.user_id,
        amount: req.amount,
        status: req.status,
        method: req.method.method,
        provider: req.method.provider,
        account_name: req.method.account_name,
        account_number: CryptoUtil.decrypt(req.method.account_number),
        created_at: req.created_at,
        admin_locked_by: req.admin_locked_by,
        admin_note: req.admin_note,
      })),
    };
  }

  async lockWithdrawRequest(
    requestId: number,
    adminId: string,
    request: LockWithdrawRequest,
  ): Promise<void> {
    const validatedRequest = this.validationService.validate(
      PaymentValidation.LOCK_WITHDRAW,
      request,
    );

    const withdrawRequest = await this.prismaService.withdrawRequest.findUnique(
      {
        where: { id: requestId },
      },
    );

    if (!withdrawRequest) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    if (withdrawRequest.status !== WithdrawStatus.PENDING) {
      throw new HttpException(
        'Hanya request dengan status PENDING yang bisa di-lock',
        400,
      );
    }

    if (
      withdrawRequest.admin_locked_by &&
      withdrawRequest.admin_locked_by !== adminId
    ) {
      throw new HttpException(
        'Request ini sedang dikerjakan oleh admin lain',
        409,
      );
    }

    await this.prismaService.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: WithdrawStatus.PROCESSING,
        admin_locked_by: adminId,
        admin_note: validatedRequest.admin_note,
      },
    });

    this.logger.info(
      `Withdraw request ${requestId} locked by admin ${adminId}`,
    );
  }

  async unlockWithdrawRequest(
    requestId: number,
    adminId: string,
  ): Promise<void> {
    const withdrawRequest = await this.prismaService.withdrawRequest.findUnique(
      {
        where: { id: requestId },
      },
    );

    if (!withdrawRequest) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    if (withdrawRequest.status !== WithdrawStatus.PROCESSING) {
      throw new HttpException(
        'Hanya request dengan status PROCESSING yang bisa di-unlock',
        400,
      );
    }

    if (withdrawRequest.admin_locked_by !== adminId) {
      throw new HttpException(
        'Anda tidak memiliki akses untuk unlock request ini',
        403,
      );
    }

    await this.prismaService.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: WithdrawStatus.PENDING,
        admin_locked_by: null,
      },
    });

    this.logger.info(
      `Withdraw request ${requestId} unlocked by admin ${adminId}`,
    );
  }

  async approveWithdrawRequest(
    requestId: number,
    adminId: string,
    request: ApproveWithdrawRequest,
  ): Promise<WithdrawMethodReadyToPay> {
    const validatedRequest = this.validationService.validate(
      PaymentValidation.APPROVE_WITHDRAW,
      request,
    );

    const withdrawRequest = await this.prismaService.withdrawRequest.findUnique(
      {
        where: { id: requestId },
        include: { method: true },
      },
    );

    if (!withdrawRequest) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    if (withdrawRequest.status !== WithdrawStatus.PROCESSING) {
      throw new HttpException(
        'Hanya request dengan status PROCESSING yang bisa di-approve',
        400,
      );
    }

    if (withdrawRequest.admin_locked_by !== adminId) {
      throw new HttpException(
        'Anda tidak memiliki akses untuk approve request ini',
        403,
      );
    }

    await this.prismaService.withdrawRequest.update({
      where: { id: requestId },
      data: {
        status: WithdrawStatus.APPROVED,
        admin_approved_by: adminId,
        admin_note: validatedRequest.admin_note || withdrawRequest.admin_note,
      },
    });

    this.logger.info(
      `Withdraw request ${requestId} approved by admin ${adminId}`,
    );

    return {
      account_name: withdrawRequest.method.account_name,
      account_number: CryptoUtil.decrypt(withdrawRequest.method.account_number),
      method: withdrawRequest.method.method,
      provider: withdrawRequest.method.provider,
    };
  }

  async rejectWithdrawRequest(
    requestId: number,
    adminId: string,
    request: RejectWithdrawRequest,
  ): Promise<void> {
    const validatedRequest = this.validationService.validate(
      PaymentValidation.REJECT_WITHDRAW,
      request,
    );

    const withdrawRequest = await this.prismaService.withdrawRequest.findUnique(
      {
        where: { id: requestId },
        include: {
          user: {
            include: {
              wallets: true,
            },
          },
        },
      },
    );

    if (!withdrawRequest) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    if (withdrawRequest.status !== WithdrawStatus.PROCESSING) {
      throw new HttpException(
        'Hanya request dengan status PROCESSING yang bisa di-reject',
        400,
      );
    }

    if (withdrawRequest.admin_locked_by !== adminId) {
      throw new HttpException(
        'Anda tidak memiliki akses untuk reject request ini',
        403,
      );
    }

    // Refund balance to user wallet
    await this.prismaService.$transaction(async (tx) => {
      // Return balance to wallet
      await tx.wallet.update({
        where: { user_id: withdrawRequest.user_id },
        data: {
          balance: {
            increment: withdrawRequest.amount,
          },
        },
      });

      // Decrement balance platfrom wallet from fee
      await tx.platformWallet.update({
        where: {
          id: 1,
        },
        data: {
          balance: {
            decrement: withdrawRequest.fee_charged,
          },
        },
      });

      // Create new transaction platform wallet
      await tx.platformTransaction.create({
        data: {
          amount: withdrawRequest.fee_charged,
          type: 'WITHDRAW_FEE',
          description: `[REFUND] fee sebesar ${Number(withdrawRequest.fee_charged)}`,
          reference_id: withdrawRequest.id,
        },
      });

      // Update request status
      await tx.withdrawRequest.update({
        where: { id: requestId },
        data: {
          status: WithdrawStatus.REJECTED,
          admin_rejected_by: adminId,
          admin_note: validatedRequest.admin_note,
        },
      });

      // Create refund transaction
      await tx.transaction.create({
        data: {
          amount: withdrawRequest.amount,
          transaction_type: TransactionType.FUNDING,
          status: TransactonStatus.COMPLETED,
          destination_wallet_id: withdrawRequest.user.wallets?.id,
        },
      });
    });

    this.logger.info(
      `Withdraw request ${requestId} rejected by admin ${adminId}`,
    );
  }

  async sendWithdrawRequest(
    requestId: number,
    request: SendWithdrawRequest,
  ): Promise<void> {
    const validatedRequest = this.validationService.validate(
      PaymentValidation.SEND_WITHDRAW,
      request,
    );

    const withdrawRequest = await this.prismaService.withdrawRequest.findUnique(
      {
        where: { id: requestId },
      },
    );

    if (!withdrawRequest) {
      throw new HttpException('Withdraw request tidak ditemukan', 404);
    }

    // ✅ SIMPLE & EFFECTIVE: Status check is enough!
    if (withdrawRequest.status !== WithdrawStatus.APPROVED) {
      throw new HttpException(
        `Request tidak bisa di-send. Status saat ini: ${withdrawRequest.status}. ` +
        `Hanya request dengan status APPROVED yang bisa di-send.`,
        400,
      );
    }

    await this.prismaService.$transaction(async (tx) => {
      // Update withdraw request
      await tx.withdrawRequest.update({
        where: { id: requestId },
        data: {
          status: WithdrawStatus.SENT,
          transfer_receipt: validatedRequest.transfer_receipt,
        },
      });

      // Update transaction status
      const userWallet = await tx.wallet.findUnique({
        where: { user_id: withdrawRequest.user_id },
      });

      await tx.transaction.updateMany({
        where: {
          amount: withdrawRequest.amount,
          transaction_type: TransactionType.WITHDRAWAL,
          source_wallet_id: userWallet?.id,
          status: TransactonStatus.PENDING,
        },
        data: {
          status: TransactonStatus.COMPLETED,
        },
      });
    });

    this.logger.info(`Withdraw request ${requestId} marked as SENT`);
  }

  // ===========LOGIC SERVICE UNTUK KREDIT=========================================================
  async getPostingCreditPackages(): Promise<ListPostingPackageResponse> {
    const result = await this.prismaService.postingCreditPackage.findMany({
      orderBy: {
        credit_amount: 'asc',
      },
    });
    return {
      packages: result,
    };
  }

  async getPostingCreditPackagesGeneral(): Promise<ListPostingPackageResponse> {
    const result = await this.prismaService.postingCreditPackage.findMany({
      orderBy: {
        credit_amount: 'asc',
      },
      where: {
        is_active: true,
      },
      select: {
        id: true,
        name: true,
        credit_amount: true,
        price: true,
      },
    });
    return {
      packages: result,
    };
  }

  async addPostingCreditPackage(
    request: AddPostinCreditPackageRequest,
  ): Promise<PostingPackageResponse> {
    this.logger.debug('Request add posting credit package: ', request);
    const userRequest = this.validationService.validate(
      PaymentValidation.ADD_POSTING_CREDIT_PACKAGE,
      request,
    );
    const result = await this.prismaService.postingCreditPackage.create({
      data: {
        name: userRequest.name,
        credit_amount: userRequest.credit_amount,
        price: userRequest.price,
      },
    });
    return result;
  }

  async editPostingCreditPackageById(
    packageId: number,
    request: EditPostingCreditPackageRequest,
  ): Promise<PostingPackageResponse> {
    const userRequest = this.validationService.validate(
      PaymentValidation.EDIT_POSTING_CREDIT_PACKAGE,
      request,
    );
    const result = await this.prismaService.postingCreditPackage.update({
      where: {
        id: packageId,
      },
      data: {
        name: userRequest.name,
        price: userRequest.price,
        credit_amount: userRequest.credit_amount,
        is_active: userRequest.is_active,
      },
    });

    if (!result) {
      throw new HttpException('Package Posting tidak ditemukan', 404);
    }

    return result;
  }

  async deletePostingCreditPackage(packageId: number): Promise<string> {
    this.logger.debug(`Log delete posting credit ID: ${packageId}`);
    const result = await this.prismaService.postingCreditPackage.delete({
      where: {
        id: packageId,
      },
    });
    if (!result) {
      throw new HttpException('Package Posting tidak ditemukan', 404);
    }
    return `Package ID ${packageId} berhasil dihapus`;
  }

  async getCredit(userId: string): Promise<CreditBalanceResponse> {
    this.logger.debug('User ID Credit Balance: ', userId);
    const result = await this.prismaService.userPostingQuota.findUnique({
      where: {
        user_id: userId,
      },
      select: {
        free_quota: true,
        paid_credit: true,
      },
    });
    if (!result) {
      throw new HttpException('Credit tidak ditemukan', 404);
    }
    return result;
  }

  async createTopupCreditTransaction(request: TopupCreditRequest, user: User) {
    const userRequest = this.validationService.validate(
      PaymentValidation.TOP_UP_CREDIT,
      request,
    );

    const userPostingQuota =
      await this.prismaService.userPostingQuota.findUnique({
        where: { user_id: user.id },
        include: {
          user: true,
        },
      });

    if (!userPostingQuota) {
      throw new HttpException('User Quota tidak ditemukan', 404);
    }

    const creditPackage =
      await this.prismaService.postingCreditPackage.findUnique({
        where: { id: userRequest.package_id },
      });

    if (!creditPackage) {
      throw new HttpException('Credit package tidak ditemukan', 404);
    }

    // Generate orderId sebelum transaction supaya konsisten
    const orderId: string = crypto.randomUUID();

    // 🔥 DB Transaction (Atomic)
    await this.prismaService.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            amount: creditPackage.price,
            transaction_type: TransactionType.FUNDING,
            status: TransactonStatus.PENDING,
            destination_wallet_id: null,
            source_wallet_id: null,
          },
        });

        const purchase = await tx.postingCreditPurchase.create({
          data: {
            user_id: userPostingQuota.user_id,
            package_id: creditPackage.id,
            credit_amount: creditPackage.credit_amount,
            total_price: creditPackage.price,
            payment_reference: orderId,
            transaction_id: transaction.id, // penting untuk relasi
          },
        });

        return { transaction, purchase };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    try {
      // 🌍 External Call (DI LUAR transaction DB)
      const midtransRes = await this.midtransService.createTransaction({
        orderId,
        amount: Number(creditPackage.price),
        customerName: userPostingQuota.user.full_name,
        customerEmail: userPostingQuota.user.email,
        itemName: 'Top Up Credit',
      });

      return midtransRes;
    } catch (err) {
      await this.prismaService.postingCreditPurchase.update({
        where: { payment_reference: orderId },
        data: { status: PurchaseStatus.FAILED },
      });

      throw err;
    }
  }

  async handleCallbackCredit(body: TopupCallbackRequest) {
    const isValid = this.midtransService.verifySignature(
      body.order_id,
      body.status_code,
      body.gross_amount,
      body.signature_key,
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    const orderId = body.order_id;

    switch (body.transaction_status) {
      case 'settlement':
        await this.completeTopupCredit(orderId, body);
        break;

      case 'expire':
        await this.markExpired(orderId);
        break;
      case 'cancel':
        await this.markFailed(orderId);
        break;

      case 'deny':
        await this.markFailed(orderId);
        break;

      case 'pending':
        break;

      default:
        console.warn('Unhandled Midtrans status:', body.transaction_status);
    }

    return { success: true };
  }

  async markExpired(orderId: string) {
    await this.prismaService.postingCreditPurchase.updateMany({
      where: {
        payment_reference: orderId,
        status: PurchaseStatus.PENDING,
      },
      data: {
        status: PurchaseStatus.EXPIRED,
      },
    });
  }

  async markFailed(orderId: string) {
    await this.prismaService.postingCreditPurchase.updateMany({
      where: {
        payment_reference: orderId,
        status: PurchaseStatus.PENDING,
      },
      data: {
        status: PurchaseStatus.FAILED,
      },
    });
  }

  async completeTopupCredit(orderId: string, body: TopupCallbackRequest) {
    await this.prismaService.$transaction(
      async (tx) => {
        const creditPurchaseTx = await tx.postingCreditPurchase.findUnique({
          where: {
            payment_reference: orderId,
          },
        });

        if (!creditPurchaseTx) {
          throw new HttpException('Purchase not found', 404);
        }

        if (
          Number(body.gross_amount) !== Number(creditPurchaseTx.total_price)
        ) {
          throw new Error('Amount mismatch');
        }

        if (creditPurchaseTx.status === PurchaseStatus.PAID) return;

        if (creditPurchaseTx.status === PurchaseStatus.EXPIRED) {
          throw new HttpException(
            'Transaksi pembayaran telah expired/kadaluarsa',
            410,
          );
        }

        if (creditPurchaseTx.status === PurchaseStatus.FAILED) {
          throw new HttpException('Transaksi pembayaran gagal', 422);
        }

        const updated = await tx.postingCreditPurchase.updateMany({
          where: {
            payment_reference: orderId,
            status: PurchaseStatus.PENDING, // guard
          },
          data: {
            paid_at: new Date(),
            status: PurchaseStatus.PAID,
          },
        });

        if (updated.count === 0) {
          return; // sudah pernah diproses
        }

        const trx = await tx.transaction.findUnique({
          where: { id: creditPurchaseTx.transaction_id },
        });

        if (!trx) throw new Error('Transaction not found');
        if (trx.status === TransactonStatus.COMPLETED) return;

        await tx.transaction.update({
          where: { id: trx.id },
          data: { status: TransactonStatus.COMPLETED },
        });

        await tx.userPostingQuota.update({
          where: {
            user_id: creditPurchaseTx.user_id,
          },
          data: {
            paid_credit: {
              increment: creditPurchaseTx.credit_amount,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    console.log('Topup success:', orderId);
  }

  async getPostingCreditPurchaseByUserId(
    userId: string,
    page: number = 1,
    size: number = 10,
  ): Promise<WebResponse<PostingCreditPurchaseResponse[]>> {
    this.logger.debug(`Get posting credit purchase userId: ${userId}`);
    const skip = (page - 1) * size;
    const [total, result] = await this.prismaService.$transaction([
      this.prismaService.postingCreditPurchase.count({
        where: {
          user_id: userId,
        },
      }),

      this.prismaService.postingCreditPurchase.findMany({
        where: {
          user_id: userId,
        },
        skip,
        take: size,
        orderBy: {
          paid_at: 'desc',
        },
        select: {
          paid_at: true,
          payment_reference: true,
          status: true,
          credit_amount: true,
          total_price: true,
        },
      }),
    ]);

    return {
      data: result,
      paging: {
        size,
        total_page: Math.ceil(total / size),
        current_page: page,
        total_data: total,
      },
    };
  }
}
