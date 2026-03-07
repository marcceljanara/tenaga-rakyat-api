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

describe('UserManagementController', () => {
  let app: INestApplication;
  let logger: Logger;
  let testService: TestService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    })
      .overrideProvider(EmailSenderService)
      .useValue({
        sendEmail: jest.fn().mockResolvedValue(undefined),
        sendEmailSync: jest.fn().mockResolvedValue(undefined),
        processEmail: jest.fn().mockResolvedValue(undefined),
        sendBulkEmails: jest.fn().mockResolvedValue(undefined),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    logger = app.get(WINSTON_MODULE_PROVIDER);
    testService = app.get(TestService);
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

  describe('Admin Actions', () => {
    let superAdminCookie: string[];
    let workerCookie: string[];
    let targetUserId: string;

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      targetUserId = await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // adding provider to have some stats
      await testService.addProvider();
    });

    it('should retrieve user stats for admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user-management/stats')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.total_users).toBeGreaterThan(0);
      expect(response.body.data.unverified_users).toBeGreaterThan(0);
    });

    it('should get all users with filtering', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user-management?page=1&limit=5&role=Worker')
        .set('Cookie', superAdminCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should get user by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/user-management/${targetUserId}`)
        .set('Cookie', superAdminCookie);

      expect(response.statusCode).toBe(200);
      expect(response.body.data.id).toBe(targetUserId);
      expect(response.body.data.wallet).toBeDefined();
    });

    it('should update user verification status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/user-management/${targetUserId}/verification`)
        .set('Cookie', superAdminCookie)
        .send({ verification_status: 'FULL_VERIFIED' });

      expect(response.statusCode).toBe(200);
      expect(response.body.data.verification_status).toBe('FULL_VERIFIED');
    });

    it('should suspend and activate user wallet', async () => {
      // Suspend
      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/user-management/${targetUserId}/wallet/suspend`)
        .set('Cookie', superAdminCookie)
        .send({ admin_note: 'Suspicious activity' });

      expect(suspendRes.statusCode).toBe(200);

      // Verify suspended
      const userRes = await request(app.getHttpServer())
        .get(`/api/user-management/${targetUserId}`)
        .set('Cookie', superAdminCookie);

      expect(userRes.body.data.wallet.status).toBe('SUSPENDED');

      // Activate
      const activateRes = await request(app.getHttpServer())
        .patch(`/api/user-management/${targetUserId}/wallet/activate`)
        .set('Cookie', superAdminCookie);

      expect(activateRes.statusCode).toBe(200);
    });

    it('should suspend and activate user account', async () => {
      // Suspend account
      const suspendRes = await request(app.getHttpServer())
        .patch(`/api/user-management/${targetUserId}/account/suspend`)
        .set('Cookie', superAdminCookie);

      expect(suspendRes.statusCode).toBe(200);

      const userRes = await request(app.getHttpServer())
        .get(`/api/user-management/${targetUserId}`)
        .set('Cookie', superAdminCookie);

      expect(userRes.body.data.is_suspended).toBe(true);

      // Activate account
      const activateRes = await request(app.getHttpServer())
        .patch(`/api/user-management/${targetUserId}/account/activate`)
        .set('Cookie', superAdminCookie);

      expect(activateRes.statusCode).toBe(200);
    });

    it('should delete user', async () => {
      const deleteRes = await request(app.getHttpServer())
        .delete(`/api/user-management/${targetUserId}`)
        .set('Cookie', superAdminCookie);

      expect(deleteRes.statusCode).toBe(200);

      // It should now return 404 because is_deleted=true
      const getRes = await request(app.getHttpServer())
        .get(`/api/user-management/${targetUserId}`)
        .set('Cookie', superAdminCookie);

      expect(getRes.statusCode).toBe(404);
    });

    it('should block normal worker from using user-management APIs', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user-management/stats')
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });
  });
});
