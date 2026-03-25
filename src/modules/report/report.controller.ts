import {
  Controller,
  Get,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ReportService } from './report.service';
import {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
} from '../../model/report.model';
import type { TimeseriesGranularity } from '../../model/report.model';
import { WebResponse } from '../../model/web.model';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiExtraModels,
} from '@nestjs/swagger';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@ApiExtraModels(ReportDashboardSummaryResponse)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('/api/admin/report')
export class ReportController {
  constructor(private reportService: ReportService) { }

  /**
   * GET /api/admin/report/dashboard-summary?granularity=daily
   * granularity: daily | weekly | monthly | yearly
   */
  @Get('dashboard-summary')
  @HttpCode(HttpStatus.OK)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Get dashboard summary with aggregates and timeseries data. Granularity: daily, weekly, monthly, yearly.',
  })
  @ApiQuery({
    name: 'granularity',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    description: 'Timeseries granularity (default: daily)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ReportDashboardSummaryResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Export CSV report',
    description:
      'Export posting credit purchase data as CSV for a given date range',
  })
  @ApiQuery({
    name: 'from',
    required: true,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'to',
    required: true,
    type: String,
    description: 'End date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'CSV file downloaded',
  })
  @ApiResponse({ status: 400, description: 'Invalid date range' })
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
