import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpLoggingInterceptor } from './http-logging.interceptor';
import { MetricsController } from './metrics.controller';
import { HealthController } from './health.controller';

@Module({
  controllers: [MetricsController, HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class ObservabilityModule {}
