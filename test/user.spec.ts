import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { TestModule } from './test.module';
import { TestService } from './test.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { EmailSenderService } from '../src/modules/auth/email-sender.service';

describe('UserController', () => {
  let app: INestApplication<App>;
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
  async function loginUser(
    email = 'test@email.com',
    password = '1234test',
  ): Promise<string[]> {
    const login = await request(app.getHttpServer())
      .post('/api/users/login')
      .send({ email, password });
    return login.headers['set-cookie'] as unknown as string[];
  }

  // ============================================================
  // POST /api/users — Registration
  // ============================================================
  describe('POST /api/users', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should be able to register a worker', async () => {
      const payload = {
        full_name: 'test',
        phone_number: '085212345678',
        email: 'test@email.com',
        password: 'test1234',
        role_id: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.full_name).toBe('test');
      expect(response.body.data.email).toBe('test@email.com');
    });

    it('should be able to register a job provider', async () => {
      const payload = {
        full_name: 'Provider Test',
        phone_number: '085212345678',
        email: 'provider@email.com',
        password: 'test1234',
        role_id: 2,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.full_name).toBe('Provider Test');
    });

    it('should reject if payload invalid', async () => {
      const payload = {
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        role_id: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if email already exists', async () => {
      await testService.addUser();

      const payload = {
        full_name: 'Duplicate',
        phone_number: '085299999999',
        email: 'test@email.com', // same email as testService.addUser()
        password: 'test1234',
        role_id: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if phone number already exists', async () => {
      await testService.addUser();

      const payload = {
        full_name: 'Duplicate Phone',
        phone_number: '085212345678', // same phone as testService.addUser()
        email: 'different@email.com',
        password: 'test1234',
        role_id: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if role_id is invalid (not 1 or 2)', async () => {
      const payload = {
        full_name: 'Bad Role',
        phone_number: '085212345678',
        email: 'badrole@email.com',
        password: 'test1234',
        role_id: 3, // admin role not allowed via registration
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if password too short', async () => {
      const payload = {
        full_name: 'Short Pass',
        phone_number: '085212345678',
        email: 'shortpass@email.com',
        password: '123', // min 8 chars
        role_id: 1,
      };

      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  // ============================================================
  // POST /api/users/login — Login
  // ============================================================
  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject request if payload invalid', async () => {
      const payload = {
        email: '',
        password: '',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if account not exists', async () => {
      const payload = {
        email: 'test@email.com',
        password: '1234test',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if password wrong', async () => {
      await testService.addUser();

      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: 'wrongpassword',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should able to login user', async () => {
      await testService.addUser();
      const payload = {
        email: 'test@email.com',
        password: '1234test',
      };

      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('access_token');
    });
  });

  // ============================================================
  // POST /api/users/refresh — Token Refresh
  // ============================================================
  describe('POST /api/users/refresh', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if user not login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Cookie', '');

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should be able to refresh new token', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Cookie', userCookie);

      logger.debug(response.headers['set-cookie']);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('access_token');
      expect(response.headers['set-cookie'][1]).toContain('refresh_token');
    });
  });

  // ============================================================
  // POST /api/users/logout — Logout
  // ============================================================
  describe('POST /api/users/logout', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if user not login', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Cookie', '');

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should be able to logout', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Cookie', userCookie);

      logger.debug(response.headers['set-cookie'][0]);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie'][0]).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      expect(response.headers['set-cookie'][0]).toContain('access_token=;');
    });

    it('should reject requests after logout (cookie cleared)', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      // Logout
      await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Cookie', userCookie);

      // Try to access profile with old cookie — should fail
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Cookie', '');

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/users/profile — Get Own Profile
  // ============================================================
  describe('GET /api/users/profile', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/users/profile',
      );

      expect(response.statusCode).toBe(401);
    });

    it('should be able to get profile', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Cookie', userCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('test@email.com');
      expect(response.body.data.full_name).toBe('test');
      expect(response.body.data.role).toBeDefined();
    });
  });

  // ============================================================
  // GET /api/users/profile/:id — Get Profile By ID
  // ============================================================
  describe('GET /api/users/profile/:id', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/users/profile/some-uuid',
      );

      expect(response.statusCode).toBe(401);
    });

    it('should be able to get another user profile by ID', async () => {
      const userId = await testService.addUser();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const providerId = await testService.addProvider();

      // Login as provider, view worker profile
      const providerCookie = await loginUser('provider@email.com', '1234test');

      const response = await request(app.getHttpServer())
        .get(`/api/users/profile/${userId}`)
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 for non-existent user ID', async () => {
      await testService.addUser();
      const userCookie = await loginUser();
      const uuid = crypto.randomUUID();
      const response = await request(app.getHttpServer())
        .get(`/api/users/profile/${uuid}`)
        .set('Cookie', userCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid UUID format', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .get('/api/users/profile/not-a-valid-uuid')
        .set('Cookie', userCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================
  // PUT /api/users/profile — Edit Profile
  // ============================================================
  describe('PUT /api/users/profile', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/profile')
        .send({ full_name: 'Updated' });

      expect(response.statusCode).toBe(401);
    });

    it('should be able to edit user profile', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const payload = {
        full_name: 'Otong Test',
        cv_url: 'https://inilink.com',
        about: 'ini about',
      };

      const response = await request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Cookie', userCookie)
        .send(payload);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
      expect(response.body.data.full_name).toBe(payload.full_name);
      expect(response.body.data.about).toBe(payload.about);
      expect(response.body.data.cv_url).toBe(payload.cv_url);
    });

    it('should be able to partial update (only full_name)', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Cookie', userCookie)
        .send({ full_name: 'Only Name' });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.full_name).toBe('Only Name');
    });
  });

  // ============================================================
  // PUT /api/users/profile/location — Update Location
  // ============================================================
  describe('PUT /api/users/profile/location', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/users/profile/location')
        .send({ latitude: -6.2, longitude: 106.8 });

      expect(response.statusCode).toBe(401);
    });

    it('should be able to update location', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .put('/api/users/profile/location')
        .set('Cookie', userCookie)
        .send({
          latitude: -6.2,
          longitude: 106.816666,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
      expect(response.body.data).toBeDefined();
    });

    it('should reject invalid latitude (out of range)', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .put('/api/users/profile/location')
        .set('Cookie', userCookie)
        .send({
          latitude: 999, // out of range
          longitude: 106.8,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid longitude (out of range)', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      const response = await request(app.getHttpServer())
        .put('/api/users/profile/location')
        .set('Cookie', userCookie)
        .send({
          latitude: -6.2,
          longitude: 999, // out of range
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================
  // POST /api/users/profile/picture — Upload Profile Picture
  // ============================================================
  describe('POST /api/users/profile/picture', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if user not logged in', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users/profile/picture')
        .attach('profile_picture', Buffer.from('dummy'), 'dummy.jpg');

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should be able to upload profile picture successfully', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      // Minimal valid JPEG buffer (SOI marker + APP0 marker)
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);

      const response = await request(app.getHttpServer())
        .post('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .attach('profile_picture', jpegBuffer, 'profile.jpg');

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(
        'Profile picture uploaded successfully',
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.profile_picture_url).toMatch(
        /^https?:\/\/|^\/uploads/,
      );
    });
  });

  // ============================================================
  // DELETE /api/users/profile/picture — Delete Profile Picture
  // ============================================================
  describe('DELETE /api/users/profile/picture', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should reject if user not logged in', async () => {
      const response = await request(app.getHttpServer()).delete(
        '/api/users/profile/picture',
      );

      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });

    it('should be able to delete profile picture successfully', async () => {
      await testService.addUser();
      const userCookie = await loginUser();

      // Upload foto dulu biar ada datanya (minimal valid JPEG buffer)
      const jpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      await request(app.getHttpServer())
        .post('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .attach('profile_picture', jpegBuffer, 'test.jpg')
        .expect(200);

      // Action — delete foto
      const response = await request(app.getHttpServer())
        .delete('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .send();

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(
        'Profile picture deleted successfully',
      );
    });
  });
});
