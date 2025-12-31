import { ApiProperty } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/client';

export class ReportDashboardSummaryResponse {
  @ApiProperty()
  period: {
    from: Date;
    to: Date;
  };

  @ApiProperty()
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
  @ApiProperty()
  from: Date;

  @ApiProperty()
  to: Date;
}