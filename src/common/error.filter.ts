import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

@Catch()
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
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(
        `Prisma Error [${exception.code}]: ${exception.message}`,
        exception.stack,
      );

      let status = 500;
      let message = 'Internal database error';

      if (exception.code === 'P2002') {
        status = 400;
        const target = (exception.meta?.target as string[]) || [];
        if (target.includes('email')) {
          message = 'Email sudah digunakan';
        } else if (target.includes('phone_number')) {
          message = 'Nomor telepon sudah digunakan';
        } else {
          message = 'Data unik sudah digunakan';
        }
      } else if (exception.code === 'P2025') {
        status = 404;
        message = 'Data tidak ditemukan';
      } else if (exception.code === 'P2003') {
        status = 400;
        message =
          'Relasi data tidak valid atau referensi objek tidak ditemukan';
      } else {
        message =
          process.env.NODE_ENV === 'production'
            ? 'Internal database error'
            : exception.message;
      }

      response.status(status).json({
        errors: message,
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
