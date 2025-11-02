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

describe('ApplicationController', () => {
  let app: INestApplication;
  let logger: Logger;
  let testService: TestService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    logger = app.get(WINSTON_MODULE_PROVIDER);
    testService = app.get(TestService);
  });

  describe('POST /api/jobs/:jobId/applications - Apply Job', () => {
    let workerCookie: string;
    let providerCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      // Create worker (role_id = 1)
      await testService.addUser(); // default is worker
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      // Create provider (role_id = 2)
      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      // Create job
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);
    });

    it('should apply to job successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter:
            'I am very interested in this position and have relevant experience.',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Lamaran berhasil dikirim');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.job_id).toBe(jobId);
      expect(response.body.data.status).toBe('PENDING');
      expect(response.body.data.cover_letter).toBe(
        'I am very interested in this position and have relevant experience.',
      );
    });

    it('should reject if cover letter too short', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'Short',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if cover letter too long', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'a'.repeat(5001),
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs/99999/applications')
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am very interested in this position.',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
      expect(response.body.errors).toBe('Job tidak ditemukan');
    });

    it('should reject if already applied', async () => {
      // First application
      await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am very interested in this position.',
        });

      // Second application
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'Applying again.',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBe('Anda sudah melamar ke lowongan ini');
    });

    it('should reject if provider tries to apply to own job', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', providerCookie)
        .send({
          cover_letter: 'Applying to my own job.',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBe(
        'Anda tidak dapat melamar ke lowongan sendiri',
      );
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .send({
          cover_letter: 'I am very interested in this position.',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/jobs/:jobId/applications - Get Job Applications', () => {
    let workerCookie: string;
    let providerCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      // Create worker
      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      // Create provider
      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      // Create job and application
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });
    });

    it('should get job applications successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.applications).toBeDefined();
      expect(response.body.data.applications.length).toBeGreaterThan(0);
      expect(response.body.data.total).toBeGreaterThan(0);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications?status=PENDING`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(
        response.body.data.applications.every(
          (app: any) => app.status === 'PENDING',
        ),
      ).toBe(true);
    });

    it('should paginate correctly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications?page=1&limit=5`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });

    it('should sort by created_at desc', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/api/jobs/${jobId}/applications?sort_by=created_at&sort_order=desc`,
        )
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/99999/applications')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/jobs/${jobId}/applications`,
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/jobs/:jobId/applications/statistics - Get Statistics', () => {
    let providerCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);
    });

    it('should get statistics successfully', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications/statistics`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.job_id).toBe(jobId);
      expect(response.body.data.total_applications).toBeDefined();
      expect(response.body.data.pending_count).toBeDefined();
      expect(response.body.data.accepted_count).toBeDefined();
      expect(response.body.data.rejected_count).toBeDefined();
      expect(response.body.data.under_review_count).toBeDefined();
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/99999/applications/statistics')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      const workerCookie = workerLogin.headers['set-cookie'];

      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/applications/statistics`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /api/users/applications - Get User Applications', () => {
    let workerCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      const providerId = await testService.addProvider();
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });
    });

    it('should get user applications successfully', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/applications')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.applications).toBeDefined();
      expect(response.body.data.applications.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/applications?status=PENDING')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
    });

    it('should paginate correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/applications?page=1&limit=5')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(5);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/users/applications',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/users/applications/search - Search User Applications', () => {
    let workerCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      const providerId = await testService.addProvider();
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });
    });

    it('should search applications by keyword', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/applications/search?keyword=developer')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should search with multiple filters', async () => {
      const response = await request(app.getHttpServer())
        .get(
          '/api/users/applications/search?keyword=developer&status=PENDING&page=1&limit=10',
        )
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
    });

    it('should return empty result for non-matching keyword', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/users/applications/search?keyword=nonexistent')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.applications.length).toBe(0);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/users/applications/search?keyword=developer',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/applications/:applicationId - Update Application Status', () => {
    let workerCookie: string;
    let providerCookie: string;
    let jobId: number;
    let applicationId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      const application = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });

      applicationId = application.body.data.id;
    });

    it('should accept application successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie)
        .send({
          status: 'ACCEPTED',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Pelamar berhasil diterima');
      expect(response.body.data.status).toBe('ACCEPTED');
    });

    it('should reject application successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie)
        .send({
          status: 'REJECTED',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Pelamar berhasil ditolak');
      expect(response.body.data.status).toBe('REJECTED');
    });

    it('should reject invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie)
        .send({
          status: 'INVALID_STATUS',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if application not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/applications/99999')
        .set('Cookie', providerCookie)
        .send({
          status: 'ACCEPTED',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .set('Cookie', workerCookie)
        .send({
          status: 'ACCEPTED',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .send({
          status: 'ACCEPTED',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/applications/:applicationId - Cancel Application', () => {
    let workerCookie: string;
    let providerCookie: string;
    let jobId: number;
    let applicationId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      const application = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });

      applicationId = application.body.data.id;
    });

    it('should cancel application successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/applications/${applicationId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Lamaran berhasil dibatalkan');
    });

    it('should reject if application not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/applications/99999')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not application owner', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if application already processed', async () => {
      // Accept the application first
      await request(app.getHttpServer())
        .patch(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie)
        .send({
          status: 'ACCEPTED',
        });

      // Try to cancel
      const response = await request(app.getHttpServer())
        .delete(`/api/applications/${applicationId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBe(
        'Lamaran yang sudah diproses tidak dapat dibatalkan',
      );
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/applications/${applicationId}`,
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/applications/:applicationId - Get Application Detail', () => {
    let workerCookie: string;
    let providerCookie: string;
    let anotherWorkerCookie: string;
    let jobId: number;
    let applicationId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      // Create another worker
      await testService.addAnotherUser();
      const anotherWorkerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'another@email.com', password: '1234test' });
      anotherWorkerCookie = anotherWorkerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      const application = await request(app.getHttpServer())
        .post(`/api/jobs/${jobId}/applications`)
        .set('Cookie', workerCookie)
        .send({
          cover_letter: 'I am interested in this job.',
        });

      applicationId = application.body.data.id;
    });

    it('should get application detail as worker', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(applicationId);
      expect(response.body.data.cover_letter).toBeDefined();
      expect(response.body.data.job).toBeDefined();
    });

    it('should get application detail as provider', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.worker).toBeDefined();
    });

    it('should reject if application not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/applications/99999')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if unauthorized user', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/applications/${applicationId}`)
        .set('Cookie', anotherWorkerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
      expect(response.body.errors).toBe(
        'Anda tidak memiliki akses ke lamaran ini',
      );
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/applications/${applicationId}`,
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });
});
