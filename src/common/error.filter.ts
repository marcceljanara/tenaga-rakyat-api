import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch(ZodError, HttpException)
export class ErrorFilter implements ExceptionFilter {
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
        errors: exception.message, // bisa juga pakai exception.flatten() untuk detail
      });
    } else if (exception instanceof Error) {
      response.status(500).json({
        errors: exception.message,
      });
    } else {
      // fallback jika benar-benar unknown (bukan Error)
      response.status(500).json({
        errors: 'Unknown error occurred',
      });
    }
  }
}
