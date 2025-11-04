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

describe('UserController', () => {
  let app: INestApplication<App>;
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

  describe('POST /api/users', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });
    it('should be able to register', async () => {
      // Arrange
      const payload = {
        full_name: 'test',
        phone_number: '085212345678',
        email: 'test@email.com',
        password: 'test1234',
        role_id: 1,
      };

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.full_name).toBe('test');
    });

    it('should reject if payload invalid', async () => {
      // Arrange
      const payload = {
        full_name: '',
        phone_number: '',
        email: '',
        password: '',
        role_id: 1,
      };

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(payload);

      // Assert
      logger.debug(response);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/users/login', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });
    it('should reject request if payload invalid', async () => {
      // Arrange
      const payload = {
        email: '',
        password: '',
      };

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject if account not exists', async () => {
      // Arrange
      const payload = {
        email: 'test@email.com',
        password: '1234test',
      };

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(401);
      expect(response.body.errors).toBeDefined();
    });
    it('should able to login user', async () => {
      // Arrange
      await testService.addUser();
      const payload = {
        email: 'test@email.com',
        password: '1234test',
      };

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users/login')
        .send(payload);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('access_token');
    });
  });

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
      // Arrange
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users/refresh')
        .set('Cookie', userCookie);

      // Assert
      logger.debug(response.headers['set-cookie']);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
      expect(response.headers['set-cookie'][0]).toContain('access_token');
      expect(response.headers['set-cookie'][1]).toContain('refresh_token');
    });
  });

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
      // Arrange
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      // Action
      const response = await request(app.getHttpServer())
        .post('/api/users/logout')
        .set('Cookie', userCookie);

      // Assert
      logger.debug(response.headers['set-cookie'][0]);
      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie'][0]).toContain(
        'Expires=Thu, 01 Jan 1970',
      );
      expect(response.headers['set-cookie'][0]).toContain('access_token=;');
    });
  });

  describe('GET /api/users/profile', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should be able to get profile', async () => {
      // Arrange
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      // Action
      const response = await request(app.getHttpServer())
        .get('/api/users/profile')
        .set('Cookie', userCookie);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe('test@email.com');
    });
  });
  describe('PUT /api/users/profile', () => {
    beforeEach(async () => {
      await testService.deleteAll();
    });

    it('should be able to edit user profile', async () => {
      // Arrange
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      const payload = {
        full_name: 'Otong Test',
        cv_url: 'https://inilink.com',
        about: 'ini about',
      };

      // Action
      const response = await request(app.getHttpServer())
        .put('/api/users/profile')
        .set('Cookie', userCookie)
        .send(payload);

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
      expect(response.body.data.full_name).toBe(payload.full_name);
      expect(response.body.data.about).toBe(payload.about);
      expect(response.body.data.cv_url).toBe(payload.cv_url);
    });
  });
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
      // Arrange — login user
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      // Action — upload file
      const response = await request(app.getHttpServer())
        .post('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .attach(
          'profile_picture',
          Buffer.from('fake-image-data'),
          'profile.jpg',
        );

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(
        'Profile picture uploaded successfully',
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.profile_picture_url).toMatch(
        /^https?:\/\/|^\/uploads/,
      ); // tergantung implementasi service upload
    });
  });

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
      // Arrange — login user & upload dulu
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({
          email: 'test@email.com',
          password: '1234test',
        });
      const userCookie = login.headers['set-cookie'];

      // Upload foto dulu biar ada datanya
      await request(app.getHttpServer())
        .post('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .attach('profile_picture', Buffer.from('fake'), 'test.jpg')
        .expect(200);

      // Action — delete foto
      const response = await request(app.getHttpServer())
        .delete('/api/users/profile/picture')
        .set('Cookie', userCookie)
        .send();

      // Assert
      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe(
        'Profile picture deleted successfully',
      );
    });
  });
});
