import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { WebResponse } from '../../model/web.model';
import {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
} from '../../model/report.model';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Admin - Reports')
@ApiBearerAuth()
@Controller('/api/admin/report')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('/dashboard-summary')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
  @ApiOperation({
    summary: 'Get dashboard summary',
    description:
      'Get financial summary for admin dashboard. Includes total inflow (FUNDING), total outflow (WITHDRAWAL + ESCROW_RELEASE), platform fees, platform balance, escrow held, and pending withdrawals. Default date range: first day of current month to today.',
  })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Start date (ISO format). Default: first day of current month',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'End date (ISO format). Default: today',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Dashboard summary fetched successfully',
        },
        data: { $ref: '#/components/schemas/ReportDashboardSummaryResponse' },
      },
    },
  })
  async getDashboardSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<WebResponse<ReportDashboardSummaryResponse>> {
    const query: ReportDateRangeRequest = {
      from: from ? new Date(from) : new Date(new Date().setDate(1)),
      to: to ? new Date(to) : new Date(),
    };
    const result = await this.reportService.dashboardSummary(query);
    return {
      data: result,
      message: 'Dashboard summary fetched successfully',
    };
  }
}
