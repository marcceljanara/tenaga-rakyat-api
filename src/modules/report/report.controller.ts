import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from './report.service';
import type {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
  TimeseriesGranularity,
} from '../../model/report.model';
import { WebResponse } from '../../model/web.model';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';

@Controller('/api/admin/report')
export class ReportController {
  constructor(private reportService: ReportService) {}

  /**
   * GET /api/admin/report/dashboard-summary?granularity=daily
   * granularity: daily | weekly | monthly | yearly
   */
  @Get('dashboard-summary')
  @HttpCode(HttpStatus.OK)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getDashboardSummary(
    @Auth() admin: User,
    @Query('granularity') granularity: TimeseriesGranularity = 'daily',
  ): Promise<WebResponse<ReportDashboardSummaryResponse>> {
    const data = await this.reportService.getDashboardSummary(granularity);
    return { data };
  }

  /**
   * GET /api/admin/report/export-csv?from=2024-01-01&to=2024-12-31
   */
  @Get('export-csv')
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async exportCsv(
    @Auth() admin: User,
    @Query() query: ReportDateRangeRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const csv = await this.reportService.exportCsv(query);

    const filename = `credit-report-${Date.now()}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(HttpStatus.OK).send(csv);
  }
}
