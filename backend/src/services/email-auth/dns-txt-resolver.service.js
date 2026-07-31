import { getServers } from 'node:dns';

import DNS from 'dns2';

const TXT_RECORD_TYPE = 16;
const SOA_RECORD_TYPE = 6;
const DEFAULT_TIMEOUT_MS = 5_000;

const positiveInteger = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
};

const minimumTtl = (values) => {
    const valid = values.map(positiveInteger).filter((value) => value !== null);
    return valid.length > 0 ? Math.min(...valid) : null;
};

const negativeTtlSeconds = (authorities = []) =>
    minimumTtl(
        authorities
            .filter((record) => record?.type === SOA_RECORD_TYPE)
            .flatMap((record) => [record.ttl, record.minimum])
    );

const dnsError = (message, code, response) => {
    const error = new Error(message);
    error.code = code;
    error.negativeTtlSeconds = negativeTtlSeconds(response?.authorities);
    return error;
};

export const normalizeTxtResponse = (response, question) => {
    const rcode = Number(response?.header?.rcode);
    if (rcode === 3) {
        throw dnsError(`DNS name not found: ${question}`, 'ENOTFOUND', response);
    }
    if (rcode !== 0) {
        throw dnsError(`DNS lookup failed with RCODE ${rcode}: ${question}`, 'EDNS', response);
    }

    const answers = (response?.answers || []).filter(
        (record) => record?.type === TXT_RECORD_TYPE && Array.isArray(record.data)
    );
    if (answers.length === 0) {
        throw dnsError(`No TXT record found: ${question}`, 'ENODATA', response);
    }

    return {
        records: answers.map((record) => record.data.map((chunk) => String(chunk))),
        ttlSeconds: minimumTtl(answers.map((record) => record.ttl)),
    };
};

export const createDnsTxtResolver = ({
    nameServers = getServers(),
    timeoutMs = DEFAULT_TIMEOUT_MS,
    client,
} = {}) => {
    const configuredServers = [...new Set(nameServers.map(String).filter(Boolean))];
    const resolver =
        client ||
        (configuredServers.length > 0
            ? new DNS({
                  nameServers: configuredServers,
                  timeout: Math.max(1, Number(timeoutMs) || DEFAULT_TIMEOUT_MS),
                  retries: 1,
              })
            : null);

    return async (question) => {
        if (!resolver) {
            const error = new Error('No system DNS resolvers are configured');
            error.code = 'ENODNS';
            throw error;
        }
        const response = await resolver.resolve(question, 'TXT');
        return normalizeTxtResponse(response, question);
    };
};

export const resolveTxtWithTtl = createDnsTxtResolver();
