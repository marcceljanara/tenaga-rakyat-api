/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { ValidationService } from './validation.service';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorFilter } from './error.filter';
import { AuthMiddleware } from './auth/auth.middleware';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { RoleGuard } from './role/role.guard';
import { BullModule } from '@nestjs/bull';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  createWinstonFormat,
  getWinstonLogLevel,
} from '../observability/logger.format';
import { RequestContextMiddleware } from '../observability/request-context.middleware';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: getWinstonLogLevel(),
      format: createWinstonFormat(),
      transports: [new winston.transports.Console()],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100, // Global default limit
      },
    ]),

    // Bull Queue Configuration
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      },
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot({
      serveRoot: '/uploads',
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
      serveStaticOptions: {
        index: false,
        setHeaders: (res, path, stat) => {
          res.set('X-Content-Type-Options', 'nosniff');
          res.set('Content-Security-Policy', "default-src 'none'");
        },
      },
    }),
  ],
  providers: [
    JwtService,
    PrismaService,
    ValidationService,
    RequestContextMiddleware,
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
    ...(process.env.NODE_ENV === 'production'
      ? [
          {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
          },
        ]
      : []),
  ],
  exports: [PrismaService, ValidationService],
})
// implementasi authentikasi JWT
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestContextMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });

    consumer
      .apply(AuthMiddleware)
      .exclude({
        path: '/api/jobs',
        method: RequestMethod.GET,
      })
      .forRoutes(
        '/api/users/profile',
        '/api/users/profile/*path',
        '/api/users/photos',
        '/api/users/photos/*path',
        '/api/users/applications',
        '/api/users/applications/*path',
        '/api/jobs',
        '/api/jobs/:jobId',
        '/api/jobs/:jobId/*path',
        '/api/jobs/provider/*path',
        '/api/applications',
        '/api/applications/*path',
        '/api/wallets',
        '/api/wallets/*path',
        '/api/admin',
        '/api/admin/*path',
        '/api/admins',
        '/api/admins/*path',
        '/api/user-management',
        '/api/user-management/*path',
        '/api/auth/resend-verification',
        '/api/auth/change-email',
        '/api/credits',
        '/api/credits/*path',
        '/api/reviews',
        '/api/reviews/*path',
      );
  }
}
