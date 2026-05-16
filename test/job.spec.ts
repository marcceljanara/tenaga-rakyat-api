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

describe('JobController', () => {
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

  // ============================================================
  // HELPER: Login and return cookies
  // ============================================================
  async function loginAs(
    email: string,
    password = '1234test',
  ): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ email, password });
    return login.headers['set-cookie'] as unknown as string[];
  }

  // Valid job payload matching current schema
  function validJobPayload(overrides: Record<string, any> = {}) {
    return {
      title: 'Frontend Developer Needed',
      description:
        'Looking for an experienced frontend developer with React skills for a 3-month project.',
      location_label: 'Jakarta',
      job_latitude: -6.2,
      job_longitude: 106.816666,
      compensation_amount: 15000000,
      payment_method: 'CASH_OFFLINE',
      ...overrides,
    };
  }

  // ============================================================
  // POST /api/jobs — Create Job
  // ============================================================
  describe('POST /api/jobs - Create Job', () => {
    let providerCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      // Create provider (role_id = 2)
      await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      // Create worker (role_id = 1)
      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should create job successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload());

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Lowongan berhasil dibuat');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe('Frontend Developer Needed');
      expect(response.body.data.status).toBe('OPEN');
      expect(response.body.data.provider).toBeDefined();
    });

    it('should create job with address_detail', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(
          validJobPayload({
            address_detail: 'Jl. Sudirman No. 1, Lantai 5',
          }),
        );

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if title is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload({ title: 'Dev' }));

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if description is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload({ description: 'Short desc' }));

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if compensation is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload({ compensation_amount: -1000 }));

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if location_label is missing', async () => {
      const payload = validJobPayload();
      delete (payload as any).location_label;

      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if job_latitude is out of range', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload({ job_latitude: 999 }));

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if job_longitude is out of range', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send(validJobPayload({ job_longitude: 999 }));

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if user is worker', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', workerCookie)
        .send(validJobPayload());

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .send(validJobPayload());

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // PUT /api/jobs/:jobId — Update Job
  // ============================================================
  describe('PUT /api/jobs/:jobId - Update Job', () => {
    let providerCookie: string[];
    let anotherProviderCookie: string[];
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await testService.addAnotherProvider();
      anotherProviderCookie = await loginAs('another@email.com');
    });

    it('should update job successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie)
        .send({
          title: 'Senior Frontend Developer',
          location_label: 'Jakarta',
          compensation_amount: 20000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Lowongan berhasil diperbarui');
      expect(response.body.data.title).toBe('Senior Frontend Developer');
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/jobs/99999')
        .set('Cookie', providerCookie)
        .send({ title: 'Updated Title', location_label: 'Jakarta' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', anotherProviderCookie)
        .send({ title: 'Hacked Title', location_label: 'Jakarta' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject update on cancelled job', async () => {
      await testService.updateJobStatus(jobId, 'CANCELLED');

      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie)
        .send({ title: 'Cannot Update', location_label: 'Jakarta' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .send({ title: 'No Auth', location_label: 'Jakarta' });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // DELETE /api/jobs/:jobId — Delete Job
  // ============================================================
  describe('DELETE /api/jobs/:jobId - Delete Job', () => {
    let providerCookie: string[];
    let anotherProviderCookie: string[];
    let jobId: number;
    let workerId: string;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await testService.addAnotherProvider();
      workerId = await testService.addUser();
      anotherProviderCookie = await loginAs('another@email.com');
    });

    it('should delete job successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Lowongan berhasil dihapus');
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/jobs/99999')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', anotherProviderCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject delete job with ASSIGNED status', async () => {
      await testService.updateJobStatus(jobId, 'ASSIGNED', workerId);

      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject delete job with IN_PROGRESS status', async () => {
      await testService.updateJobStatus(jobId, 'IN_PROGRESS', workerId);

      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/jobs/${jobId}`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/jobs/:jobId/public — Get Job Detail Public
  // ============================================================
  describe('GET /api/jobs/:jobId/public - Get Job Detail Public', () => {
    let jobId: number;
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should get job detail successfully (public)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/public`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(jobId);
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.description).toBeDefined();
      expect(response.body.data.provider).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/99999/public')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/jobs/${jobId}/public`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/jobs/:jobId/private — Get Job Detail Private
  // ============================================================
  describe('GET /api/jobs/:jobId/private - Get Job Detail Private', () => {
    let jobId: number;
    let providerCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);
    });

    it('should get job detail as provider', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/private`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(jobId);
      expect(response.body.data.title).toBeDefined();
    });

    it('should get job detail as assigned worker', async () => {
      // Worker must be assigned to the job to see private details
      const workerId = await testService.addUser();
      await testService.updateJobStatus(jobId, 'ASSIGNED', workerId);
      workerCookie = await loginAs('test@email.com');

      const response = await request(app.getHttpServer())
        .get(`/api/jobs/${jobId}/private`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/99999/private')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/jobs/${jobId}/private`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/jobs — Search Jobs
  // ============================================================
  describe('GET /api/jobs - Search Jobs', () => {
    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();

      await testService.createJobWithDetails(providerId, {
        title: 'Frontend Developer React',
        description: 'Looking for React developer with 2 years experience',
        location_label: 'Jakarta',
        compensation_amount: 10000000,
      });

      await testService.createJobWithDetails(providerId, {
        title: 'Backend Developer Node.js',
        description: 'Node.js developer needed for backend development',
        location_label: 'Bandung',
        compensation_amount: 12000000,
      });

      await testService.createJobWithDetails(providerId, {
        title: 'Fullstack Developer',
        description: 'Fullstack developer with React and Node.js experience',
        location_label: 'Jakarta',
        compensation_amount: 15000000,
      });
    });

    it('should search jobs successfully', async () => {
      const response = await request(app.getHttpServer()).get('/api/jobs');

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs).toBeDefined();
      expect(response.body.data.total).toBeGreaterThan(0);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(10);
    });

    it('should search by keyword', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?keyword=React',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs.length).toBeGreaterThan(0);
      expect(
        response.body.data.jobs.some(
          (job: { title: string; description: string }) =>
            job.title.includes('React') || job.description.includes('React'),
        ),
      ).toBe(true);
    });

    it('should filter by compensation range', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?min_compensation=11000000&max_compensation=13000000',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(
        response.body.data.jobs.every(
          (job: any) =>
            job.compensation_amount >= 11000000 &&
            job.compensation_amount <= 13000000,
        ),
      ).toBe(true);
    });

    it('should sort by compensation_amount desc', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?sort_by=compensation_amount&sort_order=desc',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      interface Job {
        compensation_amount: number;
      }
      const compensations = response.body.data.jobs.map(
        (job: Job) => job.compensation_amount,
      );
      expect(compensations).toEqual([...compensations].sort((a, b) => b - a));
    });

    it('should paginate correctly', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?page=1&limit=2',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs.length).toBeLessThanOrEqual(2);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.limit).toBe(2);
    });

    it('should return empty list for non-matching keyword', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?keyword=NonExistentJobXYZ123',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs.length).toBe(0);
    });
  });

  // ============================================================
  // GET /api/jobs/provider/history — Provider Job History
  // ============================================================
  describe('GET /api/jobs/provider/history - Get Provider Job History', () => {
    let providerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      // Create multiple jobs with different statuses
      await testService.createJob(providerId);
      const job2 = await testService.createJob(providerId);

      // Update one job to COMPLETED
      await testService.updateJobStatus(Number(job2.id), 'COMPLETED');
    });

    it('should get all job history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/history')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs).toBeDefined();
      expect(response.body.data.total).toBeGreaterThan(0);
    });

    it('should filter by status OPEN', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/history?status=OPEN')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(
        response.body.data.jobs.every((job: any) => job.status === 'OPEN'),
      ).toBe(true);
    });

    it('should filter by status COMPLETED', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/history?status=COMPLETED')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(
        response.body.data.jobs.every((job: any) => job.status === 'COMPLETED'),
      ).toBe(true);
    });

    it('should paginate history results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/history?page=1&limit=1')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs.length).toBeLessThanOrEqual(1);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs/provider/history',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/jobs/provider/active — Active Jobs
  // ============================================================
  describe('GET /api/jobs/provider/active - Get Active Jobs', () => {
    let providerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      // Create jobs with different statuses
      await testService.createJob(providerId); // OPEN
      const job2 = await testService.createJob(providerId);
      await testService.updateJobStatus(Number(job2.id), 'IN_PROGRESS');
      const job3 = await testService.createJob(providerId);
      await testService.updateJobStatus(Number(job3.id), 'COMPLETED');
    });

    it('should get only active jobs (OPEN, ASSIGNED, IN_PROGRESS)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/active')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs).toBeDefined();
      expect(
        response.body.data.jobs.every(
          (job: any) =>
            job.status === 'OPEN' ||
            job.status === 'ASSIGNED' ||
            job.status === 'IN_PROGRESS',
        ),
      ).toBe(true);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs/provider/active',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/jobs/provider/completed — Completed Jobs
  // ============================================================
  describe('GET /api/jobs/provider/completed - Get Completed Jobs', () => {
    let providerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      // Create jobs
      await testService.createJob(providerId); // OPEN
      const job2 = await testService.createJob(providerId);
      await testService.updateJobStatus(Number(job2.id), 'COMPLETED');
      const job3 = await testService.createJob(providerId);
      await testService.updateJobStatus(Number(job3.id), 'CANCELLED');
    });

    it('should get only completed jobs (COMPLETED, CANCELLED)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/jobs/provider/completed')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs).toBeDefined();
      expect(
        response.body.data.jobs.every(
          (job: any) =>
            job.status === 'COMPLETED' || job.status === 'CANCELLED',
        ),
      ).toBe(true);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs/provider/completed',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // PATCH /api/jobs/:jobId/status/worker — Worker Update Status
  // ============================================================
  describe('PATCH /api/jobs/:jobId/status/worker - Worker Update Job Status', () => {
    let workerCookie: string[];
    let providerId: string;
    let workerId: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      // Create provider & job
      providerId = await testService.addProvider();
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      // Create worker
      workerId = await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // Assign job to worker
      await testService.updateJobStatus(jobId, 'ASSIGNED', workerId);
    });

    it('should allow worker to set job to IN_PROGRESS', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .set('Cookie', workerCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(
        'Status pekerjaan berhasil diperbarui',
      );
    });

    it('should allow worker to set job to COMPLETED', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .set('Cookie', workerCookie)
        .send({ status: 'COMPLETED' });

      expect(response.statusCode).toBe(200);
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/jobs/999999/status/worker')
        .set('Cookie', workerCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(response.statusCode).toBe(404);
    });

    it('should reject if job does not belong to worker', async () => {
      // Create another worker
      await testService.addAnotherUser();
      const otherCookie = await loginAs('another@email.com');

      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .set('Cookie', otherCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(response.statusCode).toBe(403);
    });

    it('should reject updating job that is already APPROVED', async () => {
      await testService.updateJobStatus(jobId, 'APPROVED', workerId);

      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .set('Cookie', workerCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .set('Cookie', workerCookie)
        .send({ status: 'INVALID_STATUS' });

      expect(response.statusCode).toBe(400);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/worker`)
        .send({ status: 'COMPLETED' });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // PATCH /api/jobs/:jobId/status/employer — Employer Update Status
  // ============================================================
  describe('PATCH /api/jobs/:jobId/status/employer - Employer Update Job Status', () => {
    let providerCookie: string[];
    let providerId: string;
    let workerId: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      providerId = await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      workerId = await testService.addUser();
    });

    it('should allow employer to cancel an OPEN job (no worker)', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/employer`)
        .set('Cookie', providerCookie)
        .send({ status: 'CANCELLED' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
    });

    it('should reject cancel if job has assigned worker', async () => {
      await testService.updateJobStatus(jobId, 'ASSIGNED', workerId);

      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/employer`)
        .set('Cookie', providerCookie)
        .send({ status: 'CANCELLED' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid status value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/employer`)
        .set('Cookie', providerCookie)
        .send({ status: 'INVALID' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .patch('/api/jobs/999999/status/employer')
        .set('Cookie', providerCookie)
        .send({ status: 'CANCELLED' });

      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      await testService.addAnotherProvider();
      const otherProviderCookie = await loginAs('another@email.com');

      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/employer`)
        .set('Cookie', otherProviderCookie)
        .send({ status: 'CANCELLED' });

      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/jobs/${jobId}/status/employer`)
        .send({ status: 'CANCELLED' });

      expect(response.statusCode).toBe(401);
    });
  });
});
