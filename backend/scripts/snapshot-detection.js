// ─────────────────────────────────────────────────────────────────────────────
// snapshot-detection.js — corpus de caracterizare pentru motorul de detecție.
//
// Generează o singură dată baseline-ul rules-ai-v7 înainte de refactor și îl
// verifică ulterior fără MongoDB sau Ollama. Detalii: docs/EXPLICATIE_BACKEND.md §4.
// ─────────────────────────────────────────────────────────────────────────────

import { execFileSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASELINE_ENGINE_VERSION = 'rules-ai-v7';
const BASELINE_REVISION = '0d4b7b2db9c9064e5d0dabe673058fd28d7518dd';
const MINIMUM_CORPUS_SIZE = 30;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendDirectory = path.resolve(scriptDirectory, '..');
const corpusDirectory = path.join(
    backendDirectory,
    'tests',
    'fixtures',
    'detection-corpus'
);
const snapshotPath = path.join(
    backendDirectory,
    'tests',
    'fixtures',
    'detection-snapshot.json'
);

const [mode = '--check', ...extraArguments] = process.argv.slice(2);

if (!['--check', '--write'].includes(mode) || extraArguments.length > 0) {
    console.error('Usage: node scripts/snapshot-detection.js [--check|--write]');
    process.exitCode = 2;
} else {
    await main(mode);
}

async function main(selectedMode) {
    setTestEnvironmentDefaults();

    const [
        {
            CURRENT_SCAN_ENGINE_VERSION,
            calculateAiScoreFromSignals,
            calculateRulesForEmail,
            mapScoreToVerdict,
        },
        { verifySenderBrand },
        { SCORE_MAX },
    ] = await Promise.all([
        import('../src/services/scan.service.js'),
        import('../src/services/brand-verification.service.js'),
        import('../src/config/scoring.config.js'),
    ]);

    const fixtures = await loadFixtures();
    const results = fixtures.map((fixture) =>
        characterizeFixture({
            fixture,
            calculateAiScoreFromSignals,
            calculateRulesForEmail,
            mapScoreToVerdict,
            verifySenderBrand,
            scoreMax: SCORE_MAX,
        })
    );

    if (selectedMode === '--write') {
        assertBaselineWriteAllowed(CURRENT_SCAN_ENGINE_VERSION);
        const snapshot = {
            schemaVersion: 1,
            baselineEngineVersion: BASELINE_ENGINE_VERSION,
            baseRevision: BASELINE_REVISION,
            corpusSize: fixtures.length,
            results,
        };

        await writeFile(snapshotPath, serialize(snapshot), 'utf8');
        console.log(
            `Wrote ${fixtures.length} detection fixtures from ${BASELINE_ENGINE_VERSION}.`
        );
        return;
    }

    const expectedText = await readFile(snapshotPath, 'utf8');
    const expected = JSON.parse(expectedText);

    validateSnapshotMetadata(expected);

    const actual = {
        schemaVersion: 1,
        baselineEngineVersion: BASELINE_ENGINE_VERSION,
        baseRevision: BASELINE_REVISION,
        corpusSize: fixtures.length,
        results,
    };
    const actualText = serialize(actual);

    if (actualText !== expectedText) {
        const firstDifference = actual.results.find((result, index) =>
            serialize(result) !== serialize(expected.results[index])
        );
        throw new Error(
            `Detection snapshot mismatch at fixture ${firstDifference?.id || 'metadata'}. ` +
            'Do not regenerate the v7 baseline; inspect the behavior change.'
        );
    }

    console.log(
        `Detection snapshot matches ${fixtures.length} fixtures from ${expected.baselineEngineVersion}.`
    );
}

function assertBaselineWriteAllowed(currentEngineVersion) {
    if (currentEngineVersion !== BASELINE_ENGINE_VERSION) {
        throw new Error(
            `Refusing to write the ${BASELINE_ENGINE_VERSION} baseline with ${currentEngineVersion}.`
        );
    }

    try {
        execFileSync(
            'git',
            [
                'diff',
                '--quiet',
                BASELINE_REVISION,
                '--',
                'backend/src',
            ],
            {
                cwd: path.resolve(backendDirectory, '..'),
                stdio: 'ignore',
            }
        );
    } catch {
        throw new Error(
            `Refusing to write: backend/src differs from pinned baseline ${BASELINE_REVISION}.`
        );
    }
}

function setTestEnvironmentDefaults() {
    const defaults = {
        NODE_ENV: 'test',
        PORT: '5500',
        DB_URI: 'mongodb://127.0.0.1:27017/secureinbox-test',
        JWT_SECRET: 'snapshot-test-secret',
        JWT_EXPIRES_IN: '1h',
        MAIL_TOKEN_ENCRYPTION_KEY: 'snapshot-mail-token-key',
        FRONTEND_APP_URL: 'http://localhost:5173',
    };

    for (const [key, value] of Object.entries(defaults)) {
        process.env[key] ??= value;
    }
}

async function loadFixtures() {
    const entries = await readdir(corpusDirectory, { withFileTypes: true });
    const fixtureNames = entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => entry.name)
        .sort();

    if (fixtureNames.length < MINIMUM_CORPUS_SIZE) {
        throw new Error(
            `Detection corpus must contain at least ${MINIMUM_CORPUS_SIZE} JSON fixtures.`
        );
    }

    const fixtures = await Promise.all(
        fixtureNames.map(async (fixtureName) => {
            const fixturePath = path.join(corpusDirectory, fixtureName);
            const fixture = JSON.parse(await readFile(fixturePath, 'utf8'));

            if (!fixture.id || !fixture.email || !fixture.ai) {
                throw new Error(
                    `${fixtureName} must define id, email, and ai fields.`
                );
            }

            return fixture;
        })
    );
    const ids = fixtures.map((fixture) => fixture.id);

    if (new Set(ids).size !== ids.length) {
        throw new Error('Detection fixture ids must be unique.');
    }

    return fixtures;
}

function characterizeFixture({
    fixture,
    calculateAiScoreFromSignals,
    calculateRulesForEmail,
    mapScoreToVerdict,
    verifySenderBrand,
    scoreMax,
}) {
    const email = {
        senderDomain: 'example.test',
        replyToDomain: '',
        hasShortenedUrl: false,
        suspiciousLinkPatterns: [],
        attachmentExtensions: [],
        linkCount: 0,
        ...fixture.email,
    };
    const listContext = {
        senderAllowlisted: false,
        senderBlocklisted: false,
        listMatch: null,
        ...(fixture.listContext || {}),
    };
    const brandContext = verifySenderBrand({
        senderDomain: email.senderDomain,
    });
    const scanContext = listContext.senderBlocklisted
        ? {
              ...listContext,
              senderVerifiedBrand: false,
              brandName: null,
          }
        : {
              ...brandContext,
              ...listContext,
          };
    const aiSignals = fixture.ai.enabled
        ? {
              status: 'evaluated',
              urgencyLevel: 'none',
              sensitiveDataRequest: false,
              loginOrActionRequest: false,
              socialEngineeringLevel: 'none',
              brandImpersonationSuspected: false,
              ...(fixture.ai.signals || {}),
          }
        : {
              status: 'disabled',
          };
    const rulesResult = calculateRulesForEmail(email, scanContext);
    const aiResult = calculateAiScoreFromSignals(aiSignals, scanContext);
    const score = Math.min(
        scoreMax,
        rulesResult.ruleScore + aiResult.aiScore
    );

    return {
        id: fixture.id,
        score,
        ruleScore: rulesResult.ruleScore,
        aiScore: aiResult.aiScore,
        verdict: mapScoreToVerdict(score),
        reasons: [...rulesResult.reasons, ...aiResult.aiReasons],
        triggeredRules: [
            ...rulesResult.triggeredRules,
            ...aiResult.aiTriggeredRules,
        ],
        senderVerifiedBrand: Boolean(scanContext.senderVerifiedBrand),
        verifiedBrandName: scanContext.senderVerifiedBrand
            ? scanContext.brandName || null
            : null,
        senderListMatch: listContext.listMatch || null,
    };
}

function validateSnapshotMetadata(snapshot) {
    const expectedKeys = [
        'baseRevision',
        'baselineEngineVersion',
        'corpusSize',
        'results',
        'schemaVersion',
    ];
    const actualKeys = Object.keys(snapshot).sort();

    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
        throw new Error('Detection snapshot contains unexpected metadata fields.');
    }

    if (snapshot.schemaVersion !== 1) {
        throw new Error('Unsupported detection snapshot schema version.');
    }

    if (snapshot.baselineEngineVersion !== BASELINE_ENGINE_VERSION) {
        throw new Error(
            `Expected baseline engine ${BASELINE_ENGINE_VERSION}, received ${snapshot.baselineEngineVersion}.`
        );
    }

    if (snapshot.baseRevision !== BASELINE_REVISION) {
        throw new Error(
            `Expected baseline revision ${BASELINE_REVISION}, received ${snapshot.baseRevision}.`
        );
    }

    if (!Array.isArray(snapshot.results)) {
        throw new Error('Detection snapshot results must be an array.');
    }
}

function serialize(value) {
    return `${JSON.stringify(value, null, 2)}\n`;
}
