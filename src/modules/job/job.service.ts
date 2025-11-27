import { HttpException, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ValidationService } from '../../common/validation.service';
import { PrismaService } from '../../common/prisma.service';
import {
  CreateJobRequest,
  UpdateJobRequest,
  JobResponse,
  JobListResponse,
  JobSearchQuery,
  ProviderJobHistoryQuery,
  UpdateWorkerJobStatusRequest,
  UpdateEmployerJobStatusRequest,
} from '../../model/job.model';
import { JobValidation } from './job.validation';
import { JobStatus, Prisma, WalletStatus } from '@prisma/client';
import { dec } from '../../utils/decimal';

@Injectable()
export class JobService {
  constructor(
    private validationService: ValidationService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    private prismaService: PrismaService,
  ) {}

  async createJob(
    providerId: string,
    request: CreateJobRequest,
  ): Promise<JobResponse> {
    this.logger.debug(`Creating job for provider ${providerId}`);

    const createRequest: CreateJobRequest = this.validationService.validate(
      JobValidation.CREATE_JOB,
      request,
    );

    // Cek apakah user adalah pemberi kerja (role_id = 2)
    const provider = await this.prismaService.user.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new HttpException('Provider tidak ditemukan', 404);
    }

    if (provider.role_id !== BigInt(2)) {
      throw new HttpException(
        'Hanya pemberi kerja yang dapat membuat lowongan',
        403,
      );
    }

    const wallet = await this.prismaService.wallet.findUnique({
      where: {
        user_id: providerId,
      },
    });

    if (
      wallet &&
      (wallet.status === WalletStatus.SUSPENDED ||
        wallet.status === WalletStatus.CLOSED)
    ) {
      throw new HttpException(
        `Gagal membuat pekerjaan, status dompet anda: ${wallet.status}, silahkan hubungi admin`,
        400,
      );
    }

    // Buat job
    const job = await this.prismaService.job.create({
      data: {
        provider_id: providerId,
        title: createRequest.title,
        description: createRequest.description,
        location: createRequest.location,
        compensation_amount: createRequest.compensation_amount,
        status: JobStatus.OPEN,
        completed_at: new Date(), // Temporary, will be updated when completed
      },
      include: {
        provider: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    return this.mapToJobResponse(job);
  }

  async updateJob(
    jobId: number,
    providerId: string,
    request: UpdateJobRequest,
  ): Promise<JobResponse> {
    this.logger.debug(`Updating job ${jobId}`);

    const updateRequest: UpdateJobRequest = this.validationService.validate(
      JobValidation.UPDATE_JOB,
      request,
    );

    // Cek apakah job ada dan milik provider ini
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new HttpException('Lowongan tidak ditemukan', 404);
    }

    if (job.provider_id !== providerId) {
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);
    }

    // Tidak bisa update jika sudah COMPLETED atau CANCELLED
    if (job.status === JobStatus.CANCELLED) {
      throw new HttpException(
        'Lowongan yang sudah selesai atau dibatalkan tidak dapat diubah',
        400,
      );
    }

    if (job.worker_id) {
      throw new HttpException(
        'Lowongan yang sudah memiliki pekerja tidak dapat diubah',
        400,
      );
    }

    // Update job
    const updatedJob = await this.prismaService.job.update({
      where: { id: jobId },
      data: {
        ...updateRequest,
        ...{
          completed_at: new Date(),
        },
      },
      include: {
        provider: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    return this.mapToJobResponse(updatedJob);
  }

  async deleteJob(jobId: number, providerId: string): Promise<void> {
    this.logger.debug(`Deleting job ${jobId}`);

    // Cek apakah job ada dan milik provider ini
    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
      include: {
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    if (!job) {
      throw new HttpException('Lowongan tidak ditemukan', 404);
    }

    if (job.provider_id !== providerId) {
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);
    }

    // Tidak bisa hapus jika ada aplikasi yang sudah diterima atau sedang in progress
    if (job.worker_id) {
      throw new HttpException(
        'Lowongan yang sudah memiliki pekerja tidak dapat dihapus',
        400,
      );
    }

    // Hapus job (cascade akan menghapus jobApplications)
    await this.prismaService.job.delete({
      where: { id: jobId },
    });
  }

  async updateWorkerJobStatus(
    jobId: number,
    workerId: string,
    request: UpdateWorkerJobStatusRequest,
  ): Promise<void> {
    this.logger.debug(`Updating job status for job ${jobId}`);
    const userRequest: UpdateWorkerJobStatusRequest =
      this.validationService.validate(
        JobValidation.UPDATE_WORKER_JOB_STATUS,
        request,
      );
    // Cek apakah job ada dan milik worker ini
    const job = await this.prismaService.job.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!job) {
      throw new HttpException('Lowongan tidak ditemukan', 404);
    }
    if (job.worker_id !== workerId) {
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);
    }

    if (job.status === JobStatus.APPROVED) {
      throw new HttpException(
        'Lowongan yang sudah disetujui tidak dapat diubah',
        400,
      );
    }

    // Update status job
    await this.prismaService.job.update({
      where: {
        id: jobId,
      },
      data: {
        status: userRequest.status,
      },
    });
  }

  async updateEmployerJobStatus(
    jobId: number,
    providerId: string,
    request: UpdateEmployerJobStatusRequest,
  ): Promise<string> {
    this.logger.debug(`Updating job status for job ${jobId}`);
    const userRequest: UpdateEmployerJobStatusRequest =
      this.validationService.validate(
        JobValidation.UPDATE_EMPLOYER_JOB_STATUS,
        request,
      );

    // Cek apakah job ada dan milik provider ini
    const job = await this.prismaService.job.findUnique({
      where: {
        id: jobId,
      },
    });

    if (!job) throw new HttpException('Lowongan tidak ditemukan', 404);

    if (job.provider_id !== providerId)
      throw new HttpException('Anda tidak memiliki akses ke lowongan ini', 403);

    // Periksa Pembatalan
    if (userRequest.status === 'CANCELLED') {
      if (job.worker_id) {
        throw new HttpException(
          'Lowongan yang sudah memiliki pekerja tidak dapat dibatalkan',
          400,
        );
      }
      await this.prismaService.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: 'CANCELLED',
        },
      });

      return 'Lowongan berhasil dibatalkan';
    } else if (userRequest.status === 'REJECTED') {
      // Periksa Penolakan
      if (job.status !== 'COMPLETED') {
        throw new HttpException(
          'Hanya lowongan dengan status COMPLETED yang dapat ditolak',
          400,
        );
      }
      // Periska batasan penolakan
      await this.prismaService.job.update({
        where: {
          id: jobId,
        },
        data: {
          status: 'REJECTED',
          rejection_count: {
            increment: 1,
          },
        },
      });
      const updated = job.rejection_count + 1;
      if (updated >= 3) {
        // kirim notifikasi admin di sini
      }

      return 'Pekerjaan berhasil ditolak';
    } else if (userRequest.status === 'APPROVED') {
      // Periksa Persetujuan
      if (job.status !== 'COMPLETED') {
        throw new HttpException(
          'Hanya lowongan dengan status COMPLETED yang dapat disetujui',
          400,
        );
      }
      if (!job.worker_id) {
        throw new HttpException('Job tidak memiliki pekerja', 400);
      }
      await this.prismaService.$transaction(async (tx) => {
        await tx.job.update({
          where: {
            id: jobId,
          },
          data: {
            status: 'APPROVED',
            completed_at: new Date(),
          },
        });
        await tx.escrow.updateMany({
          where: {
            job_id: jobId,
          },
          data: {
            status: 'RELEASED',
            released_at: new Date(),
          },
        });

        // Ambil escrow amount secara eksplisit
        const escrowRecord = await tx.escrow.findFirst({
          where: { job_id: jobId },
        });
        if (!escrowRecord)
          throw new HttpException('Escrow tidak ditemukan', 400);

        const escrowFee = await this.prismaService.fee.findUnique({
          where: {
            name: 'escrow_fee',
            active: true,
            fee_type: 'PERCENTAGE',
          },
        });

        if (!escrowFee) {
          throw new HttpException('Escrow fee tidak tersedia', 500);
        }

        if (escrowFee.fee_type !== 'PERCENTAGE') {
          throw new HttpException('Escrow fee type mismatch', 500);
        }

        // make sure the fee value is a valid numeric value
        const feeNum = Number(escrowFee.value);
        if (Number.isNaN(feeNum)) {
          throw new HttpException('Escrow fee value tidak valid', 500);
        }
        const fee = escrowRecord.amount.times(dec(feeNum).dividedBy(100));
        const amount = escrowRecord.amount.minus(fee);
        await tx.wallet.update({
          where: {
            user_id: job.worker_id!,
          },
          data: {
            balance: {
              increment: amount,
            },
          },
        });
        const platformWallet = await tx.platformWallet.update({
          where: {
            id: 1,
          },
          data: {
            balance: {
              increment: fee,
            },
          },
        });
        if (!platformWallet) {
          throw new HttpException('Error platform wallet!', 500);
        }
        await tx.platformTransaction.create({
          data: {
            amount: fee,
            description: `Potongan biaya transaksi escrow sebesar Rp${Number(fee)}`,
            type: 'ESCROW_FEE',
            reference_id: escrowRecord.id,
          },
        });
        await tx.transaction.update({
          where: {
            job_id: jobId,
          },
          data: {
            status: 'COMPLETED',
          },
        });
      });

      return 'Pekerjaan berhasil disetujui dan pembayaran telah dirilis';
    }
    return 'Status pekerjaan tidak diubah';
  }

  async getJobDetail(jobId: number): Promise<JobResponse> {
    this.logger.debug(`Getting job detail ${jobId}`);

    const job = await this.prismaService.job.findUnique({
      where: { id: jobId },
      include: {
        provider: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    if (!job) {
      throw new HttpException('Lowongan tidak ditemukan', 404);
    }

    return this.mapToJobResponse(job);
  }

  async searchJobs(query: JobSearchQuery): Promise<JobListResponse> {
    this.logger.debug(`Searching jobs with query ${JSON.stringify(query)}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {};

    // Filter by status (default OPEN for public search)
    where.status = query.status ? (query.status as any) : JobStatus.OPEN;

    // Filter by keyword (search in title, description)
    if (query.keyword) {
      where.OR = [
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
      ];
    }

    // Filter by location
    if (query.location) {
      where.location = {
        contains: query.location,
        mode: 'insensitive' as Prisma.QueryMode,
      };
    }

    // Filter by compensation range
    if (query.min_compensation || query.max_compensation) {
      where.compensation_amount = {};
      if (query.min_compensation) {
        where.compensation_amount.gte = query.min_compensation;
      }
      if (query.max_compensation) {
        where.compensation_amount.lte = query.max_compensation;
      }
    }

    // Build orderBy
    const sortBy = query.sort_by || 'posted_at';
    const sortOrder = query.sort_order || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [jobs, total] = await Promise.all([
      this.prismaService.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          provider: {
            select: {
              id: true,
              full_name: true,
              profile_picture_url: true,
              average_rating: true,
            },
          },
          _count: {
            select: {
              jobApplications: true,
            },
          },
        },
      }),
      this.prismaService.job.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => this.mapToJobResponse(job)),
      total,
      page,
      limit,
    };
  }

  async getProviderJobHistory(
    providerId: string,
    query: ProviderJobHistoryQuery,
  ): Promise<JobListResponse> {
    this.logger.debug(`Getting job history for provider ${providerId}`);

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.JobWhereInput = {
      provider_id: providerId,
    };

    // Filter by status
    if (query.status) {
      where.status = query.status as any;
    }

    // Build orderBy
    const sortBy = query.sort_by || 'posted_at';
    const sortOrder = query.sort_order || 'desc';
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    const [jobs, total] = await Promise.all([
      this.prismaService.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          provider: {
            select: {
              id: true,
              full_name: true,
              profile_picture_url: true,
              average_rating: true,
            },
          },
          worker: {
            select: {
              id: true,
              full_name: true,
              profile_picture_url: true,
              average_rating: true,
            },
          },
          _count: {
            select: {
              jobApplications: true,
            },
          },
        },
      }),
      this.prismaService.job.count({ where }),
    ]);

    return {
      jobs: jobs.map((job) => this.mapToJobResponse(job)),
      total,
      page,
      limit,
    };
  }

  async getActiveJobs(providerId: string): Promise<JobListResponse> {
    this.logger.debug(`Getting active jobs for provider ${providerId}`);

    const jobs = await this.prismaService.job.findMany({
      where: {
        provider_id: providerId,
        status: {
          in: [JobStatus.OPEN, JobStatus.ASSIGNED, JobStatus.IN_PROGRESS],
        },
      },
      orderBy: { posted_at: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    return {
      jobs: jobs.map((job) => this.mapToJobResponse(job)),
      total: jobs.length,
      page: 1,
      limit: jobs.length,
    };
  }

  async getCompletedJobs(providerId: string): Promise<JobListResponse> {
    this.logger.debug(`Getting completed jobs for provider ${providerId}`);

    const jobs = await this.prismaService.job.findMany({
      where: {
        provider_id: providerId,
        status: {
          in: [JobStatus.COMPLETED, JobStatus.CANCELLED],
        },
      },
      orderBy: { completed_at: 'desc' },
      include: {
        provider: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        worker: {
          select: {
            id: true,
            full_name: true,
            profile_picture_url: true,
            average_rating: true,
          },
        },
        _count: {
          select: {
            jobApplications: true,
          },
        },
      },
    });

    return {
      jobs: jobs.map((job) => this.mapToJobResponse(job)),
      total: jobs.length,
      page: 1,
      limit: jobs.length,
    };
  }

  private mapToJobResponse(job: any): JobResponse {
    return {
      id: Number(job.id),
      provider_id: job.provider_id,
      worker_id: job.worker_id,
      title: job.title,
      description: job.description,
      location: job.location,
      compensation_amount: Number(job.compensation_amount),
      status: job.status,
      posted_at: job.posted_at,
      completed_at: job.completed_at,
      provider: job.provider
        ? {
            id: job.provider.id,
            full_name: job.provider.full_name,
            profile_picture_url: job.provider.profile_picture_url,
            average_rating: job.provider.average_rating
              ? Number(job.provider.average_rating)
              : null,
          }
        : undefined,
      worker: job.worker
        ? {
            id: job.worker.id,
            full_name: job.worker.full_name,
            profile_picture_url: job.worker.profile_picture_url,
            average_rating: job.worker.average_rating
              ? Number(job.worker.average_rating)
              : null,
          }
        : undefined,
      _count: job._count
        ? {
            jobApplications: job._count.jobApplications,
          }
        : undefined,
    };
  }
}
