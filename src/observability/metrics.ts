import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

const registry = new Registry();
registry.setDefaultLabels({
  service: process.env.SERVICE_NAME || 'tenaga-rakyat-api',
});

collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests handled by the API.',
  labelNames: ['method', 'route', 'status_code', 'status_group'],
  registers: [registry],
});

const httpRequestDurationSeconds = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status_code', 'status_group'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpRequestErrorsTotal = new Counter({
  name: 'http_request_errors_total',
  help: 'Total HTTP requests that returned a 4xx or 5xx response.',
  labelNames: ['method', 'route', 'status_code', 'status_group'],
  registers: [registry],
});

const prismaQueryDurationSeconds = new Histogram({
  name: 'prisma_query_duration_seconds',
  help: 'Prisma query duration in seconds.',
  labelNames: ['operation', 'target', 'result'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

const bullJobsTotal = new Counter({
  name: 'bull_jobs_total',
  help: 'Total Bull jobs by result.',
  labelNames: ['queue', 'job', 'result'],
  registers: [registry],
});

const midtransRequestsTotal = new Counter({
  name: 'midtrans_requests_total',
  help: 'Total Midtrans operations by result.',
  labelNames: ['operation', 'result'],
  registers: [registry],
});

const cronJobsTotal = new Counter({
  name: 'cron_jobs_total',
  help: 'Total cron job executions by result.',
  labelNames: ['job', 'result'],
  registers: [registry],
});

export const observabilityMetrics = {
  registry,

  async metricsText(): Promise<string> {
    return registry.metrics();
  },

  contentType(): string {
    return registry.contentType;
  },

  recordHttpRequest(labels: {
    method: string;
    route: string;
    statusCode: number;
    statusGroup: string;
    durationMs: number;
  }): void {
    const metricLabels = {
      method: labels.method,
      route: labels.route,
      status_code: String(labels.statusCode),
      status_group: labels.statusGroup,
    };

    httpRequestsTotal.inc(metricLabels);
    httpRequestDurationSeconds.observe(metricLabels, labels.durationMs / 1000);

    if (labels.statusCode >= 400) {
      httpRequestErrorsTotal.inc(metricLabels);
    }
  },

  recordPrismaQuery(labels: {
    operation: string;
    target: string;
    result: 'success' | 'error';
    durationMs: number;
  }): void {
    prismaQueryDurationSeconds.observe(
      {
        operation: labels.operation,
        target: labels.target,
        result: labels.result,
      },
      labels.durationMs / 1000,
    );
  },

  recordBullJob(labels: {
    queue: string;
    job: string;
    result: 'completed' | 'failed';
  }): void {
    bullJobsTotal.inc(labels);
  },

  recordMidtransRequest(labels: {
    operation: string;
    result: 'success' | 'failed';
  }): void {
    midtransRequestsTotal.inc(labels);
  },

  recordCronJob(labels: { job: string; result: 'success' | 'failed' }): void {
    cronJobsTotal.inc(labels);
  },
};
