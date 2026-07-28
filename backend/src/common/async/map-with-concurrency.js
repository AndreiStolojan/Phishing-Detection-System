export const mapWithConcurrency = async (items, concurrency, mapper) => {
    if (!Array.isArray(items)) {
        throw new TypeError('items must be an array');
    }

    if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new RangeError('concurrency must be a positive integer');
    }

    if (typeof mapper !== 'function') {
        throw new TypeError('mapper must be a function');
    }

    const results = new Array(items.length);
    let nextIndex = 0;

    const worker = async () => {
        while (nextIndex < items.length) {
            const currentIndex = nextIndex;
            nextIndex += 1;
            results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        }
    };

    const workerCount = Math.min(concurrency, items.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return results;
};
