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
});
