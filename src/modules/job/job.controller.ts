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
  Put,
  Query,
} from '@nestjs/common';
import { JobService } from './job.service';
import {
  CreateJobRequest,
  UpdateJobRequest,
  JobResponse,
  JobListResponse,
  UpdateWorkerJobStatusRequest,
} from '../../model/job.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { ROLES } from '../../common/role/role';

@Controller('/api/jobs')
export class JobController {
  constructor(private jobService: JobService) {}

  /**
   * POST /api/jobs
   * Membuat lowongan pekerjaan baru
   * Role: Pemberi Kerja (2)
   */
  @Post()
  @HttpCode(201)
  @Roles([ROLES.PEMBERI_KERJA])
  async createJob(
    @Auth() user: User,
    @Body() request: CreateJobRequest,
  ): Promise<WebResponse<JobResponse>> {
    const result = await this.jobService.createJob(user.id, request);
    return {
      message: 'Lowongan berhasil dibuat',
      data: result,
    };
  }

  /**
   * PUT /api/jobs/{job_id}
   * Memperbarui lowongan pekerjaan
   * Role: Pemberi Kerja (2)
   */
  @Put('/:jobId')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async updateJob(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() request: UpdateJobRequest,
  ): Promise<WebResponse<JobResponse>> {
    const result = await this.jobService.updateJob(jobId, user.id, request);
    return {
      message: 'Lowongan berhasil diperbarui',
      data: result,
    };
  }

  /**
   * DELETE /api/jobs/{job_id}
   * Menghapus lowongan pekerjaan
   * Role: Pemberi Kerja (2)
   */
  @Delete('/:jobId')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async deleteJob(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<WebResponse<void>> {
    await this.jobService.deleteJob(jobId, user.id);
    return {
      message: 'Lowongan berhasil dihapus',
    };
  }

  /**
   * GET /api/jobs/{job_id}
   * Melihat detail lowongan pekerjaan
   * Role: Semua (public)
   */
  @Get('/:jobId')
  @HttpCode(200)
  async getJobDetail(
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<WebResponse<JobResponse>> {
    const result = await this.jobService.getJobDetail(jobId);
    return {
      data: result,
    };
  }

  /**
   * GET /api/jobs
   * Mencari lowongan pekerjaan (untuk pekerja)
   * Role: Public / Worker (1)
   */
  @Get()
  @HttpCode(200)
  async searchJobs(
    @Query('keyword') keyword?: string,
    @Query('location') location?: string,
    @Query('min_compensation') minCompensation?: string,
    @Query('max_compensation') maxCompensation?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ): Promise<WebResponse<JobListResponse>> {
    const result = await this.jobService.searchJobs({
      keyword,
      location,
      min_compensation: minCompensation
        ? parseFloat(minCompensation)
        : undefined,
      max_compensation: maxCompensation
        ? parseFloat(maxCompensation)
        : undefined,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sort_by: (sortBy as any) || 'posted_at',
      sort_order: (sortOrder as any) || 'desc',
    });

    return {
      data: result,
    };
  }

  /**
   * GET /api/jobs/provider/history
   * Melihat riwayat lowongan pemberi kerja (aktif dan selesai)
   * Role: Pemberi Kerja (2)
   */
  @Get('/provider/history')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async getProviderJobHistory(
    @Auth() user: User,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
  ): Promise<WebResponse<JobListResponse>> {
    const result = await this.jobService.getProviderJobHistory(user.id, {
      status: status as any,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sort_by: (sortBy as any) || 'posted_at',
      sort_order: (sortOrder as any) || 'desc',
    });

    return {
      data: result,
    };
  }

  /**
   * GET /api/jobs/provider/active
   * Melihat lowongan aktif pemberi kerja (OPEN, ASSIGNED, IN_PROGRESS)
   * Role: Pemberi Kerja (2)
   */
  @Get('/provider/active')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async getActiveJobs(
    @Auth() user: User,
  ): Promise<WebResponse<JobListResponse>> {
    const result = await this.jobService.getActiveJobs(user.id);
    return {
      data: result,
    };
  }

  /**
   * GET /api/jobs/provider/completed
   * Melihat lowongan selesai pemberi kerja (COMPLETED, CANCELLED)
   * Role: Pemberi Kerja (2)
   */
  @Get('/provider/completed')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  async getCompletedJobs(
    @Auth() user: User,
  ): Promise<WebResponse<JobListResponse>> {
    const result = await this.jobService.getCompletedJobs(user.id);
    return {
      data: result,
    };
  }

  /**
   * PATCH /api/jobs/{job_id}/status/worker
   * Mengubah status pekerjaan oleh pekerja menjadi IN_PROGRESS atau COMPLETED
   * Role: WORKER (1)
   */
  @Patch('/:jobId/status/worker')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA])
  async updateWorkerJobStatus(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() request: UpdateWorkerJobStatusRequest,
  ): Promise<WebResponse<string>> {
    await this.jobService.updateWorkerJobStatus(jobId, user.id, request);
    return {
      message: 'Status pekerjaan berhasil diperbarui',
    };
  }
}
