// ─────────────────────────────────────────────────────────────────────────────
// context.js — contextul read-only transmis providerilor de detecție.
//
// Păstrează dependențele unei scanări într-un singur obiect înghețat, fără
// scrieri în baza de date. Detalii: docs/detection-engine.md.
// ─────────────────────────────────────────────────────────────────────────────

const cloneAndFreezePlainValue = (value) => {
    if (Array.isArray(value)) {
        return Object.freeze(value.map(cloneAndFreezePlainValue));
    }

    if (
        value &&
        typeof value === 'object' &&
        [Object.prototype, null].includes(Object.getPrototypeOf(value))
    ) {
        return Object.freeze(
            Object.fromEntries(
                Object.entries(value).map(([key, nestedValue]) => [
                    key,
                    cloneAndFreezePlainValue(nestedValue),
                ])
            )
        );
    }

    return value;
};

const freezePlainObject = (value = {}) => cloneAndFreezePlainValue(value);

export const createDetectionContext = ({
    email,
    senderListContext = {},
    brandContext = {},
    scanContext = {},
    userSettings = {},
    aiInput = {},
    semanticAnalyzer,
}) =>
    Object.freeze({
        // Documentele Mongoose nu sunt înghețate în profunzime: internalele lor
        // sunt mutabile prin design. Providerii primesc aceeași referință și o
        // tratează strict ca read-only.
        email,
        senderListContext: freezePlainObject(senderListContext),
        brandContext: freezePlainObject(brandContext),
        scanContext: freezePlainObject(scanContext),
        userSettings: freezePlainObject(userSettings),
        aiInput: freezePlainObject(aiInput),
        semanticAnalyzer,
    });
