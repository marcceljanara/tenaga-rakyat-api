import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { trace } from '@opentelemetry/api';
import { RequestContextService } from './request-context.service';

function readRequestId(req: Request): string {
  const header = req.headers['x-request-id'];
  if (Array.isArray(header)) return header[0] || randomUUID();
  return header || randomUUID();
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = readRequestId(req);
    const traceId = trace.getActiveSpan()?.spanContext().traceId;

    res.setHeader('x-request-id', requestId);

    RequestContextService.run(
      {
        requestId,
        traceId,
        method: req.method,
        path: req.originalUrl || req.url,
      },
      next,
    );
  }
}
