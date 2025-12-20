import { Decimal } from '@prisma/client/runtime/client';

export class ReportDashboardSummaryResponse {
  period: {
    from: Date;
    to: Date;
  };
  summary: {
    total_inflow: Decimal;
    total_outflow: Decimal;
    platform_fees: Decimal;
    platform_balance: Decimal;
    escrow_held: Decimal;
    withdraw_pending: Decimal;
  };
}

export class ReportDateRangeRequest {
  from: Date;
  to: Date;
}
