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

export const scheduledTasksTotal = new Counter({
  name: 'secureinbox_scheduled_tasks_total',
  help: 'Completed scheduled tasks grouped by task and result.',
  labelNames: ['task', 'result'],
  registers: [metricsRegistry],
});

export const scheduledTaskLastSuccessTimestampSeconds = new Gauge({
  name: 'secureinbox_scheduled_task_last_success_timestamp_seconds',
  help: 'Unix timestamp of the last successful scheduled task.',
  labelNames: ['task'],
  registers: [metricsRegistry],
});

export const recordScheduledTask = ({ task, result }) => {
  if (!['auto_sync', 'daily_digest'].includes(task)) {
    throw new Error(`Unknown scheduled task metric label: ${task}`);
  }
  if (!['success', 'failure'].includes(result)) {
    throw new Error(`Unknown scheduled task result metric label: ${result}`);
  }
  scheduledTasksTotal.inc({ task, result });
  if (result === 'success') {
    scheduledTaskLastSuccessTimestampSeconds.set({ task }, Date.now() / 1000);
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
