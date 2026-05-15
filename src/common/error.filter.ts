import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { RequestContextService } from '../observability/request-context.service';
import { sanitizeLogValue } from '../observability/log-sanitizer';

@Catch()
export class ErrorFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = this.getStatus(exception);
    const errorResponse = this.getErrorResponse(exception);

    RequestContextService.set({
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
    });

    this.logger.error('http_exception', {
      method: request.method,
      path: request.originalUrl,
      statusCode: status,
      error: errorResponse,
    });

    response.status(status).json({
      errors: errorResponse,
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    if (exception instanceof ZodError) {
      return 400;
    }

    return 500;
  }

  private getErrorResponse(exception: unknown): unknown {
    if (exception instanceof HttpException) {
      return sanitizeLogValue(exception.getResponse());
    }

    if (exception instanceof ZodError) {
      return sanitizeLogValue(exception.message);
    }

    if (exception instanceof Error) {
      return sanitizeLogValue(exception.message);
    }

    return 'Unknown error occurred';
  }
}
