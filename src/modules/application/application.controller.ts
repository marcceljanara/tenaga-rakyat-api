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
import { Throttle } from '@nestjs/throttler';
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Job Applications')
@ApiBearerAuth()
@Throttle({ default: { limit: 30, ttl: 60000 } })
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
  @ApiOperation({
    summary: 'Apply for job',
    description:
      'Submit job application (Worker role). Creates escrow when accepted.',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiBody({ type: ApplyJobRequest })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lamaran berhasil dikirim' },
        data: { $ref: '#/components/schemas/ApplicationResponse' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Job not available, already applied, or wallet issues',
  })
  @ApiResponse({ status: 403, description: 'Only workers can apply' })
  @ApiResponse({ status: 404, description: 'Job or worker not found' })
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
  @ApiOperation({
    summary: 'Get job applications',
    description: 'Get all applications for a specific job (Job Provider only)',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
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
    name: 'status',
    required: false,
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'UNDER_REVIEW'],
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['created_at', 'updated_at', 'status'],
    description: 'Sort field (default: created_at)',
  })
  @ApiQuery({
    name: 'sort_order',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ApplicationListResponse' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
  @ApiOperation({
    summary: 'Get application statistics',
    description: 'Get statistics for job applications',
  })
  @ApiParam({ name: 'jobId', type: Number, description: 'Job ID' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ApplicationStatisticsResponse' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No access to this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
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
  @ApiOperation({
    summary: 'Get user applications',
    description: 'Get application history for logged-in worker',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    type: String,
    enum: ['created_at', 'updated_at', 'status'],
  })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ApplicationListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Search user applications',
    description:
      'Search applications by keyword (job title, description, provider name)',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Search keyword',
  })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    enum: ['created_at', 'updated_at', 'status'],
  })
  @ApiQuery({ name: 'sort_order', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: 200,
    description: 'Search results',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ApplicationListResponse' },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Update application status',
    description:
      'Accept/reject application (Job Provider only). ACCEPTED status will create escrow and assign job to worker.',
  })
  @ApiParam({
    name: 'applicationId',
    type: Number,
    description: 'Application ID',
  })
  @ApiBody({ type: UpdateApplicationStatusRequest })
  @ApiResponse({
    status: 200,
    description: 'Status updated. Returns specific messages based on status.',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          enum: [
            'Pelamar berhasil diterima',
            'Pelamar berhasil ditolak',
            'Lamaran sedang ditinjau',
          ],
        },
        data: { $ref: '#/components/schemas/ApplicationResponse' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Job not available, already processed, or insufficient balance for escrow',
  })
  @ApiResponse({ status: 403, description: 'No access to this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
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
  @ApiOperation({
    summary: 'Cancel application',
    description:
      'Cancel submitted application (Worker only). Only PENDING/UNDER_REVIEW can be cancelled.',
  })
  @ApiParam({
    name: 'applicationId',
    type: Number,
    description: 'Application ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Application cancelled',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Lamaran berhasil dibatalkan' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Application already processed' })
  @ApiResponse({ status: 403, description: 'No access to this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
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
  @ApiOperation({
    summary: 'Get application detail',
    description:
      'Get detailed application information (Worker or Job Provider)',
  })
  @ApiParam({
    name: 'applicationId',
    type: Number,
    description: 'Application ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Application details',
    schema: {
      type: 'object',
      properties: {
        data: { $ref: '#/components/schemas/ApplicationResponse' },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No access to this application' })
  @ApiResponse({ status: 404, description: 'Application not found' })
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
