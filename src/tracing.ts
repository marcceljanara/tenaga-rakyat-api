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
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    void sdk.shutdown().finally(() => process.exit(0));
  });
}
