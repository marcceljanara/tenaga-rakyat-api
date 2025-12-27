import { HttpException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { EmailSenderService } from './email-sender.service';
import { ValidationService } from '../../common/validation.service';
import { AuthValidation } from './auth.validation';
import { TokenUtil } from '../../common/token.util';
import { VerificationPurpose } from '@prisma/client';
import {
  VerifyEmailRequest,
  ResendVerificationRequest,
  VerifyAndResetPasswordRequest,
  SendVerificationEmailRequest,
  SendEmailForgotPasswordRequest,
} from '../../model/auth.model';
import bcrypt from 'bcrypt';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    private prismaService: PrismaService,
    private emailSenderService: EmailSenderService,
    private validationService: ValidationService,
  ) {}

  /**
   * Send verification email when userId is known (register, resend)
   */
  async sendVerificationEmail(
    userId: string,
    email: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    // Generate token
    const { token, hash } = TokenUtil.generateTokenWithHash();

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    // Revoke previous unverified tokens for same user and purpose
    await this.prismaService.emailVerification.updateMany({
      where: {
        user_id: userId,
        purpose: purpose,
        verified_at: null,
        is_revoked: false,
      },
      data: {
        is_revoked: true,
      },
    });

    // Create new verification record
    await this.prismaService.emailVerification.create({
      data: {
        user_id: userId,
        email: email,
        token_hash: hash,
        purpose: purpose,
        expires_at: expiresAt,
      },
    });

    // Generate verification link
    const verificationLink = this.getVerificationLink(purpose, token);

    // Prepare email content based on purpose
    const { subject, html } = this.getEmailContent(purpose, verificationLink);

    // Send email
    await this.emailSenderService.sendEmail({
      to: email,
      subject,
      html,
    });

    this.logger.log(
      `Verification email sent to ${email} for purpose: ${purpose}`,
    );
  }

  /**
   * Send verification email by email only (reset password, change email request)
   * This finds the user first, then sends the email
   */
  async sendVerificationEmailByEmail(
    request: SendEmailForgotPasswordRequest,
    purpose: VerificationPurpose = VerificationPurpose.RESET_PASSWORD,
  ): Promise<void> {
    // Validate request
    const validatedRequest: SendVerificationEmailRequest =
      this.validationService.validate(
        AuthValidation.SEND_EMAIL_FORGOT_PASSWORD,
        request,
      ) as SendVerificationEmailRequest;

    // Find user by email
    const user = await this.prismaService.user.findUnique({
      where: { email: validatedRequest.email },
    });

    if (!user) {
      // For security: don't reveal if email exists or not
      // Log but don't throw error
      this.logger.warn(
        `Verification email requested for non-existent email: ${validatedRequest.email}`,
      );
      // Return silently to prevent email enumeration attacks
      return;
    }

    // Check if user is deleted or suspended
    if (user.is_deleted || user.is_suspended) {
      this.logger.warn(
        `Verification email requested for deleted/suspended user: ${validatedRequest.email}`,
      );
      return;
    }

    // Send verification email using the found userId
    await this.sendVerificationEmail(user.id, validatedRequest.email, purpose);
  }

  /**
   * Request change email - authenticated user wants to change their email
   */
  async requestChangeEmail(userId: string, newEmail: string): Promise<void> {
    // Check if new email already exists
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser) {
      throw new HttpException('Email sudah digunakan', 400);
    }

    // Send verification to NEW email with user's current userId
    await this.sendVerificationEmail(
      userId,
      newEmail,
      VerificationPurpose.CHANGE_EMAIL,
    );
  }

  /**
   * Verify and reset password
   */
  async verifyAndResetPassword(
    request: VerifyAndResetPasswordRequest,
  ): Promise<void> {
    const validatedRequest: VerifyAndResetPasswordRequest =
      this.validationService.validate(
        AuthValidation.VERIFY_AND_RESET_PASSWORD,
        request,
      ) as VerifyAndResetPasswordRequest;

    if (validatedRequest.newPassword !== validatedRequest.confirmNewPassword) {
      throw new HttpException('Password baru dan konfirmasi tidak cocok', 400);
    }

    // Hash the provided token
    const tokenHash = TokenUtil.hashToken(validatedRequest.token);

    // Find verification record
    const verification = await this.prismaService.emailVerification.findFirst({
      where: {
        token_hash: tokenHash,
        purpose: VerificationPurpose.RESET_PASSWORD,
        verified_at: null,
        is_revoked: false,
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      throw new HttpException(
        'Token verifikasi tidak valid atau sudah kedaluwarsa',
        400,
      );
    }

    // Check if token is expired
    if (new Date() > verification.expires_at) {
      throw new HttpException('Token verifikasi sudah kedaluwarsa', 400);
    }

    const passwordHash = await bcrypt.hash(validatedRequest.newPassword, 10);

    await this.prismaService.$transaction(async (tx) => {
      // Mark verification as verified
      await tx.emailVerification.update({
        where: { id: verification.id },
        data: { verified_at: new Date() },
      });

      // Update password
      await tx.user.update({
        where: { id: verification.user_id },
        data: { password: passwordHash },
      });
    });

    this.logger.log(
      `Password reset successfully for user: ${verification.user_id}`,
    );
  }

  /**
   * Verify email for registration or email change
   */
  async verifyEmail(token: string): Promise<{
    success: boolean;
    message: string;
    userId?: string;
  }> {
    // Validate request
    const request: VerifyEmailRequest = this.validationService.validate(
      AuthValidation.VERIFY_EMAIL,
      { token },
    ) as VerifyEmailRequest;

    // Hash the provided token
    const tokenHash = TokenUtil.hashToken(request.token);

    // Find verification record
    const verification = await this.prismaService.emailVerification.findFirst({
      where: {
        token_hash: tokenHash,
        verified_at: null,
        is_revoked: false,
      },
      include: {
        user: true,
      },
    });

    if (!verification) {
      throw new HttpException(
        'Token verifikasi tidak valid atau sudah kedaluwarsa',
        400,
      );
    }

    // Check if token is expired
    if (new Date() > verification.expires_at) {
      throw new HttpException('Token verifikasi sudah kedaluwarsa', 400);
    }

    // Update verification record and user
    await this.prismaService.$transaction(async (tx) => {
      // Mark verification as verified
      await tx.emailVerification.update({
        where: { id: verification.id },
        data: { verified_at: new Date() },
      });

      // Update user verification status
      if (verification.purpose === VerificationPurpose.REGISTER) {
        await tx.user.update({
          where: { id: verification.user_id },
          data: { verification_status: 'EMAIL_VERIFIED' },
        });
      } else if (verification.purpose === VerificationPurpose.CHANGE_EMAIL) {
        // Update to new email and mark as verified
        await tx.user.update({
          where: { id: verification.user_id },
          data: {
            email: verification.email,
            verification_status: 'EMAIL_VERIFIED',
          },
        });
      }
    });

    this.logger.log(
      `Email verified successfully for user: ${verification.user_id}, purpose: ${verification.purpose}`,
    );

    return {
      success: true,
      message: 'Email berhasil diverifikasi',
      userId: verification.user_id,
    };
  }

  /**
   * Resend verification email (authenticated user)
   */
  async resendVerificationEmail(
    userId: string,
    purpose: VerificationPurpose,
  ): Promise<void> {
    // Validate request
    const request: ResendVerificationRequest = this.validationService.validate(
      AuthValidation.RESEND_VERIFICATION,
      { purpose },
    ) as ResendVerificationRequest;

    // Find user
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('User tidak ditemukan', 404);
    }

    // Check if already verified (only for REGISTER purpose)
    if (
      request.purpose === VerificationPurpose.REGISTER &&
      user.verification_status !== 'UNVERIFIED'
    ) {
      throw new HttpException('Email sudah diverifikasi', 400);
    }

    // For CHANGE_EMAIL, get the pending new email from latest unverified token
    if (request.purpose === VerificationPurpose.CHANGE_EMAIL) {
      const latestChangeRequest =
        await this.prismaService.emailVerification.findFirst({
          where: {
            user_id: userId,
            purpose: VerificationPurpose.CHANGE_EMAIL,
            verified_at: null,
            is_revoked: false,
          },
          orderBy: {
            created_at: 'desc',
          },
        });

      if (!latestChangeRequest) {
        throw new HttpException(
          'Tidak ada permintaan perubahan email yang pending',
          400,
        );
      }

      // Resend to the new email that was requested
      await this.sendVerificationEmail(
        userId,
        latestChangeRequest.email,
        request.purpose,
      );
      return;
    }

    // For other purposes, send to current email
    await this.sendVerificationEmail(userId, user.email, request.purpose);
  }

  /**
   * Generate verification link based on purpose
   */
  private getVerificationLink(
    purpose: VerificationPurpose,
    token: string,
  ): string {
    const baseUrl = process.env.FRONTEND_URL;

    switch (purpose) {
      case VerificationPurpose.REGISTER:
      case VerificationPurpose.CHANGE_EMAIL:
        return `${baseUrl}/verify-email?token=${token}`;
      case VerificationPurpose.RESET_PASSWORD:
        return `${baseUrl}/reset-password?token=${token}`;
      default:
        return `${baseUrl}/verify?token=${token}`;
    }
  }

  /**
   * Get email content based on purpose
   */
  private getEmailContent(
    purpose: VerificationPurpose,
    verificationLink: string,
  ): { subject: string; html: string } {
    const appName = process.env.APP_NAME || 'Platform';

    switch (purpose) {
      case VerificationPurpose.REGISTER:
        return {
          subject: `Verifikasi Email Anda - ${appName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Selamat Datang di ${appName}!</h2>
              <p>Terima kasih telah mendaftar. Silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>
              <div style="margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Verifikasi Email
                </a>
              </div>
              <p>Atau salin dan tempel link berikut ke browser Anda:</p>
              <p style="word-break: break-all; color: #666;">${verificationLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Link ini akan kedaluwarsa dalam ${this.TOKEN_EXPIRY_HOURS} jam.
              </p>
            </div>
          `,
        };

      case VerificationPurpose.CHANGE_EMAIL:
        return {
          subject: `Konfirmasi Perubahan Email - ${appName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Konfirmasi Perubahan Email Anda</h2>
              <p>Anda meminta untuk mengubah alamat email. Silakan konfirmasi dengan mengklik tombol di bawah ini:</p>
              <div style="margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Konfirmasi Perubahan Email
                </a>
              </div>
              <p>Atau salin dan tempel link berikut ke browser Anda:</p>
              <p style="word-break: break-all; color: #666;">${verificationLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Link ini akan kedaluwarsa dalam ${this.TOKEN_EXPIRY_HOURS} jam.
              </p>
            </div>
          `,
        };

      case VerificationPurpose.RESET_PASSWORD:
        return {
          subject: `Reset Password Akun Anda - ${appName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Permintaan Reset Password</h2>
              <p>Kami menerima permintaan untuk <strong>mengatur ulang password</strong> akun Anda.</p>
              <p>Jika benar Anda yang melakukan permintaan ini, silakan klik tombol di bawah untuk melanjutkan proses reset password:</p>
              <div style="margin: 30px 0;">
                <a href="${verificationLink}"
                   style="background-color: #E53935; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p>Atau salin dan tempel link berikut ke browser Anda:</p>
              <p style="word-break: break-all; color: #666;">${verificationLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Link ini hanya berlaku selama ${this.TOKEN_EXPIRY_HOURS} jam.
                Jika Anda <strong>tidak pernah meminta reset password</strong>,
                silakan abaikan email ini — akun Anda tetap aman.
              </p>
            </div>
          `,
        };

      default:
        throw new HttpException('Tujuan verifikasi tidak valid', 400);
    }
  }
}
