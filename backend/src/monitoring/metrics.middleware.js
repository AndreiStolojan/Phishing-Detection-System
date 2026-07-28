import {
  httpRequestDurationSeconds,
  httpRequestsTotal,
} from './metrics.js';

const normalizeRoute = (req) => {
  // `req.path` is attacker-controlled for a 404 and is still available after
  // rate limiting. Never use it as a Prometheus label value.
  if (!req.route?.path) return 'unmatched';

  const path = `${req.baseUrl || ''}${req.route.path}`;

  return path
    .replace(/\b[0-9a-f]{24}\b/gi, ':id')
    .replace(/\b\d+\b/g, ':id');
};

const normalizeMethod = (method) =>
  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].includes(method)
    ? method
    : 'OTHER';

export const observeHttpRequests = (req, res, next) => {
  if (req.path === '/metrics') return next();

  const startedAt = process.hrtime.bigint();
  let complete = false;

  const finish = () => {
    if (complete) return;
    complete = true;

    const labels = {
      method: normalizeMethod(req.method),
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
