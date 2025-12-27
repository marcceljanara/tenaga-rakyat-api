import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailSenderService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailSenderService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    // Verify transporter configuration
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('Email transporter verification failed:', error);
      } else {
        this.logger.log('Email transporter is ready');
      }
    });
  }

  /**
   * Queue email for async processing (Non-blocking)
   * This is the main method to use for sending emails
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.emailQueue.add('send-email', options, {
        attempts: 3, // Retry 3 times on failure
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
        removeOnComplete: true,
        removeOnFail: false, // Keep failed jobs for inspection
      });

      this.logger.log(`Email queued successfully to: ${options.to}`);
    } catch (error) {
      this.logger.error('Failed to queue email:', error);
      throw new Error('Failed to queue email');
    }
  }

  /**
   * Send email immediately (Blocking - only use for critical emails)
   * Use this only when you need to ensure email is sent before proceeding
   */
  async sendEmailSync(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Platform'}" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent successfully (sync): ${info.messageId}`);
    } catch (error) {
      this.logger.error('Failed to send email (sync):', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Process email from queue (called by worker)
   * This is the actual email sending logic
   */
  async processEmail(options: EmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Platform'}" <${process.env.EMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      this.logger.log(`Email sent successfully: ${info.messageId} to ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error);
      throw error; // Let Bull handle retry
    }
  }

  /**
   * Queue bulk emails
   */
  async sendBulkEmails(emails: EmailOptions[]): Promise<void> {
    const jobs = emails.map((email) => ({
      name: 'send-email',
      data: email,
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }));

    await this.emailQueue.addBulk(jobs);
    this.logger.log(`${emails.length} emails queued successfully`);
  }
}