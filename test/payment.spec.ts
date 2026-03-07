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

describe('PaymentController', () => {
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
  // GET /api/wallets — Get Wallet
  // ============================================================
  describe('GET /api/wallets - Get Wallet', () => {
    let workerCookie: string[];
    let providerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');
    });

    it('should get wallet as worker', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.balance).toBeDefined();
      expect(response.body.data.status).toBe('ACTIVE');
    });

    it('should get wallet as provider', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get('/api/wallets');

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/wallets/transactions/:walletId — Get Wallet Transactions
  // ============================================================
  describe('GET /api/wallets/transactions/:walletId - Get Wallet Transactions', () => {
    let workerCookie: string[];
    let walletId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // Get the wallet ID
      const walletResponse = await request(app.getHttpServer())
        .get('/api/wallets')
        .set('Cookie', workerCookie);
      walletId = walletResponse.body.data.id;
    });

    it('should get wallet transactions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/wallets/transactions/${walletId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should return 404 for non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets/transactions/99999')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/wallets/transactions/${walletId}`,
      );

      expect(response.statusCode).toBe(401);
    });

    it('should reject accessing another users wallet', async () => {
      // Create another user with a different wallet
      await testService.addAnotherUser();
      const anotherCookie = await loginAs('another@email.com');

      const response = await request(app.getHttpServer())
        .get(`/api/wallets/transactions/${walletId}`)
        .set('Cookie', anotherCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================================
  // POST /api/wallets/withdraw-methods — Add Withdraw Method
  // ============================================================
  describe('POST /api/wallets/withdraw-methods - Add Withdraw Method', () => {
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should add bank transfer withdraw method', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.method).toBe('BANK_TRANSFER');
      expect(response.body.data.provider).toBe('BRI');
    });

    it('should add ewallet withdraw method', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'EWALLET',
          provider: 'Dana',
          account_name: 'John Doe',
          account_number: '081234567890',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.method).toBe('EWALLET');
      expect(response.body.data.provider).toBe('Dana');
    });

    it('should reject invalid method type', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'INVALID_METHOD',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject invalid provider', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'INVALID_BANK',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if account name too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'Jo',
          account_number: '1234567890',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if account number too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '12',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/wallets/withdraw-methods — Get Withdraw Methods
  // ============================================================
  describe('GET /api/wallets/withdraw-methods - Get Withdraw Methods', () => {
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // Add a withdraw method
      await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });
    });

    it('should get withdraw methods', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.withdraw_methods).toBeDefined();
      expect(response.body.data.withdraw_methods.length).toBeGreaterThan(0);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/wallets/withdraw-methods',
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // DELETE /api/wallets/withdraw-methods/:methodId
  // ============================================================
  describe('DELETE /api/wallets/withdraw-methods/:methodId - Delete Withdraw Method', () => {
    let workerCookie: string[];
    let methodId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');

      // Add a withdraw method and capture ID
      const addResponse = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });
      methodId = addResponse.body.data.id;
    });

    it('should delete withdraw method successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/wallets/withdraw-methods/${methodId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
    });

    it('should reject if method not found', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/wallets/withdraw-methods/99999')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not method owner', async () => {
      await testService.addAnotherUser();
      const anotherCookie = await loginAs('another@email.com');

      const response = await request(app.getHttpServer())
        .delete(`/api/wallets/withdraw-methods/${methodId}`)
        .set('Cookie', anotherCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/wallets/withdraw-methods/${methodId}`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // POST /api/wallets/withdraw-requests — Create Withdraw Request
  // ============================================================
  describe('POST /api/wallets/withdraw-requests - Create Withdraw Request', () => {
    let workerCookie: string[];
    let methodId: number;
    let userId: string;

    beforeEach(async () => {
      await testService.deleteAll();

      userId = await testService.addUser();
      await testService.addBalanceWallet(userId);
      workerCookie = await loginAs('test@email.com');

      // Add a withdraw method
      const addResponse = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });
      methodId = addResponse.body.data.id;
    });

    it('should create withdraw request successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 50000,
          method_id: methodId,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(
        'Withdraw request created successfully',
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.status).toBe('PENDING');
    });

    it('should reject if amount too small', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 5000,
          method_id: methodId,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if amount is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: -10000,
          method_id: methodId,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if method_id not found', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 50000,
          method_id: 99999,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .send({
          amount: 50000,
          method_id: methodId,
        });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/wallets/withdraw-requests — Get User Withdraw Requests
  // ============================================================
  describe('GET /api/wallets/withdraw-requests - Get User Withdraw Requests', () => {
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      const userId = await testService.addUser();
      await testService.addBalanceWallet(userId);
      workerCookie = await loginAs('test@email.com');

      // Add withdraw method and create a request
      const addMethod = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 50000,
          method_id: addMethod.body.data.id,
        });
    });

    it('should get user withdraw requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.requests).toBeDefined();
      expect(response.body.data.requests.length).toBeGreaterThan(0);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/wallets/withdraw-requests',
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/wallets/withdraw-requests/:id — Get Withdraw Request Detail
  // ============================================================
  describe('GET /api/wallets/withdraw-requests/:id - Get Withdraw Request Detail', () => {
    let workerCookie: string[];
    let withdrawRequestId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      const userId = await testService.addUser();
      await testService.addBalanceWallet(userId);
      workerCookie = await loginAs('test@email.com');

      // Add withdraw method and create a request
      const addMethod = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      const createRequest = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 50000,
          method_id: addMethod.body.data.id,
        });

      withdrawRequestId = createRequest.body.data.id;
    });

    it('should get withdraw request detail', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/wallets/withdraw-requests/${withdrawRequestId}`)
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(withdrawRequestId);
      expect(response.body.data.status).toBeDefined();
    });

    it('should return 404 for non-existent request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/wallets/withdraw-requests/99999')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should return 404 if not owner (filtered out by user_id)', async () => {
      await testService.addAnotherUser();
      const anotherCookie = await loginAs('another@email.com');

      const response = await request(app.getHttpServer())
        .get(`/api/wallets/withdraw-requests/${withdrawRequestId}`)
        .set('Cookie', anotherCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(404);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        `/api/wallets/withdraw-requests/${withdrawRequestId}`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/credits — Get Credit Balance (Provider only)
  // ============================================================
  describe('GET /api/credits - Get Credit Balance', () => {
    let providerCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should get credit balance as provider', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.free_quota).toBeDefined();
      expect(response.body.data.paid_credit).toBeDefined();
    });

    it('should reject if worker tries to access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get('/api/credits');

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/credits/posting-credit — Get Available Packages (Provider)
  // ============================================================
  describe('GET /api/credits/posting-credit - Get Available Packages', () => {
    let providerCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should get available credit packages as provider', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits/posting-credit')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if worker tries to access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits/posting-credit')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/credits/posting-credit',
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/credits/history — Get Credit Purchase History
  // ============================================================
  describe('GET /api/credits/history - Get Credit Purchase History', () => {
    let providerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      await testService.addProvider();
      providerCookie = await loginAs('provider@email.com');
    });

    it('should get credit purchase history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits/history')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should get empty purchase history', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/credits/history')
        .set('Cookie', providerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/credits/history',
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // ADMIN: POST /api/admin/posting-credit — Create Package
  // ============================================================
  describe('POST /api/admin/posting-credit - Create Posting Credit Package', () => {
    let adminCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      adminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should create posting credit package', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Bronze',
          credit_amount: 10,
          price: 50000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe(
        'Paket Kredit Posting berhasil ditambahkan',
      );
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe('Paket Bronze');
      expect(response.body.data.credit_amount).toBe(10);
    });

    it('should reject if name too short', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Ab',
          credit_amount: 10,
          price: 50000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if credit_amount is 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Free',
          credit_amount: 0,
          price: 50000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if price is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Negatif',
          credit_amount: 10,
          price: -1000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(400);
    });

    it('should reject if not admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', workerCookie)
        .send({
          name: 'Paket Bronze',
          credit_amount: 10,
          price: 50000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .send({
          name: 'Paket Bronze',
          credit_amount: 10,
          price: 50000,
        });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // GET /api/admin/posting-credit — Get All Packages (Admin)
  // ============================================================
  describe('GET /api/admin/posting-credit - Get All Packages (Admin)', () => {
    let adminCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      adminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      await testService.addUser();
      workerCookie = await loginAs('test@email.com');
    });

    it('should get all posting credit packages as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/posting-credit')
        .set('Cookie', adminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
    });

    it('should reject if not admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/posting-credit')
        .set('Cookie', workerCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/admin/posting-credit',
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // PUT /api/admin/posting-credit/:id — Edit Package
  // ============================================================
  describe('PUT /api/admin/posting-credit/:id - Edit Package', () => {
    let adminCookie: string[];
    let packageId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      adminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      // Create a package
      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Test',
          credit_amount: 5,
          price: 25000,
        });
      packageId = createResponse.body.data.id;
    });

    it('should edit package successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/posting-credit/${packageId}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Test Updated',
          price: 30000,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data.name).toBe('Paket Test Updated');
    });

    it('should deactivate package', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/posting-credit/${packageId}`)
        .set('Cookie', adminCookie)
        .send({
          is_active: false,
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
    });

    it('should return 500 if package not found (unhandled Prisma error)', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/admin/posting-credit/99999')
        .set('Cookie', adminCookie)
        .send({
          name: 'Updated',
        });

      logger.debug(response.body);
      expect(response.statusCode).toBe(500);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/admin/posting-credit/${packageId}`)
        .send({ name: 'Updated' });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // DELETE /api/admin/posting-credit/:id — Delete Package
  // ============================================================
  describe('DELETE /api/admin/posting-credit/:id - Delete Package', () => {
    let adminCookie: string[];
    let packageId: number;

    beforeEach(async () => {
      await testService.deleteAll();

      adminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      // Create a package
      const createResponse = await request(app.getHttpServer())
        .post('/api/admin/posting-credit')
        .set('Cookie', adminCookie)
        .send({
          name: 'Paket Hapus',
          credit_amount: 3,
          price: 15000,
        });
      packageId = createResponse.body.data.id;
    });

    it('should delete package successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/admin/posting-credit/${packageId}`)
        .set('Cookie', adminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBeDefined();
    });

    it('should return 500 if package not found (unhandled Prisma error)', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/admin/posting-credit/99999')
        .set('Cookie', adminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(500);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/api/admin/posting-credit/${packageId}`,
      );

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================
  // ADMIN: GET /api/admin/withdraw-requests
  // ============================================================
  describe('GET /api/admin/withdraw-requests - Admin Get All Withdrawals', () => {
    let adminCookie: string[];
    let workerCookie: string[];

    beforeEach(async () => {
      await testService.deleteAll();

      adminCookie = await loginAs('super@admin.com', 'StrongPass123!!');

      const userId = await testService.addUser();
      await testService.addBalanceWallet(userId);
      workerCookie = await loginAs('test@email.com');

      // Create a withdraw request for testing
      const addMethod = await request(app.getHttpServer())
        .post('/api/wallets/withdraw-methods')
        .set('Cookie', workerCookie)
        .send({
          method: 'BANK_TRANSFER',
          provider: 'BRI',
          account_name: 'John Doe',
          account_number: '1234567890',
        });

      await request(app.getHttpServer())
        .post('/api/wallets/withdraw-requests')
        .set('Cookie', workerCookie)
        .send({
          amount: 50000,
          method_id: addMethod.body.data.id,
        });
    });

    it('should get all withdraw requests as admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/withdraw-requests')
        .set('Cookie', adminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.requests).toBeDefined();
      expect(response.body.data.requests.length).toBeGreaterThan(0);
    });

    it('should filter by status PENDING', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/withdraw-requests?status=PENDING')
        .set('Cookie', adminCookie);

      logger.debug(response.body);
      expect(response.statusCode).toBe(200);
      expect(
        response.body.data.requests.every(
          (r: any) => r.status === 'PENDING',
        ),
      ).toBe(true);
    });

    it('should reject if not admin', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/admin/withdraw-requests')
        .set('Cookie', workerCookie);

      expect(response.statusCode).toBe(403);
    });

    it('should reject if not authenticated', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/admin/withdraw-requests',
      );

      expect(response.statusCode).toBe(401);
    });
  });
});
