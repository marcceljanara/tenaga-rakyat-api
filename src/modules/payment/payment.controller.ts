import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import {
  AddBalanceWalletInitRequest,
  AddWithdrawMethodRequest,
  ApproveWithdrawRequest,
  CreateWithdrawRequestRequest,
  ListWithdrawMethodResponse,
  ListWithdrawRequestResponse,
  LockWithdrawRequest,
  RejectWithdrawRequest,
  SendWithdrawRequest,
  TopupCallbackRequest,
  TopupWalletRequest,
  TransactionListResponse,
  WalletResponse,
  WithdrawMethodReadyToPay,
  WithdrawMethodResponse,
  WithdrawRequestQueryParams,
  WithdrawRequestResponse,
} from '../../model/payment.model';
import { WebResponse } from '../../model/web.model';

@Controller('/api')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('/admin/wallets/balance-initial')
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
      data: result,
    };
  }

  @Post('/webhook/midtrans')
  @HttpCode(200)
  async midtransCallback(@Body() body: TopupCallbackRequest) {
    console.log('Midtrans callback received:', body);
    await this.paymentService.handleCallback(body);
    return { message: 'OK' };
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

  // ============================================================
  // WITHDRAW METHODS ENDPOINTS
  // ============================================================

  @Post('/wallets/withdraw-methods')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.ADMIN])
  async addWithdrawMethod(
    @Auth() user: User,
    @Body() request: AddWithdrawMethodRequest,
  ): Promise<WebResponse<WithdrawMethodResponse>> {
    const result = await this.paymentService.addWithdrawMethod(
      user.id,
      request,
    );
    return {
      data: result,
    };
  }

  @Get('/wallets/withdraw-methods')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async getWithdrawMethod(
    @Auth() user: User,
  ): Promise<WebResponse<ListWithdrawMethodResponse>> {
    const result = await this.paymentService.getWithdrawMethod(user.id);
    return {
      data: result,
    };
  }

  @Delete('/wallets/withdraw-methods/:methodId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async deleteWithdrawMethod(
    @Auth() user: User,
    @Param('methodId', ParseIntPipe) methodId: number,
  ): Promise<WebResponse<string>> {
    const result = await this.paymentService.deleteWithdrawMethod(
      methodId,
      user.id,
    );
    return {
      message: result,
    };
  }

  // ============================================================
  // WITHDRAW REQUESTS ENDPOINTS - USER
  // ============================================================

  @Post('/wallets/withdraw-requests')
  @HttpCode(201)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async createWithdrawRequest(
    @Auth() user: User,
    @Body() request: CreateWithdrawRequestRequest,
  ): Promise<WebResponse<WithdrawRequestResponse>> {
    const result = await this.paymentService.createWithdrawRequest(
      user.id,
      request,
    );
    return {
      message: 'Withdraw request created successfully',
      data: result,
    };
  }

  @Get('/wallets/withdraw-requests')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async getUserWithdrawRequests(
    @Auth() user: User,
  ): Promise<WebResponse<ListWithdrawRequestResponse>> {
    const result = await this.paymentService.getUserWithdrawRequests(user.id);
    return {
      data: result,
    };
  }

  @Get('/wallets/withdraw-requests/:id')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async getWithdrawRequestDetail(
    @Auth() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WebResponse<WithdrawRequestResponse>> {
    const result = await this.paymentService.getWithdrawRequestDetail(
      id,
      user.id,
    );
    return {
      data: result,
    };
  }

  // ============================================================
  // WITHDRAW REQUESTS ENDPOINTS - ADMIN
  // ============================================================

  @Get('/admin/withdraw-requests')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getAllWithdrawRequests(
    @Auth() admin: User,
    @Query() query: WithdrawRequestQueryParams,
  ): Promise<WebResponse<ListWithdrawRequestResponse>> {
    const result = await this.paymentService.getAllWithdrawRequests(query);
    return {
      data: result,
    };
  }

  @Post('/admin/withdraw-requests/:id/lock')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async lockWithdrawRequest(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: LockWithdrawRequest,
  ): Promise<WebResponse<string>> {
    await this.paymentService.lockWithdrawRequest(id, admin.id, request);
    return {
      message: 'Withdraw request locked',
    };
  }

  @Post('/admin/withdraw-requests/:id/unlock')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async unlockWithdrawRequest(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WebResponse<string>> {
    await this.paymentService.unlockWithdrawRequest(id, admin.id);
    return {
      message: 'Withdraw request unlocked',
    };
  }

  @Post('/admin/withdraw-requests/:id/approve')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async approveWithdrawRequest(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: ApproveWithdrawRequest,
  ): Promise<WebResponse<WithdrawMethodReadyToPay>> {
    const result = await this.paymentService.approveWithdrawRequest(
      id,
      admin.id,
      request,
    );
    return {
      message: 'Withdraw approved',
      data: result,
    };
  }

  @Post('/admin/withdraw-requests/:id/reject')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async rejectWithdrawRequest(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: RejectWithdrawRequest,
  ): Promise<WebResponse<string>> {
    await this.paymentService.rejectWithdrawRequest(id, admin.id, request);
    return {
      message: 'Withdraw rejected',
    };
  }

  @Post('/admin/withdraw-requests/:id/send')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async sendWithdrawRequest(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: SendWithdrawRequest,
  ): Promise<WebResponse<string>> {
    await this.paymentService.sendWithdrawRequest(id, request);
    return {
      message: 'Withdraw sent successfully',
    };
  }
}
