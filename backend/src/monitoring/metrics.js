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

export const detectionProviderTotal = new Counter({
  name: 'secureinbox_detection_provider_total',
  help: 'Detection provider executions grouped by provider and bounded outcome.',
  labelNames: ['provider', 'result'],
  registers: [metricsRegistry],
});

export const gmailSyncTotal = new Counter({
  name: 'secureinbox_gmail_sync_total',
  help: 'Gmail sync executions grouped by mode and bounded result.',
  labelNames: ['mode', 'result'],
  registers: [metricsRegistry],
});

export const gmailMessagesIngestedTotal = new Counter({
  name: 'secureinbox_gmail_messages_ingested_total',
  help: 'New Gmail messages persisted by synchronization.',
  registers: [metricsRegistry],
});

export const gmailHistoryGapTotal = new Counter({
  name: 'secureinbox_gmail_history_gap_total',
  help: 'Expired Gmail history cursors requiring a bounded resync.',
  registers: [metricsRegistry],
});

export const gmailPushNotificationsTotal = new Counter({
  name: 'secureinbox_gmail_push_notifications_total',
  help: 'Gmail push notifications grouped by bounded delivery result.',
  labelNames: ['result'],
  registers: [metricsRegistry],
});

export const gmailWatchRenewalsTotal = new Counter({
  name: 'secureinbox_gmail_watch_renewals_total',
  help: 'Gmail watch renewal attempts grouped by bounded result.',
  labelNames: ['result'],
  registers: [metricsRegistry],
});

export const gmailPushLatencySeconds = new Histogram({
  name: 'secureinbox_gmail_push_latency_seconds',
  help: 'Elapsed time from Gmail push receipt until sync and scan completion.',
  buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
  registers: [metricsRegistry],
});

export const recordGmailSync = ({ mode, result }) => {
  if (!['backfill', 'incremental', 'resync'].includes(mode)) {
    throw new Error(`Unknown Gmail sync mode metric label: ${mode}`);
  }
  if (!['success', 'failure', 'skipped'].includes(result)) {
    throw new Error(`Unknown Gmail sync result metric label: ${result}`);
  }
  gmailSyncTotal.inc({ mode, result });
};

export const recordGmailMessagesIngested = (count) => {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Gmail ingested message count must be a non-negative integer');
  }
  if (count > 0) {
    gmailMessagesIngestedTotal.inc(count);
  }
};

export const recordGmailHistoryGap = () => {
  gmailHistoryGapTotal.inc();
};

export const recordGmailPushNotification = (result) => {
  if (!['processed', 'duplicate', 'unknown_account', 'rejected'].includes(result)) {
    throw new Error(`Unknown Gmail push notification result metric label: ${result}`);
  }
  gmailPushNotificationsTotal.inc({ result });
};

export const recordGmailWatchRenewal = (result) => {
  if (!['success', 'failure', 'skipped'].includes(result)) {
    throw new Error(`Unknown Gmail watch renewal result metric label: ${result}`);
  }
  gmailWatchRenewalsTotal.inc({ result });
};

export const recordGmailPushLatency = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error('Gmail push latency must be a non-negative finite number');
  }
  gmailPushLatencySeconds.observe(seconds);
};

export const recordScheduledTask = ({ task, result }) => {
  if (!['auto_sync', 'daily_digest', 'gmail_watch_renewal'].includes(task)) {
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
