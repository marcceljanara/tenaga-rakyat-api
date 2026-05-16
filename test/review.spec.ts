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

describe('ReviewController', () => {
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

  async function loginAs(
    email: string,
    password = '1234test',
  ): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ email, password });
    return login.headers['set-cookie'] as unknown as string[];
  }

  describe('Review Flows', () => {
    let workerCookie: string[];
    let providerCookie: string[];
    let approvedJobId: number;
    let pendingJobId: number;
    let workerId: string;
    let providerId: string;

    beforeEach(async () => {
      await testService.deleteAll();

      workerId = await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      const approvedJobResult = await testService.createJob(providerId);
      approvedJobId = approvedJobResult.id;
      await testService.updateJobStatus(approvedJobId, 'APPROVED', workerId);

      const pendingJobResult = await testService.createJob(providerId);
      pendingJobId = pendingJobResult.id;
      // OPEN job, not approved
    });

    it('should allow provider to review worker on an APPROVED job', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', providerCookie)
        .send({
          job_id: approvedJobId,
          rating: 5,
          comment: 'Pekerja sangat bagus',
          is_anonymous: false,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.reviewee.id).toBe(workerId);
      expect(response.body.data.reviewer.id).toBe(providerId);
      expect(response.body.data.review_type).toBe('PROVIDER_TO_WORKER');
      expect(response.body.data.rating).toBe(5);
    });

    it('should allow worker to review provider on an APPROVED job', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 4,
          comment: 'Pemberi kerja baik',
          is_anonymous: false,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.reviewee.id).toBe(providerId);
      expect(response.body.data.reviewer.id).toBe(workerId);
      expect(response.body.data.review_type).toBe('WORKER_TO_PROVIDER');
      expect(response.body.data.rating).toBe(4);
    });

    it('should reject review if job is not APPROVED', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', providerCookie)
        .send({
          job_id: pendingJobId,
          rating: 5,
          comment: 'Gagal',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject multiple reviews from the same person for the same job', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 5,
          comment: 'Bagus',
        });

      const response = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 4,
          comment: 'Bagus lagi',
        });

      logger.debug(response.body);
      // Either 400 or 500/Database constraint, depending on specific service implementation.
      // E.g., if we handled unique constraint properly, it throws 400.
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should allow user to update their own review', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 3,
          comment: 'Biasa saja',
        });

      const reviewId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .put(`/api/reviews/${reviewId}`)
        .set('Cookie', workerCookie)
        .send({
          rating: 5,
          comment: 'Sangat bagus ternyata',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.comment).toBe('Sangat bagus ternyata');
    });

    it('should reject updating someone else review', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 5,
          comment: 'Biasa saja',
        });

      const reviewId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .put(`/api/reviews/${reviewId}`)
        .set('Cookie', providerCookie)
        .send({
          rating: 1,
          comment: 'Jelek',
        });

      expect(response.statusCode).toBe(403);
    });

    it('should retrieve a specific review by ID', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', providerCookie)
        .send({
          job_id: approvedJobId,
          rating: 5,
          comment: 'Pekerja hebat',
        });

      const reviewId = createResponse.body.data.id;

      const response = await request(app.getHttpServer())
        .get(`/api/reviews/${reviewId}`)
        .set('Cookie', workerCookie); // Any logged in user can view

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.id).toBe(reviewId);
    });

    it('should retrieve job reviews for a specific job', async () => {
      // Create both directions
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', providerCookie)
        .send({ job_id: approvedJobId, rating: 5, comment: 'Pekerja hebat' });

      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({
          job_id: approvedJobId,
          rating: 4,
          comment: 'Pemberi kerja baik',
        });

      const response = await request(app.getHttpServer())
        .get(`/api/reviews/job/${approvedJobId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it('should retrieve user reviews received (public profile)', async () => {
      await request(app.getHttpServer())
        .post('/api/reviews')
        .set('Cookie', workerCookie)
        .send({ job_id: approvedJobId, rating: 4, comment: 'Kerja keras' });

      // Retrieving the provider's reviews
      const response = await request(app.getHttpServer())
        .get(`/api/reviews/user/${providerId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.reviews).toBeDefined();
      expect(response.body.data.reviews.length).toBe(1);
      expect(response.body.data.total).toBe(1);
    });
  });
});
