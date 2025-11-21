import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import {
  AddBalanceWalletInitRequest,
  TopupCallbackRequest,
  TopupWalletRequest,
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
    await this.paymentService.handleCallback(body);
    return { message: 'OK' };
  }
}
