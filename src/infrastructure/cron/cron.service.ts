import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class CronService {
  constructor(
    private prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Cron('*/10 * * * *') // Menjalankan setiap 10 menit
  async handleAutoApproveJobs() {
    this.logger.info('Cron Job: Memulai proses auto-approve pekerjaan...');
    const jobs = await this.prismaService.job.findMany({
      where: {
        status: 'COMPLETED',
        updated_at: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // lebih dari 24 jam yang lalu
        },
      },
    });

    for (const job of jobs) {
      await this.prismaService.$transaction(async (tx) => {
        await tx.job.update({
          where: {
            id: job.id,
          },
          data: {
            status: 'APPROVED',
            completed_at: new Date(),
          },
        });

        await tx.escrow.updateMany({
          where: {
            job_id: job.id,
          },
          data: {
            status: 'RELEASED',
            released_at: new Date(),
          },
        });

        // Ambil escrow amount secara eksplisit
        const escrowRecord = await tx.escrow.findFirst({
          where: { job_id: job.id },
        });

        await tx.wallet.update({
          where: {
            user_id: job.worker_id!,
          },
          data: {
            balance: {
              increment: escrowRecord?.amount,
            },
          },
        });

        await tx.transaction.update({
          where: {
            job_id: job.id,
          },
          data: {
            status: 'COMPLETED',
          },
        });

        this.logger.debug(
          `[CRON] Pekerjaan dengan id ${job.id} berhasil disetujui secara otomatis`,
        );
      });
    }
  }
}
