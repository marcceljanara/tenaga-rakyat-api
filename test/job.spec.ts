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

describe('JobController', () => {
  let app: INestApplication;
  let logger: Logger;
  let testService: TestService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    }).compile();

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

  describe('POST /api/jobs - Create Job', () => {
    let providerCookie: string;
    let workerCookie: string;

    beforeEach(async () => {
      await testService.deleteAll();

      // Create provider (role_id = 2)
      await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      // Create worker (role_id = 1)
      await testService.addUser();
      const workerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });
      workerCookie = workerLogin.headers['set-cookie'];
    });

    it('should create job successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send({
          title: 'Frontend Developer Needed',
          description:
            'Looking for an experienced frontend developer with React skills for a 3-month project.',
          location: 'Jakarta',
          compensation_amount: 15000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Lowongan berhasil dibuat');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.title).toBe('Frontend Developer Needed');
      expect(response.body.data.status).toBe('OPEN');
      expect(response.body.data.compensation_amount).toBe(15000000);
      expect(response.body.data.location).toBe('Jakarta');
      expect(response.body.data.provider).toBeDefined();
    });

    it('should reject if title is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send({
          title: 'Dev',
          description: 'This is a valid description with more than 20 chars',
          compensation_amount: 5000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if description is too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send({
          title: 'Frontend Developer',
          description: 'Short desc',
          compensation_amount: 5000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if compensation is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', providerCookie)
        .send({
          title: 'Frontend Developer',
          description: 'Looking for an experienced frontend developer',
          compensation_amount: -1000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if user is worker', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .set('Cookie', workerCookie)
        .send({
          title: 'Frontend Developer Needed',
          description:
            'Looking for an experienced frontend developer with React skills',
          compensation_amount: 15000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/jobs')
        .send({
          title: 'Frontend Developer Needed',
          description:
            'Looking for an experienced frontend developer with React skills',
          compensation_amount: 15000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('PUT /api/jobs/:jobId - Update Job', () => {
    let providerCookie: string;
    let anotherProviderCookie: string;
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      // Create provider and job
      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      // Create another provider
      await testService.addAnotherProvider();
      const anotherProviderLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'another@email.com', password: '1234test' });
      anotherProviderCookie = anotherProviderLogin.headers['set-cookie'];
    });

    it('should update job successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie)
        .send({
          title: 'Senior Frontend Developer',
          compensation_amount: 20000000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Lowongan berhasil diperbarui');
      expect(response.body.data.title).toBe('Senior Frontend Developer');
      expect(response.body.data.compensation_amount).toBe(20000000);
    });

    it('should reject if job not found', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/jobs/99999')
        .set('Cookie', providerCookie)
        .send({
          title: 'Updated Title',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not job owner', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', anotherProviderCookie)
        .send({
          title: 'Hacked Title',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject update on cancelled job', async () => {
      // First cancel the job
      await testService.updateJobStatus(jobId, 'CANCELLED');

      // Try to update again
      const response = await request(app.getHttpServer())
        .put(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie)
        .send({
          title: 'Cannot Update',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/jobs/:jobId - Delete Job', () => {
    let providerCookie: string;
    let anotherProviderCookie: string;
    let jobId: number;
    let workerId: string;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

      const job = await testService.createJob(providerId);
      jobId = Number(job.id);

      await testService.addAnotherProvider();
      workerId = await testService.addUser();
      const anotherProviderLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'another@email.com', password: '1234test' });
      anotherProviderCookie = anotherProviderLogin.headers['set-cookie'];
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
      // First assign the job
      await testService.updateJobStatus(jobId, 'ASSIGNED', workerId);

      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject delete job with IN_PROGRESS status', async () => {
      // First set to in progress
      await testService.updateJobStatus(jobId, 'IN_PROGRESS', workerId);

      const response = await request(app.getHttpServer())
        .delete(`/api/jobs/${jobId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/jobs/:jobId - Get Job Detail', () => {
    let jobId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const job = await testService.createJob(providerId);
      jobId = Number(job.id);
    });

    it('should get job detail successfully (public)', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/jobs/${jobId}`,
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(jobId);
      expect(response.body.data.title).toBeDefined();
      expect(response.body.data.description).toBeDefined();
      expect(response.body.data.provider).toBeDefined();
    });

    it('should return 404 if job not found', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs/99999',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/jobs - Search Jobs', () => {
    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();

      // Create multiple jobs with different criteria
      await testService.createJobWithDetails(providerId, {
        title: 'Frontend Developer React',
        description: 'Looking for React developer with 2 years experience',
        location: 'Jakarta',
        compensation_amount: 10000000,
      });

      await testService.createJobWithDetails(providerId, {
        title: 'Backend Developer Node.js',
        description: 'Node.js developer needed for backend development',
        location: 'Bandung',
        compensation_amount: 12000000,
      });

      await testService.createJobWithDetails(providerId, {
        title: 'Fullstack Developer',
        description: 'Fullstack developer with React and Node.js experience',
        location: 'Jakarta',
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

    it('should search by location', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs?location=Jakarta',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.jobs.length).toBeGreaterThan(0);
      expect(
        response.body.data.jobs.every((job: any) => job.location === 'Jakarta'),
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
  });

  describe('GET /api/jobs/provider/history - Get Provider Job History', () => {
    let providerCookie: string;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

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

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/jobs/provider/history',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/jobs/provider/active - Get Active Jobs', () => {
    let providerCookie: string;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

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

  describe('GET /api/jobs/provider/completed - Get Completed Jobs', () => {
    let providerCookie: string;

    beforeEach(async () => {
      await testService.deleteAll();

      const providerId = await testService.addProvider();
      const providerLogin = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'provider@email.com', password: '1234test' });
      providerCookie = providerLogin.headers['set-cookie'];

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
});
