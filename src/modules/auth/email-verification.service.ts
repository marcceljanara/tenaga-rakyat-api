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
} from '../../model/auth.model';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly TOKEN_EXPIRY_HOURS = 24;

  constructor(
    private prismaService: PrismaService,
    private emailSenderService: EmailSenderService,
    private validationService: ValidationService,
  ) {}

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
        email: email,
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
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

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
      `Email verified successfully for user: ${verification.user_id}`,
    );

    return {
      success: true,
      message: 'Email berhasil diverifikasi',
      userId: verification.user_id,
    };
  }

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

    // Check if already verified
    if (
      request.purpose === VerificationPurpose.REGISTER &&
      user.verification_status !== 'UNVERIFIED'
    ) {
      throw new HttpException('Email sudah diverifikasi', 400);
    }

    // Send new verification email
    await this.sendVerificationEmail(userId, user.email, request.purpose);
  }

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

      case VerificationPurpose.LOGIN:
        return {
          subject: `Verifikasi Login - ${appName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Verifikasi Login Anda</h2>
              <p>Kami mendeteksi upaya login ke akun Anda. Silakan verifikasi dengan mengklik tombol di bawah ini:</p>
              <div style="margin: 30px 0;">
                <a href="${verificationLink}" 
                   style="background-color: #FF9800; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Verifikasi Login
                </a>
              </div>
              <p>Atau salin dan tempel link berikut ke browser Anda:</p>
              <p style="word-break: break-all; color: #666;">${verificationLink}</p>
              <p style="color: #999; font-size: 12px; margin-top: 30px;">
                Link ini akan kedaluwarsa dalam ${this.TOKEN_EXPIRY_HOURS} jam. Jika Anda tidak mencoba login, abaikan email ini.
              </p>
            </div>
          `,
        };

      default:
        throw new HttpException('Tujuan verifikasi tidak valid', 400);
    }
  }
}
