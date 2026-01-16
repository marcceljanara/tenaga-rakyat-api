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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Authentication & Email Verification')
@Controller('/api/auth')
export class AuthController {
  constructor(private emailVerificationService: EmailVerificationService) {}

  /**
   * Verify email for registration or email change
   * PUBLIC endpoint
   */
  @Post('/verify-email')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Verify email',
    description:
      'Verify email using token for registration or email change (Public endpoint)',
  })
  @ApiBody({ type: VerifyEmailRequest })
  @ApiResponse({
    status: 200,
    description: 'Email verified',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Email berhasil diverifikasi' },
            userId: { type: 'string', example: 'uuid-here' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resend verification email to user (authenticated)',
  })
  @ApiBody({ type: ResendVerificationRequest })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Email verifikasi berhasil dikirim',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or no pending change request',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
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
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Send password reset email (Public endpoint). Returns success even if email not found for security.',
  })
  @ApiBody({ type: SendEmailForgotPasswordRequest })
  @ApiResponse({
    status: 200,
    description: 'Reset email sent if account exists',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example:
                'Jika email terdaftar, link reset password telah dikirim',
            },
          },
        },
      },
    },
  })
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
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset password using token (Public endpoint)',
  })
  @ApiBody({ type: VerifyAndResetPasswordRequest })
  @ApiResponse({
    status: 200,
    description: 'Password reset successful',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Password berhasil direset' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token, expired token, or passwords do not match',
  })
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
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Request email change',
    description: 'Send verification to new email address (authenticated)',
  })
  @ApiBody({ type: ChangeEmailRequest })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent to new address',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Email verifikasi telah dikirim ke alamat email baru',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Email already in use' })
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
