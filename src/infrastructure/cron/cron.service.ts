import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Cron } from '@nestjs/schedule';
import { observabilityMetrics } from '../../observability/metrics';
import { runWithSpan } from '../../observability/tracing.util';

@Injectable()
export class CronService {
  constructor(
    private prismaService: PrismaService,
    @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
  ) {}

  @Cron('*/10 * * * *')
  async handleAutoApproveJobs() {
    return runWithSpan(
      'cron.auto_approve_jobs',
      { 'app.cron.name': 'auto_approve_jobs' },
      async () => {
        this.logger.info('cron_auto_approve_started');
        const jobs = await this.prismaService.job.findMany({
          where: {
            status: 'COMPLETED',
            updated_at: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000),
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

            this.logger.debug('cron_auto_approve_job_approved', {
              jobId: job.id,
            });
          });
        }

        observabilityMetrics.recordCronJob({
          job: 'auto_approve_jobs',
          result: 'success',
        });
        this.logger.info('cron_auto_approve_completed', {
          processedJobs: jobs.length,
        });
      },
    ).catch((error) => {
      observabilityMetrics.recordCronJob({
        job: 'auto_approve_jobs',
        result: 'failed',
      });
      this.logger.error('cron_auto_approve_failed', { error });
      throw error;
    });
  }
}
