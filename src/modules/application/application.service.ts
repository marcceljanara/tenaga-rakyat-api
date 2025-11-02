import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  ApplyJobRequest,
  UpdateApplicationStatusRequest,
  ApplicationResponse,
  ApplicationListResponse,
  ApplicationStatisticsResponse,
  SearchApplicationQuery,
} from '../../model/application.model';
import { ApplicationValidation } from './application.validation';
import { ApplicationStatus, JobStatus, Prisma } from '@prisma/client';

@Injectable()
export class ApplicationService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async applyJob(
    jobId: number,
    workerId: string,
    request: ApplyJobRequest,
  ): Promise<ApplicationResponse> {
    this.logger.debug(`Worker ${workerId} applying to job ${jobId}`);

    const applyRequest: ApplyJobRequest = this.validationService.validate(
      ApplicationValidation.APPLY_JOB,
      request,
    );

    // Cek apakah job ada dan statusnya OPEN
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
      include: { provider: true },
    });

    if (!job) {
      throw new HttpException('Job tidak ditemukan', 404);
    }

    if (job.status !== JobStatus.OPEN) {
      throw new HttpException('Lowongan ini sudah tidak tersedia', 400);
    }

    // Cek apakah user adalah pemberi kerja (tidak bisa melamar ke job sendiri)
    if (job.provider_id === workerId) {
      throw new HttpException(
        'Anda tidak dapat melamar ke lowongan sendiri',
        400,
      );
    }

    // Cek apakah sudah pernah melamar
    const existingApplication =
      await this.prismaService.jobApplication.findFirst({
        where: {
          job_id: jobId,
          worker_id: workerId,
        },
      });

    if (existingApplication) {
      throw new HttpException('Anda sudah melamar ke lowongan ini', 400);
    }

    // Cek apakah user adalah worker (role_id = 1)
    const worker = await this.prismaService.user.findUnique({
      where: { id: workerId },
    });

    if (!worker) {
      throw new HttpException('Pekerja tidak ditemukan', 404);
    }

    if (worker.role_id !== BigInt(1)) {
      throw new HttpException(
        'Hanya pekerja yang dapat melamar pekerjaan',
        403,
      );
    }

    // Buat application
    const application = await this.prismaService.jobApplication.create({
      data: {
        job_id: jobId,
        worker_id: workerId,
        cover_letter: applyRequest.cover_letter,
        status: ApplicationStatus.PENDING,
      },
      include: {
        job: {
          include: {
            provider: {
              select: {
                id: true,
                full_name: true,
                profile_picture_url: true,
                average_rating: true,
              },
            },
          },
        },
      },
    });

    return this.mapToApplicationResponse(application);
  }

  async getJobApplications(
    jobId: number,
    providerId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    sortBy: string = 'created_at',
    sortOrder: string = 'desc',
  ): Promise<ApplicationListResponse> {
    this.logger.debug(`Getting applications for job ${jobId}`);

    // Cek apakah job milik provider ini
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Job tidak ditemukan', 404);
    }

    if (job.provider_id !== providerId) {
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);
    }

    const skip = (page - 1) * limit;

    const where: any = { job_id: jobId };
    if (status) {
      where.status = status;
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [applications, total] = await Promise.all([
      this.prismaService.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          worker: {
            select: {
              id: true,
              full_name: true,
              email: true,
              phone_number: true,
              profile_picture_url: true,
              about: true,
              cv_url: true,
              average_rating: true,
              verification_status: true,
            },
          },
        },
      }),
      this.prismaService.jobApplication.count({ where }),
    ]);

    return {
      applications: applications.map((app) =>
        this.mapToApplicationResponse(app),
      ),
      total,
      page,
      limit,
    };
  }

  async getUserApplications(
    userId: string,
    page: number = 1,
    limit: number = 10,
    status?: string,
    sortBy: string = 'created_at',
    sortOrder: string = 'desc',
  ): Promise<ApplicationListResponse> {
    this.logger.debug(`Getting applications for user ${userId}`);

    const skip = (page - 1) * limit;

    const where: any = { worker_id: userId };
    if (status) {
      where.status = status;
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [applications, total] = await Promise.all([
      this.prismaService.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          job: {
            include: {
              provider: {
                select: {
                  id: true,
                  full_name: true,
                  profile_picture_url: true,
                  average_rating: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.jobApplication.count({ where }),
    ]);

    return {
      applications: applications.map((app) =>
        this.mapToApplicationResponse(app),
      ),
      total,
      page,
      limit,
    };
  }

  async searchUserApplications(
    userId: string,
    query: SearchApplicationQuery,
  ): Promise<ApplicationListResponse> {
    this.logger.debug(`Searching applications for user ${userId}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobApplicationWhereInput = {
      worker_id: userId,
    };

    // Filter by status
    if (query.status) {
      where.status = query.status as any;
    }

    // Filter by keyword (search in job title, description, provider name)
    if (query.keyword) {
      where.job = {
        OR: [
          {
            title: {
              contains: query.keyword,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
          {
            description: {
              contains: query.keyword,
              mode: 'insensitive' as Prisma.QueryMode,
            },
          },
          {
            provider: {
              full_name: {
                contains: query.keyword,
                mode: 'insensitive' as Prisma.QueryMode,
              },
            },
          },
        ],
      };
    }

    // Build orderBy
    const sortBy = query.sort_by || 'created_at';
    const sortOrder = query.sort_order || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [applications, total] = await Promise.all([
      this.prismaService.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          job: {
            include: {
              provider: {
                select: {
                  id: true,
                  full_name: true,
                  profile_picture_url: true,
                  average_rating: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.jobApplication.count({ where }),
    ]);

    return {
      applications: applications.map((app) =>
        this.mapToApplicationResponse(app),
      ),
      total,
      page,
      limit,
    };
  }

  async updateApplicationStatus(
    applicationId: number,
    providerId: string,
    request: UpdateApplicationStatusRequest,
  ): Promise<ApplicationResponse> {
    this.logger.debug(`Updating application ${applicationId} status`);

    const statusRequest: UpdateApplicationStatusRequest =
      this.validationService.validate(
        ApplicationValidation.UPDATE_STATUS,
        request,
      );

    // Cek apakah application ada
    const application = await this.prismaService.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) {
      throw new HttpException('Lamaran tidak ditemukan', 404);
    }

    // Cek apakah job milik provider ini
    if (application.job.provider_id !== providerId) {
      throw new HttpException('Anda tidak memiliki akses ke lamaran ini', 403);
    }

    // Cek apakah job masih OPEN
    if (application.job.status !== JobStatus.OPEN) {
      throw new HttpException(
        'Lowongan ini sudah tidak menerima perubahan status',
        400,
      );
    }

    // Update status application
    const updatedApplication = await this.prismaService.jobApplication.update({
      where: { id: applicationId },
      data: {
        status: statusRequest.status as any,
      },
      include: {
        job: {
          include: {
            provider: {
              select: {
                id: true,
                full_name: true,
                profile_picture_url: true,
                average_rating: true,
              },
            },
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true,
            about: true,
            cv_url: true,
            average_rating: true,
            verification_status: true,
          },
        },
      },
    });

    // Jika ACCEPTED, update job status menjadi ASSIGNED dan set worker_id
    if (statusRequest.status === ApplicationStatus.ACCEPTED) {
      await this.prismaService.job.update({
        where: { id: application.job_id },
        data: {
          status: JobStatus.ASSIGNED,
          worker_id: application.worker_id,
        },
      });

      // Reject semua aplikasi lainnya untuk job ini
      await this.prismaService.jobApplication.updateMany({
        where: {
          job_id: application.job_id,
          id: { not: applicationId },
          OR: [
            { status: ApplicationStatus.UNDER_REVIEW },
            { status: ApplicationStatus.PENDING },
          ],
        },
        data: {
          status: ApplicationStatus.REJECTED,
        },
      });
    }

    return this.mapToApplicationResponse(updatedApplication);
  }

  async cancelApplication(
    applicationId: number,
    userId: string,
  ): Promise<void> {
    this.logger.debug(`Canceling application ${applicationId}`);

    // Cek apakah application ada
    const application = await this.prismaService.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
      },
    });

    if (!application) {
      throw new HttpException('Lamaran tidak ditemukan', 404);
    }

    // Cek apakah application milik user ini
    if (application.worker_id !== userId) {
      throw new HttpException('Anda tidak memiliki akses ke lamaran ini', 403);
    }

    // Cek apakah status masih OPEN (belum diterima/ditolak)
    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new HttpException(
        'Lamaran yang sudah diproses tidak dapat dibatalkan',
        400,
      );
    }

    // Hapus application
    await this.prismaService.jobApplication.delete({
      where: { id: applicationId },
    });
  }

  async getJobApplicationStatistics(
    jobId: number,
    providerId: string,
  ): Promise<ApplicationStatisticsResponse> {
    this.logger.debug(`Getting statistics for job ${jobId}`);

    // Cek apakah job milik provider ini
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Job tidak ditemukan', 404);
    }

    if (job.provider_id !== providerId) {
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);
    }

    // Get statistics
    const [totalApplications, applications, latestApplication] =
      await Promise.all([
        this.prismaService.jobApplication.count({
          where: { job_id: jobId },
        }),
        this.prismaService.jobApplication.groupBy({
          by: ['status'],
          where: { job_id: jobId },
          _count: {
            status: true,
          },
        }),
        this.prismaService.jobApplication.findFirst({
          where: { job_id: jobId },
          orderBy: { created_at: 'desc' },
          select: { created_at: true },
        }),
      ]);

    // Count by status
    const pendingCount =
      applications.find((app) => app.status === ApplicationStatus.PENDING)
        ?._count.status || 0;
    const acceptedCount =
      applications.find((app) => app.status === ApplicationStatus.ACCEPTED)
        ?._count.status || 0;
    const rejectedCount =
      applications.find((app) => app.status === ApplicationStatus.REJECTED)
        ?._count.status || 0;
    const underReviewCount =
      applications.find((app) => app.status === ApplicationStatus.UNDER_REVIEW)
        ?._count.status || 0;

    return {
      job_id: Number(jobId),
      job_title: job.title,
      total_applications: totalApplications,
      pending_count: pendingCount,
      accepted_count: acceptedCount,
      rejected_count: rejectedCount,
      under_review_count: underReviewCount,
      latest_application_date: latestApplication?.created_at || null,
    };
  }

  async getApplicationDetail(
    applicationId: number,
    userId: string,
  ): Promise<ApplicationResponse> {
    this.logger.debug(`Getting application detail ${applicationId}`);

    const application = await this.prismaService.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            provider: {
              select: {
                id: true,
                full_name: true,
                profile_picture_url: true,
                average_rating: true,
              },
            },
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            email: true,
            phone_number: true,
            profile_picture_url: true,
            about: true,
            cv_url: true,
            average_rating: true,
            verification_status: true,
          },
        },
      },
    });

    if (!application) {
      throw new HttpException('Lamaran tidak ditemukan', 404);
    }

    // Cek akses: hanya worker yang melamar atau provider yang bisa lihat
    if (
      application.worker_id !== userId &&
      application.job.provider_id !== userId
    ) {
      throw new HttpException('Anda tidak memiliki akses ke lamaran ini', 403);
    }

    return this.mapToApplicationResponse(application);
  }

  private mapToApplicationResponse(application: any): ApplicationResponse {
    return {
      id: Number(application.id),
      job_id: Number(application.job_id),
      worker_id: application.worker_id,
      cover_letter: application.cover_letter,
      status: application.status,
      created_at: application.created_at,
      updated_at: application.updated_at,
      job:
        application.job && application.job.provider
          ? {
              id: Number(application.job.id),
              title: String(application.job.title),
              description: String(application.job.description),
              location: application.job.location,
              compensation_amount: Number(application.job.compensation_amount),
              status: String(application.job.status),
              provider: {
                id: String(application.job.provider.id),
                full_name: String(application.job.provider.full_name),
                profile_picture_url:
                  application.job.provider.profile_picture_url,
                average_rating: application.job.provider.average_rating
                  ? Number(application.job.provider.average_rating)
                  : null,
              },
            }
          : undefined,
      worker: application.worker
        ? {
            id: application.worker.id,
            full_name: application.worker.full_name,
            email: application.worker.email,
            phone_number: application.worker.phone_number,
            profile_picture_url: application.worker.profile_picture_url,
            about: application.worker.about,
            cv_url: application.worker.cv_url,
            average_rating: application.worker.average_rating
              ? Number(application.worker.average_rating)
              : null,
            verification_status: application.worker.verification_status,
          }
        : undefined,
    };
  }
}
