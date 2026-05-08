import { SpanStatusCode, trace } from '@opentelemetry/api';

const tracer = trace.getTracer(process.env.SERVICE_NAME || 'tenaga-rakyat-api');

export async function runWithSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean> | undefined,
  callback: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes }, async (span) => {
    try {
      const result = await callback();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
