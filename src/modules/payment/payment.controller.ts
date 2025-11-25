import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import {
  AddBalanceWalletInitRequest,
  TopupCallbackRequest,
  TopupWalletRequest,
  TransactionListResponse,
  WalletResponse,
} from '../../model/payment.model';
import { WebResponse } from '../../model/web.model';

@Controller('/api')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('/admins/wallets/balance-initial')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  async addBalanceInitial(
    @Auth() user: User,
    @Body() request: AddBalanceWalletInitRequest,
  ): Promise<WebResponse<null>> {
    await this.paymentService.addBalance(request);
    return {
      message: 'Saldo wallet berhasil ditambahan',
    };
  }

  @Post('/wallets/topup')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async topupWallet(
    @Auth() user: User,
    @Body() request: TopupWalletRequest,
  ): Promise<WebResponse<any>> {
    const result = await this.paymentService.createTopupTransaction(
      request,
      user,
    );

    return {
      message: 'Silahkan selesaikan pembayaran',
      data: result, // {token, redirectUrl}
    };
  }

  @Post('/webhook/midtrans')
  @HttpCode(200)
  async midtransCallback(@Body() body: TopupCallbackRequest) {
    console.log('Midtrans callback received:', body);
    await this.paymentService.handleCallback(body);
    return { message: 'OK' };
  }

  @Post('/wallets/withdraw')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async withdrawFund() {
    // implementation
  }

  @Get('/wallets')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getWallet(@Auth() user: User): Promise<WebResponse<WalletResponse>> {
    const result = await this.paymentService.getWallet(user.id);
    return {
      data: result,
    };
  }

  @Get('/wallets/transactions/:walletId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getWalletTransaction(
    @Auth() user: User,
    @Param('walletId', ParseIntPipe) walletId: number,
  ): Promise<WebResponse<TransactionListResponse>> {
    const result = await this.paymentService.getWalletTransaction(
      walletId,
      user.id,
    );
    return {
      data: result,
    };
  }
}
