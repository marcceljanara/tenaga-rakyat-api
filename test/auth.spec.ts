/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { TestModule } from './test.module';
import { TestService } from './test.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EmailSenderService } from '../src/modules/auth/email-sender.service';
import { PrismaService } from '../src/common/prisma.service';
import { TokenUtil } from '../src/common/token.util';

describe('AuthController', () => {
  let app: INestApplication;
  let logger: Logger;
  let testService: TestService;
  let prismaService: PrismaService;

  const mockEmailSender = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendEmailSync: jest.fn().mockResolvedValue(undefined),
    processEmail: jest.fn().mockResolvedValue(undefined),
    sendBulkEmails: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    })
      .overrideProvider(EmailSenderService)
      .useValue(mockEmailSender)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    logger = app.get(WINSTON_MODULE_PROVIDER);
    testService = app.get(TestService);
    prismaService = app.get(PrismaService);
  });

  afterAll(async () => {
    await testService.disconnect();
    await app.close();
  });

  async function loginAs(email: string, password = '1234test'): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ email, password });
    return login.headers['set-cookie'] as unknown as string[];
  }

  // Helper to extract token from mock
  function extractTokenFromLastEmail(): string | null {
    if (mockEmailSender.sendEmail.mock.calls.length === 0) return null;
    const lastCall = mockEmailSender.sendEmail.mock.calls[mockEmailSender.sendEmail.mock.calls.length - 1][0];
    const html = lastCall.html;
    const match = html.match(/token=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  beforeEach(async () => {
    await prismaService.emailVerification.deleteMany();
    await testService.deleteAll();
    mockEmailSender.sendEmail.mockClear();
  });

  describe('POST /api/auth/resend-verification', () => {
    let unverifiedUserId: string;
    let cookie: string[];

    beforeEach(async () => {
      unverifiedUserId = await testService.addUser();
      // Force change status to UNVERIFIED for testing REGISTRATION resend
      await prismaService.user.update({
        where: { id: unverifiedUserId },
        data: { verification_status: 'UNVERIFIED' },
      });
      cookie = await loginAs('test@email.com');
    });

    it('should successfully resend registration verification', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .set('Cookie', cookie)
        .send({ purpose: 'REGISTER' });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.message).toBe('Email verifikasi berhasil dikirim');
      expect(mockEmailSender.sendEmail).toHaveBeenCalledTimes(1);

      // Verify the new active token exists
      const tokenRecord = await prismaService.emailVerification.findFirst({
        where: { user_id: unverifiedUserId, purpose: 'REGISTER', is_revoked: false },
      });
      expect(tokenRecord).not.toBeNull();
    });

    it('should reject if user is already verified (for REGISTER purpose)', async () => {
      await prismaService.user.update({
        where: { id: unverifiedUserId },
        data: { verification_status: 'EMAIL_VERIFIED' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .set('Cookie', cookie)
        .send({ purpose: 'REGISTER' });

      expect(response.statusCode).toBe(400);
    });

    it('should successfully resend CHANGE_EMAIL verification when pending', async () => {
      // First create a pending change email token
      await request(app.getHttpServer())
        .post('/api/auth/change-email')
        .set('Cookie', cookie)
        .send({ newEmail: 'newmail@mail.com' });
      mockEmailSender.sendEmail.mockClear();

      const response = await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .set('Cookie', cookie)
        .send({ purpose: 'CHANGE_EMAIL' });

      expect(response.statusCode).toBe(200);
      expect(mockEmailSender.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mockEmailSender.sendEmail.mock.calls[0][0];
      expect(emailCall.to).toBe('newmail@mail.com');
    });

    it('should reject CHANGE_EMAIL resend if no pending request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .set('Cookie', cookie)
        .send({ purpose: 'CHANGE_EMAIL' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toContain('Tidak ada permintaan perubahan email yang pending');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    let unverifiedUserId: string;

    beforeEach(async () => {
      unverifiedUserId = await testService.addUser();
      await prismaService.user.update({
        where: { id: unverifiedUserId },
        data: { verification_status: 'UNVERIFIED' },
      });
    });

    it('should verify email for REGISTER purpose successfully', async () => {
      // Create a valid token via generation
      const { token, hash } = TokenUtil.generateTokenWithHash();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prismaService.emailVerification.create({
        data: {
          user_id: unverifiedUserId,
          email: 'test@email.com',
          token_hash: hash,
          purpose: 'REGISTER',
          expires_at: expiresAt,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.success).toBe(true);

      const user = await prismaService.user.findUnique({ where: { id: unverifiedUserId } });
      expect(user?.verification_status).toBe('EMAIL_VERIFIED');
    });

    it('should verify email for CHANGE_EMAIL purpose successfully', async () => {
      const { token, hash } = TokenUtil.generateTokenWithHash();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await prismaService.emailVerification.create({
        data: {
          user_id: unverifiedUserId,
          email: 'mynewmail@mail.com',
          token_hash: hash,
          purpose: 'CHANGE_EMAIL',
          expires_at: expiresAt,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.statusCode).toBe(200);

      const user = await prismaService.user.findUnique({ where: { id: unverifiedUserId } });
      expect(user?.email).toBe('mynewmail@mail.com');
      expect(user?.verification_status).toBe('EMAIL_VERIFIED');
    });

    it('should reject invalid or mismatched tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: '1234invalid' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toContain('Token verifikasi tidak valid atau sudah kedaluwarsa');
    });

    it('should reject expired tokens', async () => {
      const { token, hash } = TokenUtil.generateTokenWithHash();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() - 1); // Expired

      await prismaService.emailVerification.create({
        data: {
          user_id: unverifiedUserId,
          email: 'test@email.com',
          token_hash: hash,
          purpose: 'REGISTER',
          expires_at: expiresAt,
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toContain('Token verifikasi sudah kedaluwarsa');
    });
  });

  describe('POST /api/auth/forgot-password & reset-password', () => {
    let unverifiedUserId: string;

    beforeEach(async () => {
      unverifiedUserId = await testService.addUser();
    });

    it('should send an email reset link on forgot-password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'test@email.com' });

      expect(response.statusCode).toBe(200);
      expect(mockEmailSender.sendEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 200 silently if account does not exist (for security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@email.com' });

      expect(response.statusCode).toBe(200);
      expect(mockEmailSender.sendEmail).not.toHaveBeenCalled();
    });

    it('should successfully reset password with valid token', async () => {
      // 1. Request forgot password to generate token
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'test@email.com' });

      // 2. Extract generated token
      const token = extractTokenFromLastEmail();
      expect(token).not.toBeNull();

      // 3. Submit reset password
      const resetResponse = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: token,
          newPassword: 'newStrongPassword1!',
          confirmNewPassword: 'newStrongPassword1!',
        });

      expect(resetResponse.statusCode).toBe(200);

      // 4. Verify login with NEW password
      const loginRes = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: 'newStrongPassword1!' });

      expect(loginRes.statusCode).toBe(200);
    });

    it('should reject reset password if passwords do not match', async () => {
      const resetResponse = await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({
          token: 'dummy-token',
          newPassword: 'newStrongPassword1!',
          confirmNewPassword: 'newStrongPassword1!2',
        });

      expect(resetResponse.statusCode).toBe(400);
      expect(resetResponse.body.errors).toContain('Password baru dan konfirmasi tidak cocok');
    });
  });

  describe('POST /api/auth/change-email', () => {
    let cookie: string[];

    beforeEach(async () => {
      await testService.addUser();
      cookie = await loginAs('test@email.com');
    });

    it('should successfully create change email request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/change-email')
        .set('Cookie', cookie)
        .send({ newEmail: 'mynewmail@mail.com' });

      expect(response.statusCode).toBe(200);
      expect(mockEmailSender.sendEmail).toHaveBeenCalledTimes(1);

      const emailCall = mockEmailSender.sendEmail.mock.calls[0][0];
      expect(emailCall.to).toBe('mynewmail@mail.com');
    });

    it('should reject if new email is already registered', async () => {
      // create another user
      await testService.addAnotherUser(); // this registers 'another@email.com'

      const response = await request(app.getHttpServer())
        .post('/api/auth/change-email')
        .set('Cookie', cookie)
        .send({ newEmail: 'another@email.com' });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toContain('Email sudah digunakan');
    });
  });
});
