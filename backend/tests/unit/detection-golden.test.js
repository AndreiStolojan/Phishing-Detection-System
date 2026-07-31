// ─────────────────────────────────────────────────────────────────────────────
// detection-golden.test.js — dovada byte-for-byte pentru refactorul detecției.
//
// Rulează motorul modular peste corpusul v7, cu AI determinist, și compară
// rezultatul public de scorare cu baseline-ul înghețat înainte de refactor.
// Detalii: docs/detection-engine.md.
// ─────────────────────────────────────────────────────────────────────────────

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { createDetectionContext } from '../../src/detection/context.js';
import { runDetection } from '../../src/detection/index.js';
import { verifySenderBrand } from '../../src/services/brand-verification.service.js';

const corpusUrl = new URL('../fixtures/detection-corpus/', import.meta.url);
const snapshotUrl = new URL('../fixtures/detection-snapshot.json', import.meta.url);

const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;

const buildAiSignals = (fixture) =>
    fixture.ai.enabled
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

const characterizeFixture = async (fixture) => {
    const email = {
        senderDomain: 'example.test',
        replyToDomain: '',
        hasShortenedUrl: false,
        suspiciousLinkPatterns: [],
        attachmentExtensions: [],
        linkCount: 0,
        ...fixture.email,
    };
    const senderListContext = {
        senderAllowlisted: false,
        senderBlocklisted: false,
        listMatch: null,
        ...(fixture.listContext || {}),
    };
    const brandContext = verifySenderBrand({
        senderDomain: email.senderDomain,
    });
    const scanContext = senderListContext.senderBlocklisted
        ? {
              ...senderListContext,
              senderVerifiedBrand: false,
              brandName: null,
          }
        : {
              ...brandContext,
              ...senderListContext,
          };
    const aiSignals = buildAiSignals(fixture);
    const context = createDetectionContext({
        email,
        senderListContext,
        brandContext,
        scanContext,
        userSettings: { aiEnabled: fixture.ai.enabled },
        aiInput: { fixtureId: fixture.id },
        semanticAnalyzer: async () => aiSignals,
    });
    const result = await runDetection(context, {
        recordOutcome: () => {},
    });

    return {
        id: fixture.id,
        score: result.score,
        ruleScore: result.ruleScore,
        aiScore: result.aiScore,
        verdict: result.verdict,
        reasons: result.reasons,
        triggeredRules: result.triggeredRules,
        senderVerifiedBrand: Boolean(scanContext.senderVerifiedBrand),
        verifiedBrandName: scanContext.senderVerifiedBrand
            ? scanContext.brandName || null
            : null,
        senderListMatch: senderListContext.listMatch || null,
    };
};

test('runDetection reproduces the locked pre-refactor snapshot byte-for-byte', async () => {
    const expectedText = await readFile(snapshotUrl, 'utf8');
    const expected = JSON.parse(expectedText);
    const fixtureNames = (await readdir(corpusUrl))
        .filter((name) => name.endsWith('.json'))
        .sort();
    const fixtures = await Promise.all(
        fixtureNames.map(async (name) =>
            JSON.parse(await readFile(new URL(name, corpusUrl), 'utf8'))
        )
    );
    const results = [];

    for (const fixture of fixtures) {
        results.push(await characterizeFixture(fixture));
    }

    const actual = {
        schemaVersion: expected.schemaVersion,
        baselineEngineVersion: expected.baselineEngineVersion,
        baseRevision: expected.baseRevision,
        corpusSize: fixtures.length,
        results,
    };

    assert.equal(serialize(actual), expectedText);
});
