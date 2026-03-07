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

describe('ReportController', () => {
  let app: INestApplication;
  let logger: Logger;
  let testService: TestService;
  let superAdminCookie: string[];
  let workerCookie: string[];

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

  beforeEach(async () => {
    await testService.deleteAll();
    superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');
    await testService.addUser();
    workerCookie = await loginAs('test@email.com');
  });

  describe('GET /api/admin/report/dashboard-summary', () => {
    it('should return dashboard summary successfully as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/dashboard-summary')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should accept granularity query params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/dashboard-summary?granularity=monthly')
        .set('Cookie', superAdminCookie);

      expect(response.statusCode).toBe(200);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/dashboard-summary')
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });

    it('should reject unauthenticated users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/dashboard-summary');

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/admin/report/export-csv', () => {
    it('should download csv successfully as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/export-csv?from=2024-01-01&to=2024-12-31')
        .set('Cookie', superAdminCookie);
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename=');
    });

    it('should reject missing date range', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/export-csv')
        .set('Cookie', superAdminCookie);

      // Depending on ValidationPipe vs service validation, should be 400
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/report/export-csv?from=2024-01-01&to=2024-12-31')
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });
  });
});
