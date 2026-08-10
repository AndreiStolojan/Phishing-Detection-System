import assert from 'node:assert/strict';
import test from 'node:test';

import { createGmailPushQueue } from '../../src/services/gmail-push-queue.service.js';

const createFakeTimers = () => {
    let time = 0;
    let nextId = 0;
    const timers = new Map();
    return {
        clock: () => time,
        setTimeoutFn(callback, delay) {
            const id = ++nextId;
            timers.set(id, { callback, dueAt: time + delay });
            return id;
        },
        clearTimeoutFn(id) { timers.delete(id); },
        advanceBy(milliseconds) {
            const target = time + milliseconds;
            while (true) {
                const due = [...timers.entries()]
                    .filter(([, timer]) => timer.dueAt <= target)
                    .sort(([, left], [, right]) => left.dueAt - right.dueAt)[0];
                if (!due) break;
                const [id, timer] = due;
                time = timer.dueAt;
                timers.delete(id);
                timer.callback();
            }
            time = target;
        },
    };
};

const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
};

test('debounces a burst per account for 2.5 seconds', async () => {
    const timers = createFakeTimers();
    const calls = [];
    const queue = createGmailPushQueue({
        sync: async ({ mailAccountId }) => calls.push(mailAccountId),
        ...timers,
    });

    assert.deepEqual(queue.enqueue({ mailAccountId: 'account-a', messageId: 'message-1' }), { accepted: true });
    timers.advanceBy(2_000);
    assert.deepEqual(queue.enqueue({ mailAccountId: 'account-a', messageId: 'message-2' }), { accepted: true });
    timers.advanceBy(2_499);
    await flush();
    assert.deepEqual(calls, []);
    timers.advanceBy(1);
    await queue.drain();
    assert.deepEqual(calls, ['account-a']);
});

test('deduplicates message ids until their TTL expires', async () => {
    const timers = createFakeTimers();
    const calls = [];
    const queue = createGmailPushQueue({
        sync: async ({ mailAccountId }) => calls.push(mailAccountId),
        duplicateTtlMs: 5_000,
        ...timers,
    });

    assert.deepEqual(queue.enqueue({ mailAccountId: 'account-a', messageId: 'same' }), { accepted: true });
    assert.deepEqual(queue.enqueue({ mailAccountId: 'account-a', messageId: 'same' }), { accepted: false, reason: 'duplicate' });
    timers.advanceBy(2_500);
    await queue.drain();
    timers.advanceBy(2_500);
    assert.deepEqual(queue.enqueue({ mailAccountId: 'account-a', messageId: 'same' }), { accepted: true });
    timers.advanceBy(2_500);
    await queue.drain();
    assert.deepEqual(calls, ['account-a', 'account-a']);
});

test('respects concurrency across accounts', async () => {
    const timers = createFakeTimers();
    const started = [];
    const releases = [];
    const queue = createGmailPushQueue({
        concurrency: 2,
        sync: ({ mailAccountId }) => new Promise((resolve) => {
            started.push(mailAccountId);
            releases.push(resolve);
        }),
        ...timers,
    });

    for (const accountId of ['a', 'b', 'c']) {
        queue.enqueue({ mailAccountId: accountId, messageId: `message-${accountId}` });
    }
    timers.advanceBy(2_500);
    await flush();
    assert.deepEqual(started, ['a', 'b']);
    releases.shift()();
    await flush();
    assert.deepEqual(started, ['a', 'b', 'c']);
    releases.forEach((release) => release());
    await queue.drain();
});

test('notifications while running create at most one debounced follow-up', async () => {
    const timers = createFakeTimers();
    const releases = [];
    let calls = 0;
    const queue = createGmailPushQueue({
        sync: () => new Promise((resolve) => {
            calls += 1;
            releases.push(resolve);
        }),
        ...timers,
    });

    queue.enqueue({ mailAccountId: 'account-a', messageId: 'first' });
    timers.advanceBy(2_500);
    await flush();
    queue.enqueue({ mailAccountId: 'account-a', messageId: 'second' });
    queue.enqueue({ mailAccountId: 'account-a', messageId: 'third' });
    timers.advanceBy(2_500);
    await flush();
    assert.equal(calls, 1);
    releases.shift()();
    await flush();
    assert.equal(calls, 2);
    releases.shift()();
    await queue.drain();
    assert.equal(calls, 2);
});

test('enforces account capacity and stopAccepting prevents new work', () => {
    const timers = createFakeTimers();
    const queue = createGmailPushQueue({ sync: async () => {}, capacity: 1, ...timers });

    assert.deepEqual(queue.enqueue({ mailAccountId: 'a', messageId: 'one' }), { accepted: true });
    assert.deepEqual(queue.enqueue({ mailAccountId: 'b', messageId: 'two' }), { accepted: false, reason: 'capacity' });
    queue.stopAccepting();
    assert.deepEqual(queue.enqueue({ mailAccountId: 'a', messageId: 'three' }), { accepted: false, reason: 'stopped' });
});

test('drain waits for pending debounce and running work', async () => {
    const timers = createFakeTimers();
    let release;
    const queue = createGmailPushQueue({
        sync: () => new Promise((resolve) => { release = resolve; }),
        ...timers,
    });
    queue.enqueue({ mailAccountId: 'a', messageId: 'one' });
    let drained = false;
    queue.drain().then(() => { drained = true; });
    await flush();
    assert.equal(drained, false);
    timers.advanceBy(2_500);
    await flush();
    assert.equal(drained, false);
    release();
    await queue.drain();
    assert.equal(drained, true);
});

test('shutdown flushes pending debounce work without starting unbounded work', async () => {
    const timers = createFakeTimers();
    const calls = [];
    const queue = createGmailPushQueue({ sync: async (input) => calls.push(input), ...timers });
    queue.enqueue({ mailAccountId: 'a', messageId: 'one' });

    queue.stopAccepting();
    await queue.drain();

    assert.equal(calls.length, 1);
});

test('validates queue dependencies and notification identity', () => {
    assert.throws(() => createGmailPushQueue(), /sync must be a function/);
    const queue = createGmailPushQueue({ sync: async () => {} });
    assert.throws(() => queue.enqueue({ mailAccountId: '', messageId: 'id' }), /mailAccountId/);
    assert.throws(() => queue.enqueue({ mailAccountId: 'account', messageId: '' }), /messageId/);
});

test('passes the earliest coalesced receipt time to latency measurement', async () => {
    const timers = createFakeTimers();
    const calls = [];
    const queue = createGmailPushQueue({ sync: async (input) => calls.push(input), ...timers });

    queue.enqueue({
        mailAccountId: 'account',
        messageId: 'first',
        notificationReceivedAt: new Date(100),
    });
    queue.enqueue({
        mailAccountId: 'account',
        messageId: 'second',
        notificationReceivedAt: new Date(200),
    });
    timers.advanceBy(2_500);
    await queue.drain();

    assert.deepEqual(calls, [{ mailAccountId: 'account', notificationReceivedAt: 100 }]);
});
