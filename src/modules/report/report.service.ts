import { Inject, Injectable } from '@nestjs/common';
import { ValidationService } from '../../common/validation.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '../../common/prisma.service';
import {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
} from '../../model/report.model';
import { dec } from '../../common/decimal.util';
import { ReportValidation } from './report.validation';

@Injectable()
export class ReportService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async dashboardSummary(
    query: ReportDateRangeRequest,
  ): Promise<ReportDashboardSummaryResponse> {
    const validatedQuery = this.validationService.validate(
      ReportValidation.DATE_RANGE,
      query,
    );
    const [
      inflowAgg,
      outflowAgg,
      platformFeeAgg,
      platformWallet,
      escrowAgg,
      withdrawAgg,
    ] = await this.prismaService.$transaction([
      // 1. Total Inflow (FUNDING)
      this.prismaService.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          transaction_type: 'FUNDING',
          status: 'COMPLETED',
          created_at: {
            gte: validatedQuery.from,
            lte: validatedQuery.to,
          },
        },
      }),

      // 2. Total Outflow (WITHDRAWAL + ESCROW_RELEASE)
      this.prismaService.transaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          transaction_type: {
            in: ['WITHDRAWAL', 'ESCROW_RELEASE'],
          },
          status: 'COMPLETED',
          created_at: {
            gte: validatedQuery.from,
            lte: validatedQuery.to,
          },
        },
      }),

      // 3. Platform Fees (semua fee platform)
      this.prismaService.platformTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          created_at: {
            gte: validatedQuery.from,
            lte: validatedQuery.to,
          },
        },
      }),

      // 4. Platform Wallet (saldo terkini)
      this.prismaService.platformWallet.findFirst({
        orderBy: {
          id: 'desc',
        },
      }),

      // 5. Escrow Held
      this.prismaService.escrow.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'HELD',
        },
      }),

      // 6. Withdraw Pending + Processing
      this.prismaService.withdrawRequest.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
          created_at: {
            gte: validatedQuery.from,
            lte: validatedQuery.to,
          },
        },
      }),
    ]);

    return {
      period: {
        from: validatedQuery.from,
        to: validatedQuery.to,
      },
      summary: {
        total_inflow: inflowAgg._sum.amount ?? dec(0),
        total_outflow: outflowAgg._sum.amount ?? dec(0),
        platform_fees: platformFeeAgg._sum.amount ?? dec(0),
        platform_balance: platformWallet?.balance ?? dec(0),
        escrow_held: escrowAgg._sum.amount ?? dec(0),
        withdraw_pending: withdrawAgg._sum.amount ?? dec(0),
      },
    };
  }
}
