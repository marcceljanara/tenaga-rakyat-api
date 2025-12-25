import { VerificationPurpose } from '@prisma/client';

export class VerifyEmailRequest {
  token: string;
}

export class VerifyEmailResponse {
  success: boolean;
  message: string;
  userId?: string;
}

export class ResendVerificationRequest {
  purpose: VerificationPurpose;
}

export class ResendVerificationResponse {
  message: string;
}

export class SendVerificationEmailRequest {
  email: string;
  purpose: VerificationPurpose;
}
