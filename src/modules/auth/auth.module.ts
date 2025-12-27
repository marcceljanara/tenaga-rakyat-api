import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { EmailVerificationService } from './email-verification.service';
import { EmailSenderService } from './email-sender.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [EmailVerificationService, EmailSenderService],
})
export class AuthModule {}
