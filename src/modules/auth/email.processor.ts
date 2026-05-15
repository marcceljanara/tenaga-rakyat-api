import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailSenderService, EmailOptions } from './email-sender.service';
import { observabilityMetrics } from '../../observability/metrics';
import { runWithSpan } from '../../observability/tracing.util';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailSenderService: EmailSenderService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailOptions>) {
    return runWithSpan(
      'bull.email.send_email',
      {
        'messaging.system': 'bull',
        'messaging.destination': 'email',
        'messaging.operation': 'send-email',
      },
      async () => {
        this.logger.log(`Processing email job ${job.id}`);

        try {
          await this.emailSenderService.processEmail(job.data);
          observabilityMetrics.recordBullJob({
            queue: 'email',
            job: 'send-email',
            result: 'completed',
          });
          this.logger.log(`Email job ${job.id} completed successfully`);
          return { success: true, messageId: job.id };
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          observabilityMetrics.recordBullJob({
            queue: 'email',
            job: 'send-email',
            result: 'failed',
          });
          this.logger.error(`Email job ${job.id} failed: ${errorMessage}`);
          throw error;
        }
      },
    );
  }
}
