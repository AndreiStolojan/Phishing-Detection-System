import assert from 'node:assert/strict';
import test from 'node:test';

import { mapWithConcurrency } from '../../src/common/async/map-with-concurrency.js';

test('mapWithConcurrency preserves result order and respects the limit', async () => {
    let activeCount = 0;
    let peakActiveCount = 0;

    const results = await mapWithConcurrency([1, 2, 3, 4], 2, async (value) => {
        activeCount += 1;
        peakActiveCount = Math.max(peakActiveCount, activeCount);
        await new Promise((resolve) => setTimeout(resolve, 5));
        activeCount -= 1;
        return value * 10;
    });

    assert.deepEqual(results, [10, 20, 30, 40]);
    assert.equal(peakActiveCount, 2);
});

test('mapWithConcurrency handles an empty list without invoking the mapper', async () => {
    let mapperCalled = false;
    const results = await mapWithConcurrency([], 1, async () => {
        mapperCalled = true;
    });

    assert.deepEqual(results, []);
    assert.equal(mapperCalled, false);
});

test('mapWithConcurrency rejects invalid concurrency values', async () => {
    await assert.rejects(
        () => mapWithConcurrency([1], 0, async (value) => value),
        /positive integer/
    );
});
