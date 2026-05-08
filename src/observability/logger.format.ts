import winston from 'winston';
import { trace } from '@opentelemetry/api';
import { RequestContextService } from './request-context.service';
import { sanitizeLogValue } from './log-sanitizer';

function getLogLevel(): string {
  if (process.env.LOG_LEVEL) return process.env.LOG_LEVEL;
  if (process.env.NODE_ENV === 'production') return 'info';
  if (process.env.NODE_ENV === 'test') return 'warn';
  return 'debug';
}

function getActiveTraceId(): string | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext?.traceId;
}

export function createWinstonFormat() {
  return winston.format.combine(
    winston.format.timestamp(),
    winston.format((info) => {
      const context = RequestContextService.get();
      const traceId = context.traceId ?? getActiveTraceId();

      const enriched = {
        service: process.env.SERVICE_NAME || 'tenaga-rakyat-api',
        environment: process.env.NODE_ENV || 'development',
        requestId: context.requestId ?? null,
        traceId: traceId ?? null,
        userId: context.userId ?? null,
        method: context.method ?? null,
        path: context.path ?? null,
        statusCode: context.statusCode ?? null,
        durationMs: context.durationMs ?? null,
        ...info,
      };

      return sanitizeLogValue(enriched);
    })(),
    winston.format.json(),
  );
}

export function getWinstonLogLevel(): string {
  return getLogLevel();
}
