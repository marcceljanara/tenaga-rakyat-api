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
import {
  ApplicationStatus,
  EscrowStatus,
  JobStatus,
  Prisma,
  WalletStatus,
} from '@prisma/client';

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

    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: workerId,
      },
    });

    if (wallet && (WalletStatus.CLOSED || WalletStatus.SUSPENDED)) {
      throw new HttpException(
        `Gagal melamar pekerjaan, status dompet anda: ${wallet.status}, silahkan hubungi admin`,
        400,
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

    // Ambil application lengkap (beserta job)
    const application = await this.prismaService.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        job: true,
        worker: true,
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

    if (
      application.status !== ApplicationStatus.PENDING &&
      application.status !== ApplicationStatus.UNDER_REVIEW
    ) {
      throw new HttpException(
        'Status lamaran sudah diproses dan tidak dapat diubah',
        400,
      );
    }

    // --- BRANCH ACCEPTED: lakukan semua cek & perubahan di dalam TRANSAKSI ---
    if (statusRequest.status === ApplicationStatus.ACCEPTED) {
      // Semua DB op yang berhubungan harus menggunakan `tx`
      const updatedApplication = await this.prismaService.$transaction(
        async (tx) => {
          // Ambil job (pakai tx) — kita butuh compensation_amount
          const jobRecord = await tx.job.findUnique({
            where: { id: application.job_id },
            select: { id: true, compensation_amount: true, status: true },
          });

          if (!jobRecord) {
            throw new HttpException('Job tidak ditemukan', 404);
          }

          // Pastikan job masih OPEN (double-check di dalam tx)
          if (jobRecord.status !== JobStatus.OPEN) {
            throw new HttpException(
              'Lowongan sudah tidak menerima perubahan status',
              400,
            );
          }

          const compensation = jobRecord.compensation_amount;

          // Ambil wallet employer & worker sekaligus
          const wallets = await tx.wallet.findMany({
            where: {
              user_id: { in: [providerId, application.worker_id] },
            },
            select: { id: true, user_id: true, balance: true },
          });

          const providerWallet = wallets.find((w) => w.user_id === providerId);
          const workerWallet = wallets.find(
            (w) => w.user_id === application.worker_id,
          );

          if (!providerWallet || !workerWallet) {
            throw new HttpException('Wallet tidak ditemukan', 400);
          }
          // Cek saldo cukup SEBELUM mengubah apa pun
          if (providerWallet.balance.lessThan(compensation)) {
            throw new HttpException(
              'Saldo pemberi kerja tidak mencukupi untuk menahan escrow',
              400,
            );
          }

          // Decrement saldo employer (hold)
          await tx.wallet.update({
            where: { id: providerWallet.id },
            data: { balance: { decrement: compensation } },
          });

          // Buat escrow record
          await tx.escrow.create({
            data: {
              job_id: application.job_id,
              amount: compensation,
              status: EscrowStatus.HELD,
              provider_id: providerId,
              worker_id: application.worker_id,
            },
          });

          // Catat transaksi wallet (ESCROW_HELD)
          await tx.transaction.create({
            data: {
              job_id: application.job_id,
              amount: compensation,
              transaction_type: 'ESCROW_RELEASE',
              source_wallet_id: providerWallet.id,
              destination_wallet_id: workerWallet.id,
              status: 'PENDING',
            },
          });

          // Sekarang assign job (paling akhir setelah dana ter-hold)
          await tx.job.update({
            where: { id: application.job_id },
            data: {
              status: JobStatus.ASSIGNED,
              worker_id: application.worker_id,
            },
          });

          // Reject semua aplikasi lain untuk job ini
          await tx.jobApplication.updateMany({
            where: {
              job_id: application.job_id,
              id: { not: applicationId },
              status: {
                in: [ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW],
              },
            },
            data: { status: ApplicationStatus.REJECTED },
          });

          // Terakhir: update application yang diterima → set jadi ACCEPTED
          const updatedApp = await tx.jobApplication.update({
            where: { id: applicationId },
            data: { status: ApplicationStatus.ACCEPTED },
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

          // kembalikan updated application dari dalam transaksi
          return updatedApp;
        },
      ); // end transaction

      // map & return
      return this.mapToApplicationResponse(updatedApplication);
    }

    // --- BRANCH REJECTED / UNDER_REVIEW / LAINNYA: update application langsung ---
    // Misal REJECTED: increment rejection_count bisa ditambahkan di sini (nanti)
    const updatedApplication = await this.prismaService.jobApplication.update({
      where: { id: applicationId },
      data: { status: statusRequest.status },
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
