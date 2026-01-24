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
  UpdateEmployerJobStatusRequest,
} from '../../model/job.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import { Roles } from '../../common/role/role.decorator';
import type { User } from '@prisma/client';
import { ROLES } from '../../common/role/role';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Job Management')
@ApiBearerAuth()
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
  @ApiOperation({
    summary: 'Create job',
    description:
      'Create new job posting (Job Provider only). Wallet must be ACTIVE.',
  })
  @ApiBody({ type: CreateJobRequest })
  @ApiResponse({
    status: 201,
    description: 'Job created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lowongan berhasil dibuat' },
        data: { $ref: '#/components/schemas/JobResponse' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Wallet suspended or closed' })
  @ApiResponse({
    status: 403,
    description: 'Only job providers can create jobs',
  })
  @ApiResponse({ status: 404, description: 'Provider not found' })
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
   * PUT /{job_id}
   * Memperbarui lowongan pekerjaan
   * Role: Pemberi Kerja (2)
   */
  @Put('/:jobId')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiOperation({
    summary: 'Update job',
    description:
      'Update job information (Job Provider only). Cannot update if already has worker or cancelled.',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiBody({ type: UpdateJobRequest })
  @ApiResponse({
    status: 200,
    description: 'Job updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lowongan berhasil diperbarui' },
        data: { $ref: '#/components/schemas/JobResponse' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Job already has worker or is cancelled',
  })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
  @ApiOperation({
    summary: 'Delete job',
    description:
      'Delete job posting (Job Provider only). Cannot delete if has assigned worker.',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lowongan berhasil dihapus' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Job has assigned worker' })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
   * Melihat detail lowongan pekerjaan Private
   * Role: Worker (1) and Job Provider (2)
   */
  @Get('/:jobId/private')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get job detail Private',
    description: 'Get detailed job information (Private for Worker/Provider).',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobResponse' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getJobDetailPrivate(
    @Param('jobId', ParseIntPipe) jobId: number,
    @Auth() user: User,
  ): Promise<WebResponse<JobResponse>> {
    const result = await this.jobService.getJobDetailPrivate(
      jobId,
      user.id,
      user.role_id,
    );
    return {
      data: result,
    };
  }
  /**
   * GET /api/jobs/{job_id}
   * Melihat detail lowongan pekerjaan Private
   * Role: Public
   */
  @Get('/:jobId/public')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Get job detail Public',
    description: 'Get detailed job information (Public)',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Job details retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobResponse' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA, ROLES.ADMIN, ROLES.SUPER_ADMIN])
  async getJobDetailPublic(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
  ): Promise<WebResponse<JobResponse>> {
    const result = await this.jobService.getJobDetailPublic(jobId, user.id);
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
  @ApiOperation({
    summary: 'Search jobs',
    description:
      'Search and filter job listings (Public). Default shows OPEN jobs only.',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search in title and description',
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Job location',
  })
  @ApiQuery({
    name: 'min_compensation',
    required: false,
    type: Number,
    description: 'Minimum compensation',
  })
  @ApiQuery({
    name: 'max_compensation',
    required: false,
    type: Number,
    description: 'Maximum compensation',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    description: 'Job status (default: OPEN)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['posted_at', 'compensation_amount', 'title'],
    description: 'Sort field (default: posted_at)',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Job list retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get provider job history',
    description:
      'Get all jobs posted by provider with filtering (Job Provider only)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['posted_at', 'status'],
    description: 'Sort field (default: posted_at)',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Job history retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get active jobs',
    description:
      'Get active jobs: OPEN, ASSIGNED, IN_PROGRESS (Job Provider only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Active jobs retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Get completed jobs',
    description: 'Get completed jobs: COMPLETED, CANCELLED (Job Provider only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Completed jobs retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/JobListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Update job status (Worker)',
    description:
      'Update job to IN_PROGRESS or COMPLETED (Worker only). Cannot update if already APPROVED.',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiBody({ type: UpdateWorkerJobStatusRequest })
  @ApiResponse({
    status: 200,
    description: 'Job status updated',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Status pekerjaan berhasil diperbarui',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Job already approved' })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
  /**
   * PATCH /api/jobs/{job_id}/status/employer
   * Mengubah status pekerjaan oleh pemberi kerja menjadi CANCELLED, APPROVED atau REJECTED
   * Role: Pemberi Kerja (2)
   */
  @Patch('/:jobId/status/employer')
  @HttpCode(200)
  @Roles([ROLES.PEMBERI_KERJA])
  @ApiOperation({
    summary: 'Update job status (Employer)',
    description:
      'Update job status (Job Provider only): CANCELLED (if no worker), REJECTED (if COMPLETED, max 3 times), APPROVED (releases escrow and completes payment)',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiBody({ type: UpdateEmployerJobStatusRequest })
  @ApiResponse({
    status: 200,
    description:
      'Job status updated. Returns specific messages based on action.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          enum: [
            'Lowongan berhasil dibatalkan',
            'Pekerjaan berhasil ditolak',
            'Pekerjaan berhasil disetujui dan pembayaran telah dirilis',
            'Status pekerjaan tidak diubah',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid status transition or job has worker (for cancel), or not COMPLETED (for reject/approve), or no worker (for approve)',
  })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job or escrow not found' })
  @ApiResponse({ status: 500, description: 'Escrow fee not found or invalid' })
  async updateEmployerJobStatus(
    @Auth() user: User,
    @Param('jobId', ParseIntPipe) jobId: number,
    @Body() request: UpdateEmployerJobStatusRequest,
  ): Promise<WebResponse<string>> {
    const result = await this.jobService.updateEmployerJobStatus(
      jobId,
      user.id,
      request,
    );
    return {
      message: result,
    };
  }
}
