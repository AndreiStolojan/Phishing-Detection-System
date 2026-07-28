import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  prefix: 'secureinbox_',
  register: metricsRegistry,
});

export const httpRequestsTotal = new Counter({
  name: 'secureinbox_http_requests_total',
  help: 'Total HTTP requests handled by the SecureInbox API.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new Histogram({
  name: 'secureinbox_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 60, 120],
  registers: [metricsRegistry],
});

export const httpRequestsInFlight = new Gauge({
  name: 'secureinbox_http_requests_in_flight',
  help: 'HTTP requests currently being processed.',
  registers: [metricsRegistry],
});

export const applicationOperationsTotal = new Counter({
  name: 'secureinbox_application_operations_total',
  help: 'Completed application operations grouped by safe, bounded labels.',
  labelNames: ['operation', 'result'],
  registers: [metricsRegistry],
});

export const applicationOperationDurationSeconds = new Histogram({
  name: 'secureinbox_application_operation_duration_seconds',
  help: 'Application operation duration in seconds.',
  labelNames: ['operation', 'result'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 15, 30, 60, 120],
  registers: [metricsRegistry],
});

export const schedulerLastSuccessTimestampSeconds = new Gauge({
  name: 'secureinbox_scheduler_last_success_timestamp_seconds',
  help: 'Unix timestamp of the last successful scheduled operation.',
  labelNames: ['operation'],
  registers: [metricsRegistry],
});

export const recordOperation = ({ operation, result, startedAt }) => {
  applicationOperationsTotal.inc({ operation, result });
  if (startedAt instanceof Date) {
    applicationOperationDurationSeconds.observe(
      { operation, result },
      Math.max(0, (Date.now() - startedAt.getTime()) / 1000)
    );
  }
  if (result === 'success' && operation.startsWith('scheduler_')) {
    schedulerLastSuccessTimestampSeconds.set({ operation }, Date.now() / 1000);
  }
};

export const metricsHandler = async (_req, res, next) => {
  try {
    res.set('Content-Type', metricsRegistry.contentType);
    res.end(await metricsRegistry.metrics());
  } catch (error) {
    next(error);
  }
};
