/* eslint-disable @typescript-eslint/no-unused-vars */
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

describe('AdminController', () => {
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

  // ============================================================
  // POST /api/admins — Create Admin
  // ============================================================
  describe('POST /api/admins', () => {
    let superAdminCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');
      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should create admin successfully as super admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Test Admin',
          phone_number: '081234567890',
          email: 'newadmin@admin.com',
          password: 'StrongPassword123!',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('Admin created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.email).toBe('newadmin@admin.com');
      expect(response.body.data.role).toBe('ADMIN');
      expect(response.body.data.verification_status).toBe('EMAIL_VERIFIED');
    });

    it('should reject if phone number is already registered', async () => {
      await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Admin One',
          phone_number: '081234567891',
          email: 'admin1@admin.com',
          password: 'StrongPassword123!',
        });

      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Admin Two',
          phone_number: '081234567891',
          email: 'admin2@admin.com',
          password: 'StrongPassword123!',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(409);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if email is already registered', async () => {
      // Create a user first using test service
      await testService.addAnotherUser();

      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Test Admin',
          phone_number: '081234567899',
          email: 'another@email.com',
          password: 'StrongPassword123!',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(409);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if input is invalid (short password)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Test Admin',
          phone_number: '081234567890',
          email: 'newadmin@admin.com',
          password: 'short',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if unauthenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .send({
          full_name: 'Test Admin',
          phone_number: '081234567890',
          email: 'newadmin@admin.com',
          password: 'StrongPassword123!',
        });

      expect(response.statusCode).toBe(401);
    });

    it('should reject if not a super admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', workerCookie)
        .send({
          full_name: 'Test Admin',
          phone_number: '081234567890',
          email: 'newadmin2@admin.com',
          password: 'StrongPassword123!',
        });

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // GET /api/admins — Get All Admins
  // ============================================================
  describe('GET /api/admins', () => {
    let superAdminCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');
      await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // Add a couple of admins
      for (let i = 1; i <= 3; i++) {
        await request(app.getHttpServer())
          .post('/api/admins')
          .set('Cookie', superAdminCookie)
          .send({
            full_name: `Admin ${i}`,
            phone_number: `081234000${i}`,
            email: `admin${i}@admin.com`,
            password: 'StrongPassword123!',
          });
      }
    });

    it('should get all admins with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admins?page=1&limit=2')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.admins).toBeDefined();
      expect(response.body.data.admins.length).toBe(2);
      expect(response.body.data.total).toBe(3);
    });

    it('should retrieve admins without explicit pagination params', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admins')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.admins.length).toBe(3);
    });

    it('should reject if unauthenticated', async () => {
      const response = await request(app.getHttpServer()).get('/api/admins');
      expect(response.statusCode).toBe(401);
    });

    it('should reject if not a super admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admins')
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // GET /api/admins/:adminId — Get Admin by ID
  // ============================================================
  describe('GET /api/admins/:adminId', () => {
    let superAdminCookie: string[];
    let workerCookie: string[];
    let targetAdminId: string;
    let normalUserId: string;

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');
      normalUserId = await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      const createResponse = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: `Admin Target`,
          phone_number: `0812340001`,
          email: `target@admin.com`,
          password: 'StrongPassword123!',
        });

      targetAdminId = createResponse.body.data.id;
    });

    it('should get admin details by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(targetAdminId);
      expect(response.body.data.email).toBe('target@admin.com');
    });

    it('should reject if admin does not exist', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admins/non-existent-id')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if queried user is not an admin', async () => {
      // The super admin queries a normal worker user through /api/admins/:id
      const response = await request(app.getHttpServer())
        .get(`/api/admins/${normalUserId}`)
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not a super admin', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/admins/${targetAdminId}`)
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // PUT /api/admins/:adminId — Update Admin
  // ============================================================
  describe('PUT /api/admins/:adminId', () => {
    let superAdminCookie: string[];
    let targetAdminId: string;
    let secondAdminId: string;

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      const res1 = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: `Admin Target`,
          phone_number: `0812340001`,
          email: `target@admin.com`,
          password: 'StrongPassword123!',
        });
      targetAdminId = res1.body.data.id;

      const res2 = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: `Admin Second`,
          phone_number: `0812340002`,
          email: `second@admin.com`,
          password: 'StrongPassword123!',
        });
      secondAdminId = res2.body.data.id;
    });

    it('should update admin details successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Updated Admin Name',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Admin updated successfully');
      expect(response.body.data.full_name).toBe('Updated Admin Name');
    });

    it('should reject if email is updated to an existing email', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie)
        .send({
          email: 'second@admin.com',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(409);
    });

    it('should reject if phone number is updated to an existing phone', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie)
        .send({
          phone_number: '0812340002',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(409);
    });

    it('should reject if admin does not exist', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/admins/non-existent-id')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Updated Name',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if querying a regular worker', async () => {
      const normalUserId = await testService.addUser();

      const response = await request(app.getHttpServer())
        .put(`/api/admins/${normalUserId}`)
        .set('Cookie', superAdminCookie)
        .send({
          full_name: 'Updated Name',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================
  // PUT /api/admins/:adminId/password — Change Admin Password
  // ============================================================
  describe('PUT /api/admins/:adminId/password', () => {
    let superAdminCookie: string[];
    let targetAdminId: string;

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      const res = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: `Admin Target`,
          phone_number: `0812340001`,
          email: `target@admin.com`,
          password: 'StrongPassword123!',
        });
      targetAdminId = res.body.data.id;
    });

    it('should change admin password successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admins/${targetAdminId}/password`)
        .set('Cookie', superAdminCookie)
        .send({
          new_password: 'NewStrongPassword1!',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Admin password changed successfully');

      // Attempt to login with the new password
      const loginAttempt = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'target@admin.com', password: 'NewStrongPassword1!' });

      expect(loginAttempt.statusCode).toBe(200);
    });

    it('should reject if new password is too short', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admins/${targetAdminId}/password`)
        .set('Cookie', superAdminCookie)
        .send({
          new_password: 'short',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================
  // DELETE /api/admins/:adminId — Delete Admin
  // ============================================================
  describe('DELETE /api/admins/:adminId', () => {
    let superAdminCookie: string[];
    let targetAdminId: string;

    beforeEach(async () => {
      await testService.deleteAll();
      superAdminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      const res = await request(app.getHttpServer())
        .post('/api/admins')
        .set('Cookie', superAdminCookie)
        .send({
          full_name: `Admin Target`,
          phone_number: `0812340001`,
          email: `target@admin.com`,
          password: 'StrongPassword123!',
        });
      targetAdminId = res.body.data.id;
    });

    it('should soft delete an admin and obscure data', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Admin deleted successfully');

      // Confirm admin is no longer accessible via default GET (is_deleted: false filter)
      const fetchAttempt = await request(app.getHttpServer())
        .get(`/api/admins/${targetAdminId}`)
        .set('Cookie', superAdminCookie);

      expect(fetchAttempt.statusCode).toBe(404);
    });

    it('should reject if admin does not exist', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/admins/non-existent-id')
        .set('Cookie', superAdminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });
  });
});
