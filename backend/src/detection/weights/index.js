// ─────────────────────────────────────────────────────────────────────────────
// weights/index.js — registrul unic și verificat al greutăților de detecție.
//
// Orice cheie duplicată oprește importul, ca două funcționalități să nu poată
// suprascrie în tăcere același semnal. Detalii: docs/detection-engine.md.
// ─────────────────────────────────────────────────────────────────────────────

import { AI_WEIGHTS } from './ai.weights.js';
import { ATTACHMENT_RULE_WEIGHTS } from './attachment.weights.js';
import { LINK_RULE_WEIGHTS } from './link.weights.js';
import { SENDER_RULE_WEIGHTS } from './sender.weights.js';

export const RESERVED_WEIGHT_KEYS = Object.freeze([
    'user_blocklist_match',
]);

const reservedWeightKeySet = new Set(RESERVED_WEIGHT_KEYS);

export const mergeWeightModules = (modules) => {
    const merged = {};

    for (const weightModule of modules) {
        for (const [key, points] of Object.entries(weightModule)) {
            if (reservedWeightKeySet.has(key)) {
                throw new Error(`Reserved detection weight key: ${key}`);
            }

            if (Object.hasOwn(merged, key)) {
                throw new Error(`Duplicate detection weight key: ${key}`);
            }

            merged[key] = points;
        }
    }

    return Object.freeze(merged);
};

export const RULE_WEIGHTS = mergeWeightModules([
    LINK_RULE_WEIGHTS,
    ATTACHMENT_RULE_WEIGHTS,
    SENDER_RULE_WEIGHTS,
]);

export const AI_SIGNAL_WEIGHTS = mergeWeightModules([AI_WEIGHTS]);

export const ALL_SIGNAL_WEIGHTS = mergeWeightModules([
    RULE_WEIGHTS,
    AI_SIGNAL_WEIGHTS,
]);
