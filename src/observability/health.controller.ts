import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  OnModuleDestroy,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import Redis from 'ioredis';
import { access, constants } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../common/prisma.service';

type CheckResult = {
  status: 'up' | 'down';
};

@Controller('/health')
export class HealthController implements OnModuleDestroy {
  private readonly redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 1000,
    commandTimeout: 1000,
  });

  constructor(private readonly prismaService: PrismaService) {}

  @Get('/live')
  @HttpCode(200)
  live() {
    return {
      status: 'ok',
      info: {
        app: { status: 'up' },
      },
    };
  }

  @Get('/ready')
  async ready(@Res() response: Response): Promise<void> {
    const checks = {
      postgres: await this.checkPostgres(),
      redis: await this.checkRedis(),
      uploads: await this.checkUploads(),
    };

    const isReady = Object.values(checks).every(
      (check) => check.status === 'up',
    );

    response.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    response.json({
      status: isReady ? 'ok' : 'error',
      info: checks,
    });
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  private async checkPostgres(): Promise<CheckResult> {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkRedis(): Promise<CheckResult> {
    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') {
        await this.redis.connect();
      }

      await this.redis.ping();
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }

  private async checkUploads(): Promise<CheckResult> {
    try {
      await access(
        join(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
        constants.R_OK | constants.W_OK,
      );
      return { status: 'up' };
    } catch {
      return { status: 'down' };
    }
  }
}
