import 'dotenv/config';
import { NodeSDK, metrics as otelMetrics } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

const serviceName = process.env.SERVICE_NAME || 'tenaga-rakyat-api';
const otlpEndpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://otel-collector:4318';

const tracesEnabled = process.env.OTEL_TRACES_EXPORTER !== 'none';
const metricsEnabled = process.env.OTEL_METRICS_EXPORTER !== 'none';

if (tracesEnabled || metricsEnabled) {
  const sdk = new NodeSDK({
    serviceName,
    resource: resourceFromAttributes({
      'service.name': serviceName,
      'deployment.environment': process.env.NODE_ENV || 'development',
    }),
    traceExporter: tracesEnabled
      ? new OTLPTraceExporter({
          url: `${otlpEndpoint.replace(/\/$/, '')}/v1/traces`,
        })
      : undefined,
    metricReaders: metricsEnabled
      ? [
          new otelMetrics.PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
              url: `${otlpEndpoint.replace(/\/$/, '')}/v1/metrics`,
            }),
            exportIntervalMillis: 60000,
          }),
        ]
      : undefined,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-amqplib': { enabled: false },
        '@opentelemetry/instrumentation-aws-lambda': { enabled: false },
        '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
        '@opentelemetry/instrumentation-bunyan': { enabled: false },
        '@opentelemetry/instrumentation-cassandra-driver': { enabled: false },
        '@opentelemetry/instrumentation-connect': { enabled: false },
        '@opentelemetry/instrumentation-cucumber': { enabled: false },
        '@opentelemetry/instrumentation-dataloader': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-generic-pool': { enabled: false },
        '@opentelemetry/instrumentation-graphql': { enabled: false },
        '@opentelemetry/instrumentation-grpc': { enabled: false },
        '@opentelemetry/instrumentation-hapi': { enabled: false },
        '@opentelemetry/instrumentation-kafkajs': { enabled: false },
        '@opentelemetry/instrumentation-knex': { enabled: false },
        '@opentelemetry/instrumentation-koa': { enabled: false },
        '@opentelemetry/instrumentation-lru-memoizer': { enabled: false },
        '@opentelemetry/instrumentation-memcached': { enabled: false },
        '@opentelemetry/instrumentation-mongodb': { enabled: false },
        '@opentelemetry/instrumentation-mongoose': { enabled: false },
        '@opentelemetry/instrumentation-mysql': { enabled: false },
        '@opentelemetry/instrumentation-mysql2': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-openai': { enabled: false },
        '@opentelemetry/instrumentation-oracledb': { enabled: false },
        '@opentelemetry/instrumentation-pino': { enabled: false },
        '@opentelemetry/instrumentation-restify': { enabled: false },
        '@opentelemetry/instrumentation-router': { enabled: false },
        '@opentelemetry/instrumentation-socket.io': { enabled: false },
        '@opentelemetry/instrumentation-tedious': { enabled: false },
        '@opentelemetry/instrumentation-undici': { enabled: false },
        '@opentelemetry/instrumentation-winston': { enabled: false },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown().finally(() => process.exit(0));
  });
}
