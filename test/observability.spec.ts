/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { AppModule } from '../src/app.module';
import { sanitizeLogValue, REDACTED } from '../src/observability/log-sanitizer';
import { TestModule } from './test.module';
import { TestService } from './test.service';

describe('Observability', () => {
  let app: INestApplication;
  let testService: TestService;
  let logger: Logger;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule, TestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    testService = app.get(TestService);
    logger = app.get(WINSTON_MODULE_PROVIDER);
  });

  afterAll(async () => {
    await testService.disconnect();
    await app.close();
  });

  it('redacts sensitive values recursively', () => {
    const sanitized = sanitizeLogValue({
      password: 'secret-password',
      nested: {
        access_token: 'access-token',
        authorization: 'Bearer token',
        signature_key: 'midtrans-signature',
        emailVerificationToken: 'verification-token',
      },
      serverKey: 'server-key',
      clientKey: 'client-key',
      normal: 'visible',
    });

    expect(sanitized.password).toBe(REDACTED);
    expect(sanitized.nested.access_token).toBe(REDACTED);
    expect(sanitized.nested.authorization).toBe(REDACTED);
    expect(sanitized.nested.signature_key).toBe(REDACTED);
    expect(sanitized.nested.emailVerificationToken).toBe(REDACTED);
    expect(sanitized.serverKey).toBe(REDACTED);
    expect(sanitized.clientKey).toBe(REDACTED);
    expect(sanitized.normal).toBe('visible');
  });

  it('creates x-request-id when the client does not send one', async () => {
    const response = await request(app.getHttpServer()).get('/health/live');

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toEqual(expect.any(String));
  });

  it('propagates client x-request-id', async () => {
    const requestId = 'test-request-id';
    const response = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', requestId);

    expect(response.statusCode).toBe(200);
    expect(response.headers['x-request-id']).toBe(requestId);
  });

  it('exposes metrics', async () => {
    const response = await request(app.getHttpServer()).get('/metrics');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
  });

  it('exposes readiness without leaking credentials', async () => {
    const response = await request(app.getHttpServer()).get('/health/ready');

    expect([200, 503]).toContain(response.statusCode);
    expect(response.body.info).toHaveProperty('postgres');
    expect(response.body.info).toHaveProperty('redis');
    expect(response.body.info).toHaveProperty('uploads');
    expect(JSON.stringify(response.body)).not.toContain('DATABASE_URL');
    expect(JSON.stringify(response.body)).not.toContain('REDIS_PASSWORD');
  });

  it('returns x-request-id and logs structured metadata on error path', async () => {
    const loggerSpy = jest.spyOn(logger, 'error');

    const response = await request(app.getHttpServer())
      .get('/api/users/profile')
      .set('x-request-id', 'error-path-request');

    expect(response.statusCode).toBe(401);
    expect(response.headers['x-request-id']).toBe('error-path-request');
    expect(loggerSpy).toHaveBeenCalledWith(
      'http_exception',
      expect.objectContaining({
        method: 'GET',
        path: '/api/users/profile',
        statusCode: 401,
      }),
    );
  });
});
