import assert from 'node:assert/strict';
import test from 'node:test';
import { EventEmitter } from 'node:events';
import { metricsHandler, metricsRegistry } from '../../src/monitoring/metrics.js';
import { observeHttpRequests } from '../../src/monitoring/metrics.middleware.js';

test('HTTP metrics use normalized routes and never retain object ids', async () => {
  const req = {
    method: 'GET',
    path: '/api/v1/emails/507f1f77bcf86cd799439011',
  };
  const res = new EventEmitter();
  res.statusCode = 200;

  observeHttpRequests(req, res, () => {});
  res.emit('finish');

  const output = await metricsRegistry.metrics();
  assert.match(output, /route="\/api\/v1\/emails\/:id"/);
  assert.doesNotMatch(output, /507f1f77bcf86cd799439011/);
});

test('metrics endpoint returns Prometheus text without application data', async () => {
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    end(value) { this.body = value; },
  };

  await metricsHandler({}, response, (error) => { throw error; });

  assert.match(response.headers['Content-Type'], /text\/plain/);
  assert.match(response.body, /secureinbox_http_requests_total/);
  assert.doesNotMatch(response.body, /@|gmail|token/i);
});
