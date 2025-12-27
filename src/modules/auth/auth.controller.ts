import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { EmailVerificationService } from './email-verification.service';
import {
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  VerifyAndResetPasswordRequest,
  ChangeEmailRequest,
  SendEmailForgotPasswordRequest,
} from '../../model/auth.model';
import { WebResponse } from '../../model/web.model';
import { Auth } from '../../common/auth/auth.decorator';
import type { User } from '@prisma/client';
import { Roles } from '../../common/role/role.decorator';
import { ROLES } from '../../common/role/role';

@Controller('/api/auth')
export class AuthController {
  constructor(private emailVerificationService: EmailVerificationService) {}

  /**
   * Verify email for registration or email change
   * PUBLIC endpoint
   */
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

  /**
   * Resend verification email
   * AUTHENTICATED endpoint
   */
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

  /**
   * Request password reset (forgot password)
   * PUBLIC endpoint - only requires email
   */
  @Post('/forgot-password')
  @HttpCode(200)
  async sendResetPasswordEmail(
    @Body() request: SendEmailForgotPasswordRequest,
  ): Promise<WebResponse<ResendVerificationResponse>> {
    await this.emailVerificationService.sendVerificationEmailByEmail(request);

    return {
      data: {
        message: 'Jika email terdaftar, link reset password telah dikirim',
      },
    };
  }

  /**
   * Verify token and reset password
   * PUBLIC endpoint
   */
  @Post('/reset-password')
  @HttpCode(200)
  async verifyAndResetPassword(
    @Body() request: VerifyAndResetPasswordRequest,
  ): Promise<WebResponse<ResendVerificationResponse>> {
    await this.emailVerificationService.verifyAndResetPassword(request);

    return {
      data: {
        message: 'Password berhasil direset',
      },
    };
  }

  /**
   * Request email change
   * AUTHENTICATED endpoint
   */
  @Post('/change-email')
  @HttpCode(200)
  @Roles([ROLES.PEKERJA, ROLES.PEMBERI_KERJA])
  async requestChangeEmail(
    @Auth() user: User,
    @Body() request: ChangeEmailRequest,
  ): Promise<WebResponse<ResendVerificationResponse>> {
    await this.emailVerificationService.requestChangeEmail(
      user.id,
      request.newEmail,
    );

    return {
      data: {
        message: 'Email verifikasi telah dikirim ke alamat email baru',
      },
    };
  }
}
