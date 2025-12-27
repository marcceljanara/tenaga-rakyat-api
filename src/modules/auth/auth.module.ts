import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { EmailVerificationService } from './email-verification.service';
import { EmailSenderService } from './email-sender.service';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bull';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: false, // Keep failed jobs for debugging
      },
    }),
  ],
  controllers: [AuthController],
  providers: [EmailVerificationService, EmailSenderService, EmailProcessor],
})
export class AuthModule {}
