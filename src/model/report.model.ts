import { ApiProperty } from '@nestjs/swagger';

export class ReportDateRangeRequest {
  @ApiProperty({ example: '2024-01-01', description: 'Start date (YYYY-MM-DD)' })
  from: Date;

  @ApiProperty({ example: '2024-12-31', description: 'End date (YYYY-MM-DD)' })
  to: Date;
}

export class ReportTimeseriesItem {
  @ApiProperty({ example: '2024-01-01', description: 'Period (date, week, month, or year string)' })
  period: string;

  @ApiProperty({ example: 10, description: 'Total number of transactions in the period' })
  total_transactions: number;

  @ApiProperty({ example: 500000, description: 'Total revenue in the period (gross total)' })
  total_revenue: number;

  @ApiProperty({ example: 50, description: 'Total credits sold in the period' })
  total_credits: number;
}

export class ReportDashboardSummaryResponse {
  @ApiProperty({ example: 150, description: 'Total successful and pending transactions' })
  total_transactions: number;

  @ApiProperty({ example: 7500000, description: 'Total revenue from paid transactions' })
  total_revenue: number;

  @ApiProperty({ example: 750, description: 'Total sum of credits sold' })
  total_credits_sold: number;

  @ApiProperty({ example: 140, description: 'Number of paid transactions' })
  paid_transactions: number;

  @ApiProperty({ example: 10, description: 'Number of pending transactions' })
  pending_transactions: number;

  @ApiProperty({ example: 5, description: 'Number of failed transactions' })
  failed_transactions: number;

  @ApiProperty({ type: [ReportTimeseriesItem], description: 'Timeseries data' })
  timeseries: ReportTimeseriesItem[];
}

export type TimeseriesGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';
