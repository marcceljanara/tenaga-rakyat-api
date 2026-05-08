import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { observabilityMetrics } from './metrics';

@Controller()
export class MetricsController {
  @Get('/metrics')
  async getMetrics(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', observabilityMetrics.contentType());
    response.send(await observabilityMetrics.metricsText());
  }
}
