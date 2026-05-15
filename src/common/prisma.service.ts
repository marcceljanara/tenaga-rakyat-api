import 'dotenv/config';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { observabilityMetrics } from '../observability/metrics';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, string>
  implements OnModuleInit
{
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    const connectionString = `${process.env.DATABASE_URL}`;
    const adapter = new PrismaPg({ connectionString });
    const isProduction = process.env.NODE_ENV === 'production';
    super({
      adapter,
      log: isProduction
        ? [
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'query' },
          ]
        : [
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'query' },
          ],
    });
  }
  onModuleInit() {
    this.$on('info', (e) => {
      this.logger.info(e);
    });
    this.$on('warn', (e) => {
      this.logger.warn(e);
    });
    this.$on('error', (e) => {
      this.logger.error(e);
    });
    this.$on('query', (e) => {
      const durationMs = e.duration ?? 0;
      const operation = this.getQueryOperation(e.query);
      const target = e.target ?? 'database';
      const slowQueryMs = Number(process.env.PRISMA_SLOW_QUERY_MS || 500);

      observabilityMetrics.recordPrismaQuery({
        operation,
        target,
        result: 'success',
        durationMs,
      });

      if (process.env.NODE_ENV !== 'production') {
        this.logger.debug('prisma_query', e);
        return;
      }

      if (durationMs >= slowQueryMs) {
        this.logger.warn('prisma_slow_query', {
          operation,
          target,
          durationMs,
          slowQueryMs,
        });
      }
    });
  }

  private getQueryOperation(query: string): string {
    return query.trim().split(/\s+/)[0]?.toLowerCase() || 'unknown';
  }
}
