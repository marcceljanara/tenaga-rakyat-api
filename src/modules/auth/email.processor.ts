import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { EmailSenderService, EmailOptions } from './email-sender.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailSenderService: EmailSenderService) {}

  @Process('send-email')
  async handleSendEmail(job: Job<EmailOptions>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);

    try {
      await this.emailSenderService.processEmail(job.data);
      this.logger.log(`Email job ${job.id} completed successfully`);
      return { success: true, messageId: job.id };
    } catch (error) {
      this.logger.error(
        `Email job ${job.id} failed: ${error.message}`,
        error.stack,
      );
      throw error; // Bull will retry based on job configuration
    }
  }
}
