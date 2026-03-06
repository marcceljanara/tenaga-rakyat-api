// export class ReportDashboardSummaryResponse {
//   @ApiProperty()
//   period: {
//     from: Date;
//     to: Date;
//   };

//   @ApiProperty()
//   summary: {
//     total_inflow: Decimal;
//     total_outflow: Decimal;
//     platform_fees: Decimal;
//     platform_balance: Decimal;
//     escrow_held: Decimal;
//     withdraw_pending: Decimal;
//   };
// }
export class ReportDateRangeRequest {
  from: Date;
  to: Date;
}

export class ReportTimeseriesItem {
  period: string;
  total_transactions: number;
  total_revenue: number;
  total_credits: number;
}

export class ReportDashboardSummaryResponse {
  total_transactions: number;
  total_revenue: number;
  total_credits_sold: number;
  paid_transactions: number;
  pending_transactions: number;
  failed_transactions: number;
  timeseries: ReportTimeseriesItem[];
}

export type TimeseriesGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
