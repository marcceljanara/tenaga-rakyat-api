import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
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
  // TopupWalletRequest,
  TransactionListResponse,
  WalletResponse,
  WithdrawMethodReadyToPay,
  WithdrawMethodResponse,
  WithdrawPreviewRequest,
  WithdrawPreviewResponse,
  WithdrawRequestQueryParams,
  WithdrawRequestResponse,
} from '../../model/payment.model';
import { WebResponse } from '../../model/web.model';
import { PaymentValidation } from './payment.validation';
import { ZodValidationPipe } from '../../common/zod-validation/zod-validation.pipe';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination.dto';

@ApiTags('Payment & Wallet')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Controller('/api')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('/admin/wallets/balance-initial')
  @HttpCode(200)
  @Roles([ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Admin - Wallet Management')
  @ApiOperation({
    summary: 'Add initial balance',
    description:
      'Add initial balance to user wallet (Super Admin only). Creates FUNDING transaction.',
  })
  @ApiBody({ type: AddBalanceWalletInitRequest })
  @ApiResponse({
    status: 200,
    description: 'Balance added successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Saldo wallet berhasil ditambahan',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Top up wallet',
    description: 'Create top-up transaction via Midtrans (minimum: 10,000)',
  })
  @ApiBody({ type: TopupWalletRequest })
  @ApiResponse({
    status: 200,
    description:
      'Payment link created. Returns Midtrans snap token and redirect URL.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Silahkan selesaikan pembayaran' },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'snap-token-here' },
            redirect_url: {
              type: 'string',
              example: 'https://app.midtrans.com/snap/v2/...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
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

  @Get('/wallets')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get wallet',
    description: 'Get wallet information for logged-in user',
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet data retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/WalletResponse' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWallet(@Auth() user: User): Promise<WebResponse<WalletResponse>> {
    const result = await this.paymentService.getWallet(user.id);
    return {
      data: result,
    };
  }

  @Get('/wallets/transactions/:walletId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get wallet transactions',
    description: 'Get transaction history for specific wallet (must be owner)',
  })
  @ApiParam({ name: 'walletId', type: Number, description: 'Wallet ID' })
  @ApiResponse({
    status: 200,
    description: 'Transaction list retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/TransactionListResponse' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Wallet not found or not owned by user',
  })
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
  @ApiBearerAuth()
  @ApiTags('Withdraw Methods')
  @ApiOperation({
    summary: 'Add withdraw method',
    description: 'Add bank account or e-wallet for withdrawal (max 5 methods)',
  })
  @ApiBody({ type: AddWithdrawMethodRequest })
  @ApiResponse({
    status: 200,
    description:
      'Withdraw method added. Account number is encrypted in storage.',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/WithdrawMethodResponse' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Maximum 5 withdraw methods reached',
  })
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
  @ApiBearerAuth()
  @ApiTags('Withdraw Methods')
  @ApiOperation({
    summary: 'Get withdraw methods',
    description: 'Get all active withdraw methods for user',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdraw methods retrieved. Account numbers are decrypted.',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ListWithdrawMethodResponse' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiTags('Withdraw Methods')
  @ApiOperation({
    summary: 'Delete withdraw method',
    description: 'Delete saved withdraw method (must be owner and active)',
  })
  @ApiParam({ name: 'methodId', type: Number, description: 'Method ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdraw method deleted',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Metode penarikan berhasil dihapus',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Withdraw method not found or not active',
  })
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
  @ApiBearerAuth()
  @ApiTags('Withdraw Requests - User')
  @ApiOperation({
    summary: 'Create withdraw request',
    description:
      'Submit new withdrawal request (minimum: 10,000). Deducts balance immediately, adds fee to platform wallet, creates PENDING transaction.',
  })
  @ApiBody({ type: CreateWithdrawRequestRequest })
  @ApiResponse({
    status: 201,
    description: 'Withdraw request created',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Withdraw request created successfully',
        },
        data: { $ref: '#/components/schemas/WithdrawRequestResponse' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  @ApiResponse({
    status: 404,
    description: 'Withdraw method not found or wallet not found',
  })
  @ApiResponse({ status: 500, description: 'Withdraw fee not found' })
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

  @Get('wallets/withdraw/preview')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Withdraw Requests - User')
  @ApiOperation({
    summary: 'Preview withdraw',
    description:
      'Calculate fees and net amount before withdrawal. Validates wallet status and balance.',
  })
  @ApiQuery({
    name: 'amount',
    type: Number,
    required: true,
    description: 'Amount to withdraw',
  })
  @ApiQuery({
    name: 'method_id',
    type: Number,
    required: true,
    description: 'Withdraw method ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdraw preview with fee calculation',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/WithdrawPreviewResponse' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Insufficient balance, amount too small for fee, or method not found',
  })
  @ApiResponse({ status: 404, description: 'Wallet not found or not active' })
  @ApiResponse({ status: 500, description: 'Fee not found' })
  async withdrawPreview(
    @Auth() user: User,
    @Query(new ZodValidationPipe(PaymentValidation.WITHDRAW_PREVIEW))
    query: WithdrawPreviewRequest,
  ): Promise<WebResponse<WithdrawPreviewResponse>> {
    const result = await this.paymentService.withdrawPreview(query, user.id);
    return { data: result };
  }

  @Get('/wallets/withdraw-requests')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Withdraw Requests - User')
  @ApiOperation({
    summary: 'Get user withdraw requests',
    description:
      'Get all withdraw requests for logged-in user, sorted by creation date (newest first)',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdraw requests retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ListWithdrawRequestResponse' },
      },
    },
  })
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
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Withdraw Requests - User')
  @ApiOperation({
    summary: 'Get withdraw request detail',
    description: 'Get detailed withdraw request information (must be owner)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdraw request details',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/WithdrawRequestResponse' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
  async getWithdrawRequestDetail(
    @Auth() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WebResponse<WithdrawRequestResponse>> {
    const result = await this.paymentService.getWithdrawRequestDetail(
      id,
      user.id,
      user.role_id,
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Get all withdraw requests',
    description:
      'Get all withdraw requests with filtering (Admin only), sorted by creation date (newest first)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'SENT'],
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    type: String,
    description: 'Filter by user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Withdraw requests retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ListWithdrawRequestResponse' },
      },
    },
  })
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Lock withdraw request',
    description:
      'Lock withdraw request for processing (changes status from PENDING to PROCESSING). Prevents other admins from processing.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiBody({ type: LockWithdrawRequest })
  @ApiResponse({
    status: 200,
    description: 'Withdraw request locked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Withdraw request locked' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Only PENDING requests can be locked',
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
  @ApiResponse({
    status: 409,
    description: 'Request is being processed by another admin',
  })
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Unlock withdraw request',
    description:
      'Unlock withdraw request (changes status from PROCESSING to PENDING). Must be locked by current admin.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiResponse({
    status: 200,
    description: 'Withdraw request unlocked',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Withdraw request unlocked' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Only PROCESSING requests can be unlocked',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only unlock requests locked by you',
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Approve withdraw request',
    description:
      'Approve withdraw request for payment (changes status to APPROVED). Returns decrypted account details for payment.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiBody({ type: ApproveWithdrawRequest })
  @ApiResponse({
    status: 200,
    description: 'Withdraw approved. Returns account details for payment.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Withdraw approved' },
        data: { $ref: '#/components/schemas/WithdrawMethodReadyToPay' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Only PROCESSING requests can be approved',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only approve requests locked by you',
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Reject withdraw request',
    description:
      'Reject withdraw request with reason (changes status to REJECTED). Refunds balance to user wallet, refunds fee from platform wallet, creates FUNDING transaction.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiBody({ type: RejectWithdrawRequest })
  @ApiResponse({
    status: 200,
    description: 'Withdraw rejected and balance refunded',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Withdraw rejected' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Only PROCESSING requests can be rejected',
  })
  @ApiResponse({
    status: 403,
    description: 'Can only reject requests locked by you',
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
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
  @ApiBearerAuth()
  @ApiTags('Admin - Withdraw Management')
  @ApiOperation({
    summary: 'Mark withdraw as sent',
    description:
      'Mark withdraw as sent with transfer receipt (changes status to SENT). Updates transaction status to COMPLETED. Only APPROVED requests can be sent.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Withdraw request ID' })
  @ApiBody({ type: SendWithdrawRequest })
  @ApiResponse({
    status: 200,
    description: 'Withdraw sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Withdraw sent successfully' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Only APPROVED requests can be sent',
  })
  @ApiResponse({ status: 404, description: 'Withdraw request not found' })
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

  @Post('/admin/posting-credit')
  @HttpCode(201)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Admin - Posting Credits')
  @ApiOperation({
    summary: 'Create posting credit package',
    description: 'Create a new posting credit package (Admin only)',
  })
  @ApiBody({ type: AddPostinCreditPackageRequest })
  @ApiResponse({
    status: 201,
    description: 'Package created successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Paket Kredit Posting berhasil ditambahkan',
        },
        data: {
          $ref: '#/components/schemas/PostingPackageResponse',
          example: {
            id: 1,
            name: 'Basic Package',
            credit_amount: 10,
            price: '50000.00',
            is_active: true,
            created_at: '2026-03-09T10:00:00Z',
            updated_at: '2026-03-09T10:00:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async createPostingCreditPackage(
    @Auth() admin: User,
    @Body() request: AddPostinCreditPackageRequest,
  ): Promise<WebResponse<PostingPackageResponse>> {
    const result = await this.paymentService.addPostingCreditPackage(request);
    return {
      data: result,
      message: 'Paket Kredit Posting berhasil ditambahkan',
    };
  }

  @Get('/admin/posting-credit')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Admin - Posting Credits')
  @ApiOperation({
    summary: 'Get all posting credit packages (Admin)',
    description:
      'Get all posting credit packages including inactive ones (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Packages retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          $ref: '#/components/schemas/ListPostingPackageResponse',
          example: {
            packages: [
              {
                id: 1,
                name: 'Basic Package',
                credit_amount: 10,
                price: '50000.00',
                is_active: true,
                created_at: '2026-03-09T10:00:00Z',
                updated_at: '2026-03-09T10:00:00Z',
              },
            ],
          },
        },
      },
    },
  })
  async getPostingCreditPackages(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Auth() admin: User,
  ): Promise<WebResponse<ListPostingPackageResponse>> {
    const result = await this.paymentService.getPostingCreditPackages();
    return {
      data: result,
    };
  }

  @Put('/admin/posting-credit/:id')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Admin - Posting Credits')
  @ApiOperation({
    summary: 'Edit posting credit package',
    description: 'Update posting credit package by ID (Admin only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiBody({ type: EditPostingCreditPackageRequest })
  @ApiResponse({
    status: 200,
    description: 'Package updated',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Data id 1 berhasil diubah' },
        data: {
          $ref: '#/components/schemas/PostingPackageResponse',
          example: {
            id: 1,
            name: 'Basic Package Update',
            credit_amount: 15,
            price: '60000.00',
            is_active: true,
            created_at: '2026-03-09T10:00:00Z',
            updated_at: '2026-03-09T10:00:00Z',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async editPostingCreditPackageById(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() request: EditPostingCreditPackageRequest,
  ): Promise<WebResponse<PostingPackageResponse>> {
    const result = await this.paymentService.editPostingCreditPackageById(
      id,
      request,
    );
    return {
      data: result,
      message: `Data id ${id} berhasil diubah`,
    };
  }

  @Delete('/admin/posting-credit/:id')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiBearerAuth()
  @ApiTags('Admin - Posting Credits')
  @ApiOperation({
    summary: 'Delete posting credit package',
    description: 'Delete posting credit package by ID (Admin only)',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Package ID' })
  @ApiResponse({
    status: 200,
    description: 'Package deleted',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Package deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async deletePostingCreditPackageById(
    @Auth() admin: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<WebResponse<string>> {
    const result = await this.paymentService.deletePostingCreditPackage(id);
    return {
      message: result,
    };
  }

  @Get('/credits')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Posting Credits')
  @ApiOperation({
    summary: 'Get credit balance',
    description:
      'Get current posting credit balance (free quota + paid credits) for logged-in job provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Credit balance retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          $ref: '#/components/schemas/CreditBalanceResponse',
          example: {
            free_quota: 5,
            paid_credit: 10,
          },
        },
      },
    },
  })
  async getCreditByUserId(
    @Auth() user: User,
  ): Promise<WebResponse<CreditBalanceResponse>> {
    const result = await this.paymentService.getCredit(user.id);
    return {
      data: result,
    };
  }

  @Get('/credits/posting-credit')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Posting Credits')
  @ApiOperation({
    summary: 'Get available posting credit packages',
    description:
      'Get all active posting credit packages available for purchase (Job Provider only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Available packages retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          $ref: '#/components/schemas/ListPostingPackageResponse',
          example: {
            packages: [
              {
                id: 1,
                name: 'Basic Package',
                credit_amount: 10,
                price: '50000.00',
                is_active: true,
                created_at: '2026-03-09T10:00:00Z',
                updated_at: '2026-03-09T10:00:00Z',
              },
            ],
          },
        },
      },
    },
  })
  async getPostingCreditPackagesGeneral(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    @Auth() admin: User,
  ): Promise<WebResponse<ListPostingPackageResponse>> {
    const result = await this.paymentService.getPostingCreditPackagesGeneral();
    return {
      data: result,
    };
  }

  @Post('/credits/topup')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Posting Credits')
  @ApiOperation({
    summary: 'Purchase posting credits',
    description:
      'Create a credit purchase transaction via Midtrans. Returns payment link.',
  })
  @ApiBody({ type: TopupCreditRequest })
  @ApiResponse({
    status: 200,
    description: 'Payment link created',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Silahkan selesaikan pembayaran kredit posting',
        },
        data: {
          type: 'object',
          properties: {
            token: { type: 'string', example: 'snap-token-here' },
            redirect_url: {
              type: 'string',
              example: 'https://app.midtrans.com/snap/v2/...',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async topupCredit(
    @Auth() user: User,
    @Body() request: TopupCreditRequest,
  ): Promise<WebResponse<any>> {
    const result = await this.paymentService.createTopupCreditTransaction(
      request,
      user,
    );

    return {
      message: 'Silahkan selesaikan pembayaran kredit posting',
      data: result,
    };
  }

  @Post('/webhook/midtrans')
  @HttpCode(200)
  @Throttle({ default: { limit: 100, ttl: 60000 } }) // Override: Midtrans server bisa retry berkali-kali
  @ApiTags('Posting Credits')
  @ApiOperation({
    summary: 'Midtrans credit webhook',
    description:
      'Handle Midtrans credit payment callback (Midtrans server-to-server only). ' +
      'Verifies signature_key before processing. Idempotent — safe to receive duplicate calls.',
  })
  @ApiBody({ type: TopupCallbackRequest })
  @ApiResponse({
    status: 200,
    description: 'Callback processed',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'OK' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid signature — request rejected' })
  async midtransCreditCallback(@Body() body: TopupCallbackRequest) {
    await this.paymentService.handleCallbackCredit(body);
    return { message: 'OK' };
  }

  @Get('/credits/history')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiBearerAuth()
  @ApiTags('Posting Credits')
  @ApiOperation({
    summary: 'Get credit purchase history',
    description:
      'Get posting credit purchase history for logged-in job provider with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Purchase history retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            $ref: '#/components/schemas/PostingCreditPurchaseResponse',
          },
          example: [
            {
              paid_at: '2026-03-09T10:00:00Z',
              payment_reference: 'order-id-123',
              status: 'COMPLETED',
              credit_amount: 10,
              total_price: '50000.00',
            },
          ],
        },
        paging: {
          type: 'object',
          example: {
            size: 10,
            total_page: 5,
            current_page: 1,
            total_data: 50,
          },
        },
      },
    },
  })
  async getPurchases(
    @Auth() user: User,
    @Query() query: PaginationQueryDto,
  ): Promise<WebResponse<PostingCreditPurchaseResponse[]>> {
    return this.paymentService.getPostingCreditPurchaseByUserId(
      user.id,
      query.page,
      query.size,
    );
  }
}
