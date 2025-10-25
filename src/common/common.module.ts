import { Global, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { WinstonModule } from 'nest-winston';
import winston from 'winston';
import { ConfigModule } from '@nestjs/config';
import { ValidationService } from './validation.service';
import { APP_FILTER } from '@nestjs/core';
import { ErrorFilter } from './error.filter';
import { AuthMiddleware } from './auth/auth.middleware';
import { JwtService } from '@nestjs/jwt';

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
  ],
  providers: [
    JwtService,
    PrismaService,
    ValidationService,
    {
      provide: APP_FILTER,
      useClass: ErrorFilter,
    },
  ],
  exports: [PrismaService, ValidationService],
})
// implementasi authentikasi JWT
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuthMiddleware).forRoutes('/api/users/dummy');
  }
}
