import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtModule } from '@nestjs/jwt';
import { ProfilePictureService } from './profile-picture.service';
import { EmailVerificationService } from '../auth/email-verification.service';
import { EmailSenderService } from '../auth/email-sender.service';
import { BullModule } from '@nestjs/bull';
import { LocationService } from '../location/location.service';

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
  controllers: [UserController],
  providers: [
    UserService,
    ProfilePictureService,
    EmailVerificationService,
    EmailSenderService,
    LocationService,
  ],
})
export class UserModule {}
