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

describe('UserPhotoController', () => {
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

  describe('User Photos Endpoints', () => {
    let userCookie: string;

    beforeEach(async () => {
      await testService.deleteAll();

      // Register & login user
      await testService.addUser();
      const login = await request(app.getHttpServer())
        .post('/api/users/login')
        .send({ email: 'test@email.com', password: '1234test' });

      userCookie = login.headers['set-cookie'];
    });

    // ============ POST /api/users/photos ============
    describe('POST /api/users/photos', () => {
      it('should reject if user not logged in', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/users/photos')
          .attach('photo', Buffer.from('dummy'), 'dummy.jpg')
          .field('description', 'My first photo');

        expect(response.statusCode).toBe(401);
        expect(response.body.errors).toBeDefined();
      });

      it('should reject invalid file type', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('dummy-data'), 'badfile.txt')
          .field('description', 'Invalid file');

        logger.debug(response.body);
        expect(response.statusCode).toBe(422);
      });

      it('should upload photo successfully', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('fake-image'), 'photo.jpg')
          .field('description', 'My first photo');

        logger.debug(response.body);
        expect(response.statusCode).toBe(201);
        expect(response.body.message).toBe('Photo uploaded successfully');
        expect(response.body.data).toBeDefined();
        expect(response.body.data.photo_url).toMatch(/^\/uploads\/user-photos/);
      });
    });

    // ============ GET /api/users/photos ============
    describe('GET /api/users/photos', () => {
      it('should reject if not logged in', async () => {
        const response = await request(app.getHttpServer()).get(
          '/api/users/photos',
        );

        expect(response.statusCode).toBe(401);
      });

      it('should return user photos', async () => {
        // Upload one photo first
        await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('img'), 'photo.jpg')
          .field('description', 'desc');

        const response = await request(app.getHttpServer())
          .get('/api/users/photos')
          .set('Cookie', userCookie);

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data[0].description).toBe('desc');
      });
    });

    // ============ GET /api/users/photos/:photoId ============
    describe('GET /api/users/photos/:photoId', () => {
      it('should return 404 for non-existing photo', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/users/photos/9999')
          .set('Cookie', userCookie);

        expect(response.statusCode).toBe(404);
      });

      it('should return photo by id', async () => {
        const upload = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('image-data'), 'ok.jpg')
          .field('description', 'test get by id');

        const photoId = upload.body.data.id;

        const response = await request(app.getHttpServer())
          .get(`/api/users/photos/${photoId}`)
          .set('Cookie', userCookie);

        expect(response.statusCode).toBe(200);
        expect(response.body.data.description).toBe('test get by id');
      });
    });

    // ============ PUT /api/users/photos/:photoId ============
    describe('PUT /api/users/photos/:photoId', () => {
      it('should reject if description empty', async () => {
        const upload = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('image'), 'edit.jpg')
          .field('description', 'desc');

        const photoId = upload.body.data.id;

        const response = await request(app.getHttpServer())
          .put(`/api/users/photos/${photoId}`)
          .set('Cookie', userCookie)
          .send({ description: '' });

        expect(response.statusCode).toBe(400);
      });

      it('should update photo description successfully', async () => {
        const upload = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('image'), 'edit2.jpg')
          .field('description', 'old desc');

        const photoId = upload.body.data.id;

        const response = await request(app.getHttpServer())
          .put(`/api/users/photos/${photoId}`)
          .set('Cookie', userCookie)
          .send({ description: 'new desc' });

        expect(response.statusCode).toBe(200);
        expect(response.body.data.description).toBe('new desc');
      });
    });

    // ============ DELETE /api/users/photos/:photoId ============
    describe('DELETE /api/users/photos/:photoId', () => {
      it('should return 404 when photo not found', async () => {
        const response = await request(app.getHttpServer())
          .delete('/api/users/photos/9999')
          .set('Cookie', userCookie);

        expect(response.statusCode).toBe(404);
      });

      it('should delete photo successfully', async () => {
        const upload = await request(app.getHttpServer())
          .post('/api/users/photos')
          .set('Cookie', userCookie)
          .attach('photo', Buffer.from('to-delete'), 'del.jpg')
          .field('description', 'to delete');

        const photoId = upload.body.data.id;

        const response = await request(app.getHttpServer())
          .delete(`/api/users/photos/${photoId}`)
          .set('Cookie', userCookie);

        expect(response.statusCode).toBe(200);
        expect(response.body.message).toBe('Photo deleted successfully');
      });
    });
  });
});
