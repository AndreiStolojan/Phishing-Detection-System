import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDateRangeQuery } from '../../src/common/utils/date-range.js';

test('parseDateRangeQuery returns null when neither bound is present', () => {
    assert.equal(parseDateRangeQuery({}), null);
    assert.equal(parseDateRangeQuery(), null);
    assert.equal(parseDateRangeQuery({ days: '30' }), null);
});

test('parseDateRangeQuery parses a valid ISO pair into Dates', () => {
    const range = parseDateRangeQuery({
        from: '2026-06-10T00:00:00.000Z',
        to: '2026-06-11T00:00:00.000Z',
    });

    assert.ok(range.from instanceof Date);
    assert.ok(range.to instanceof Date);
    assert.equal(range.from.toISOString(), '2026-06-10T00:00:00.000Z');
    assert.equal(range.to.toISOString(), '2026-06-11T00:00:00.000Z');
});

test('parseDateRangeQuery rejects a lone bound', () => {
    assert.throws(
        () => parseDateRangeQuery({ from: '2026-06-10T00:00:00.000Z' }),
        (error) => error.code === 'INVALID_DATE_RANGE' && error.statusCode === 400
    );
    assert.throws(
        () => parseDateRangeQuery({ to: '2026-06-10T00:00:00.000Z' }),
        (error) => error.code === 'INVALID_DATE_RANGE' && error.statusCode === 400
    );
});

test('parseDateRangeQuery rejects unparseable dates', () => {
    assert.throws(
        () => parseDateRangeQuery({ from: 'not-a-date', to: '2026-06-11T00:00:00.000Z' }),
        (error) => error.code === 'INVALID_DATE_RANGE' && error.statusCode === 400
    );
});

test('parseDateRangeQuery rejects from >= to', () => {
    assert.throws(
        () =>
            parseDateRangeQuery({
                from: '2026-06-11T00:00:00.000Z',
                to: '2026-06-10T00:00:00.000Z',
            }),
        (error) => error.code === 'INVALID_DATE_RANGE'
    );
    assert.throws(
        () =>
            parseDateRangeQuery({
                from: '2026-06-10T00:00:00.000Z',
                to: '2026-06-10T00:00:00.000Z',
            }),
        (error) => error.code === 'INVALID_DATE_RANGE'
    );
});
