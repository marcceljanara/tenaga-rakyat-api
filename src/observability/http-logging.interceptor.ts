import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { catchError, finalize, Observable, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import type { Logger } from 'winston';
import { trace } from '@opentelemetry/api';
import { observabilityMetrics } from './metrics';
import { RequestContextService } from './request-context.service';
import { normalizeRoute, statusGroup } from './route.util';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const startedAt = Date.now();
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: { id?: string } }>();
    const response = http.getResponse<Response>();
    let thrownError: unknown;

    return next.handle().pipe(
      catchError((error) => {
        thrownError = error;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return throwError(() => error);
      }),
      finalize(() => {
        const durationMs = Date.now() - startedAt;
        const statusCode = response.statusCode || 500;
        const route = normalizeRoute(
          `${request.baseUrl || ''}${request.route?.path || request.path}`,
        );
        const traceId = trace.getActiveSpan()?.spanContext().traceId;
        const userId = request.user?.id;

        RequestContextService.set({
          durationMs,
          route,
          statusCode,
          traceId,
          userId,
        });

        if (request.path !== '/metrics') {
          observabilityMetrics.recordHttpRequest({
            method: request.method,
            route,
            statusCode,
            statusGroup: statusGroup(statusCode),
            durationMs,
          });

          this.logger.info('http_request_completed', {
            method: request.method,
            path: request.originalUrl,
            route,
            statusCode,
            durationMs,
            userAgent: request.headers['user-agent'],
            error:
              thrownError instanceof Error
                ? { name: thrownError.name, message: thrownError.message }
                : undefined,
          });
        }
      }),
    );
  }
}
