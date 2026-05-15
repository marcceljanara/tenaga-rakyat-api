import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { doubleCsrfProtection } from './common/csrf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          'img-src': ["'self'", 'data:'],
        },
      },
    }),
  );

  // CORS Configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());
  app.use(doubleCsrfProtection);

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Job Platform API')
    .setDescription(
      `
# Job Platform REST API Documentation

Dokumentasi lengkap untuk Job Platform API yang menyediakan layanan untuk manajemen pekerjaan, lamaran kerja, wallet, dan pembayaran.

## Fitur Utama
- 🔐 **Authentication & Authorization**: Login, register, email verification, password reset
- 👥 **User Management**: Profil pengguna, foto portfolio, manajemen admin
- 💼 **Job Management**: Posting pekerjaan, pencarian, update status
- 📝 **Application Management**: Melamar pekerjaan, review lamaran, statistik
- 💰 **Payment & Wallet**: Top up, withdraw, manajemen metode penarikan
- 📊 **Reporting**: Dashboard admin, statistik platform

## Role-Based Access
- **Worker (Role 1)**: Dapat melamar pekerjaan, mengelola profil, dan melakukan withdraw
- **Job Provider (Role 2)**: Dapat memposting pekerjaan, melihat lamaran, dan mengelola pekerjaan
- **Admin**: Dapat mengelola withdraw request dan melihat laporan
- **Super Admin**: Full access ke semua fitur termasuk manajemen admin

## Authentication
Sebagian besar endpoint memerlukan authentication menggunakan Bearer Token yang didapatkan setelah login. Token disimpan dalam cookie dengan nama \`access_token\`.

## Error Responses
Semua error response mengikuti format:
\`\`\`json
{
  "errors": "Error message here",
  "statusCode": 400
}
\`\`\`

## Success Responses
Success response mengikuti format:
\`\`\`json
{
  "data": { ... },
  "message": "Success message (optional)"
}
\`\`\`
    `,
    )
    .setVersion('1.0')
    .setContact('Developer Team', 'https://example.com', 'support@example.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching with @ApiBearerAuth() in controllers
    )
    .addTag(
      'User Authentication & Profile',
      'Endpoints untuk registrasi, login, dan manajemen profil pengguna',
    )
    .addTag(
      'Authentication & Email Verification',
      'Endpoints untuk verifikasi email dan reset password',
    )
    .addTag('Job Management', 'Endpoints untuk manajemen lowongan pekerjaan')
    .addTag('Job Applications', 'Endpoints untuk manajemen lamaran pekerjaan')
    .addTag(
      'Payment & Wallet',
      'Endpoints untuk manajemen wallet dan transaksi',
    )
    .addTag(
      'Withdraw Methods',
      'Endpoints untuk manajemen metode penarikan dana',
    )
    .addTag(
      'Withdraw Requests - User',
      'Endpoints untuk user mengelola permintaan penarikan',
    )
    .addTag(
      'Admin - Withdraw Management',
      'Endpoints untuk admin mengelola withdraw requests',
    )
    .addTag('Admin Management', 'Endpoints untuk manajemen akun admin')
    .addTag('Admin - User Management', 'Endpoints untuk admin mengelola user')
    .addTag('Admin - Reports', 'Endpoints untuk laporan dan statistik platform')
    .addTag('User Photos', 'Endpoints untuk manajemen foto portfolio pengguna')
    .addTag(
      'Reviews',
      'Endpoints untuk review bidireksional antara pemberi kerja dan pekerja',
    )
    .addTag(
      'Posting Credits',
      'Endpoints untuk pembelian dan pengelolaan kredit posting',
    )
    .addTag(
      'Admin - Posting Credits',
      'Endpoints untuk admin mengelola paket kredit posting',
    )
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.tenagarakyat.site', 'Production Server')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  // Customize Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 20px; }
    `,
    customSiteTitle: 'Job Platform API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  });
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}
void bootstrap();
