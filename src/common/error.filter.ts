import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch(ZodError, HttpException)
export class ErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const errorResponse = exception.getResponse();
      response.status(status).json({
        errors: errorResponse,
      });
    } else if (exception instanceof ZodError) {
      response.status(400).json({
        errors: exception.flatten().fieldErrors,
      });
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      const message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
      response.status(500).json({
        errors: message,
      });
    } else {
      this.logger.error('Unknown error occurred: ' + String(exception));
      // fallback jika benar-benar unknown (bukan Error)
      response.status(500).json({
        errors: 'Unknown error occurred',
      });
    }
  }
}
