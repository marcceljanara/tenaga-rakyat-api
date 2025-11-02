import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { ValidationService } from './validation.service';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorFilter } from './error.filter';
import { AuthMiddleware } from './auth/auth.middleware';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { RoleGuard } from './role/role.guard';

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: 'debug',
      format: winston.format.json(),
      transports: [new winston.transports.Console()],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  providers: [
    JwtService,
    PrismaService,
    ValidationService,
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  exports: [PrismaService, ValidationService],
})
// implementasi authentikasi JWT
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        '/api/users/profile',
        '/api/users/profile/*',
        '/api/users/photos',
        '/api/users/photos/*',
        '/api/users/applications',
        '/api/users/applications/*',
        '/api/jobs',
        '/api/jobs/:jobId',
        '/api/jobs/:jobId/*',
        '/api/applications',
        '/api/applications/*',
      );
  }
}
