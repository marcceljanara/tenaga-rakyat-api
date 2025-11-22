import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import {
  ApplyJobRequest,
  UpdateApplicationStatusRequest,
  ApplicationResponse,
  ApplicationListResponse,
  ApplicationStatisticsResponse,
} from '../../model/application.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { ROLES } from '../../common/role/role';

@Controller('/api')
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  /**
   * POST /api/jobs/{job_id}/applications
   * Melamar ke sebuah lowongan pekerjaan
   * Role: Worker (1)
   */
  @Post('/jobs/:jobId/applications')
  @HttpCode(201)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async applyJob(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() request: ApplyJobRequest,
  ): Promise<WebResponse<ApplicationResponse>> {
    const result = await this.applicationService.applyJob(
      jobId,
      user.id,
      request,
    );
    return {
      message: 'Lamaran berhasil dikirim',
      data: result,
    };
  }

  /**
   * GET /api/jobs/{job_id}/applications
   * Melihat daftar pelamar untuk lowongan tertentu
   * Role: Pemberi Kerja (2)
   */
  @Get('/jobs/:jobId/applications')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async getJobApplications(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ): Promise<WebResponse<ApplicationListResponse>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.applicationService.getJobApplications(
      jobId,
      user.id,
      pageNum,
      limitNum,
      status,
      sortBy || 'created_at',
      sortOrder || 'desc',
    );

    return {
      data: result,
    };
  }

  /**
   * GET /api/jobs/{job_id}/applications/statistics
   * Melihat statistik lamaran untuk lowongan tertentu
   * Role: Pemberi Kerja (2)
   */
  @Get('/jobs/:jobId/applications/statistics')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async getJobApplicationStatistics(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<WebResponse<ApplicationStatisticsResponse>> {
    const result = await this.applicationService.getJobApplicationStatistics(
      jobId,
      user.id,
    );

    return {
      data: result,
    };
  }

  /**
   * GET /api/users/applications
   * Melihat riwayat lamaran user (untuk worker)
   * Role: Worker (1)
   */
  @Get('/users/applications')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA])
  async getUserApplications(
    @Auth() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ): Promise<WebResponse<ApplicationListResponse>> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    const result = await this.applicationService.getUserApplications(
      user.id,
      pageNum,
      limitNum,
      status,
      sortBy || 'created_at',
      sortOrder || 'desc',
    );

    return {
      data: result,
    };
  }

  /**
   * GET /api/users/applications/search
   * Mencari lamaran user berdasarkan keyword
   * Role: Worker (1)
   */
  @Get('/users/applications/search')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA])
  async searchUserApplications(
    @Auth() user: User,
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ): Promise<WebResponse<ApplicationListResponse>> {
    const result = await this.applicationService.searchUserApplications(
      user.id,
      {
        keyword,
        status,
        page: page ? parseInt(page, 10) : 1,
        limit: limit ? parseInt(limit, 10) : 10,
        sort_by: (sortBy as any) || 'created_at',
        sort_order: (sortOrder as any) || 'desc',
      },
    );

    return {
      data: result,
    };
  }

  /**
   * PATCH /api/applications/{application_id}
   * Mengubah status lamaran (accept/reject)
   * Role: Pemberi Kerja (2)
   */
  @Patch('/applications/:applicationId')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async updateApplicationStatus(
    @Auth() user: User,
    @Param('applicationId', ParseIntPipe) applicationId: number,
    @Body() request: UpdateApplicationStatusRequest,
  ): Promise<WebResponse<ApplicationResponse>> {
    const result = await this.applicationService.updateApplicationStatus(
      applicationId,
      user.id,
      request,
    );

    const messages = {
      ACCEPTED: 'Pelamar berhasil diterima',
      REJECTED: 'Pelamar berhasil ditolak',
      UNDER_REVIEW: 'Lamaran sedang ditinjau',
    };

    const message = messages[request.status] || 'Status tidak dikenal';

    return {
      message,
      data: result,
    };
  }

  /**
   * DELETE /api/applications/{application_id}
   * Membatalkan lamaran yang sudah dikirim
   * Role: Worker (1)
   */
  @Delete('/applications/:applicationId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA])
  async cancelApplication(
    @Auth() user: User,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ): Promise<WebResponse<void>> {
    await this.applicationService.cancelApplication(applicationId, user.id);

    return {
      message: 'Lamaran berhasil dibatalkan',
    };
  }

  /**
   * GET /api/applications/{application_id}
   * Melihat detail lamaran
   * Role: Worker (1) atau Pemberi Kerja (2)
   */
  @Get('/applications/:applicationId')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async getApplicationDetail(
    @Auth() user: User,
    @Param('applicationId', ParseIntPipe) applicationId: number,
  ): Promise<WebResponse<ApplicationResponse>> {
    const result = await this.applicationService.getApplicationDetail(
      applicationId,
      user.id,
    );

    return {
      data: result,
    };
  }
}
