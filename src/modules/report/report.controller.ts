import { Controller, Get, HttpCode, Query } from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';
import { WebResponse } from '../../model/web.model';
import {
  ReportDashboardSummaryResponse,
  ReportDateRangeRequest,
} from '../../model/report.model';

@Controller('/api/admin/report')
export class ReportController {
  constructor(private reportService: ReportService) {}

  @Get('/dashboard-summary')
  @HttpCode(200)
  @Roles([ROLES.ADMIN, ROLES.SUPER_ADMIN])
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
