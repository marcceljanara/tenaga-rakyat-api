import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import {
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
} from '../../model/auth.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';

@Controller('/api/auth')
export class AuthController {
  constructor(private emailVerificationService: EmailVerificationService) {}

  @Post('/verify-email')
  @HttpCode(200)
  async verifyEmail(
    @Body() request: VerifyEmailRequest,
  ): Promise<WebResponse<VerifyEmailResponse>> {
    const result = await this.emailVerificationService.verifyEmail(
      request.token,
    );

    return {
      data: result,
    };
  }

  @Post('/resend-verification')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async resendVerification(
    @Auth() user: User,
    @Body() request: ResendVerificationRequest,
  ): Promise<WebResponse<ResendVerificationResponse>> {
    await this.emailVerificationService.resendVerificationEmail(
      user.id,
      request.purpose,
    );

    return {
      data: {
        message: 'Email verifikasi berhasil dikirim',
      },
    };
  }
}
