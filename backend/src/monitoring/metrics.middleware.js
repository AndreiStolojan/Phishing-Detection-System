import {
  httpRequestDurationSeconds,
  httpRequestsInFlight,
  httpRequestsTotal,
} from './metrics.js';

const normalizeRoute = (req) => {
  const path = req.route?.path
    ? `${req.baseUrl || ''}${req.route.path}`
    : req.path;

  return path
    .replace(/\b[0-9a-f]{24}\b/gi, ':id')
    .replace(/\b\d+\b/g, ':id');
};

export const observeHttpRequests = (req, res, next) => {
  if (req.path === '/metrics') return next();

  const startedAt = process.hrtime.bigint();
  let complete = false;
  httpRequestsInFlight.inc();

  const finish = () => {
    if (complete) return;
    complete = true;
    httpRequestsInFlight.dec();

    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, Number(process.hrtime.bigint() - startedAt) / 1e9);
  };

  res.once('finish', finish);
  res.once('close', finish);
  return next();
};
