import { Inject, Injectable } from '@nestjs/common';
import { ValidationService } from '../../common/validation.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PrismaService } from '../../common/prisma.service';
import {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
  ReportTimeseriesItem,
  TimeseriesGranularity,
} from '../../model/report.model';
import { ReportValidation } from './report.validation';

@Injectable()
export class ReportService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async getDashboardSummary(
    granularity: TimeseriesGranularity,
  ): Promise<ReportDashboardSummaryResponse> {
    this.validationService.validate(ReportValidation.DASHBOARD_SUMMARY, {
      granularity,
    });

    this.logger.info(
      `Fetching dashboard summary with granularity: ${granularity}`,
    );

    const [aggregates, timeseries] = await Promise.all([
      this.getAggregates(),
      this.getTimeseries(granularity),
    ]);

    return { ...aggregates, timeseries };
  }

  async exportCsv(request: ReportDateRangeRequest): Promise<string> {
    const validated = this.validationService.validate(
      ReportValidation.DATE_RANGE,
      request,
    );

    this.logger.info(
      `Exporting CSV from ${validated.from.toISOString()} to ${validated.to.toISOString()}`,
    );

    const purchases = await this.prismaService.postingCreditPurchase.findMany({
      where: {
        status: 'PAID',
        paid_at: { gte: validated.from, lte: validated.to },
      },
      include: { package: true, user: true },
      orderBy: { paid_at: 'asc' },
    });

    return this.buildCsv(purchases);
  }

  private async getAggregates(): Promise<
    Omit<ReportDashboardSummaryResponse, 'timeseries'>
  > {
    const [paid, pending, failed] = await Promise.all([
      this.prismaService.postingCreditPurchase.aggregate({
        where: { status: 'PAID' },
        _count: true,
        _sum: { total_price: true, credit_amount: true },
      }),
      this.prismaService.postingCreditPurchase.count({
        where: { status: 'PENDING' },
      }),
      this.prismaService.postingCreditPurchase.count({
        where: { status: { in: ['EXPIRED', 'FAILED'] } },
      }),
    ]);

    return {
      total_transactions: paid._count + pending + failed,
      total_revenue: Number(paid._sum.total_price ?? 0),
      total_credits_sold: paid._sum.credit_amount ?? 0,
      paid_transactions: paid._count,
      pending_transactions: pending,
      failed_transactions: failed,
    };
  }

  private async getTimeseries(
    granularity: TimeseriesGranularity,
  ): Promise<ReportTimeseriesItem[]> {
    // PostgreSQL uses TO_CHAR; format strings differ per granularity
    const formatMap: Record<TimeseriesGranularity, string> = {
      daily: 'YYYY-MM-DD',
      weekly: 'IYYY-IW', // ISO year + ISO week number
      monthly: 'YYYY-MM',
      yearly: 'YYYY',
    };

    const format = formatMap[granularity];

    const rows: Array<{
      period: string;
      total_transactions: bigint;
      total_revenue: string;
      total_credits: bigint;
    }> = await this.prismaService.$queryRaw`
      SELECT
        TO_CHAR(paid_at, ${format})                 AS period,
        COUNT(*)::bigint                            AS total_transactions,
        COALESCE(SUM(total_price), 0)::text         AS total_revenue,
        COALESCE(SUM(credit_amount), 0)::bigint     AS total_credits
      FROM posting_credit_purchase
      WHERE status = 'PAID'
        AND paid_at IS NOT NULL
      GROUP BY period
      ORDER BY period ASC
    `;

    return rows.map((row) => ({
      period: row.period,
      total_transactions: Number(row.total_transactions),
      total_revenue: Number(row.total_revenue),
      total_credits: Number(row.total_credits),
    }));
  }

  private buildCsv(purchases: any[]): string {
    const header = [
      'ID',
      'User ID',
      'Package Name',
      'Credit Amount',
      'Total Price',
      'Payment Reference',
      'Status',
      'Paid At',
      'Created At',
    ].join(',');

    const rows = purchases.map((p) =>
      [
        p.id,
        p.user_id,
        `"${p.package?.name ?? ''}"`,
        p.credit_amount,
        p.total_price,
        p.payment_reference,
        p.status,
        p.paid_at?.toISOString() ?? '',
        p.created_at.toISOString(),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
