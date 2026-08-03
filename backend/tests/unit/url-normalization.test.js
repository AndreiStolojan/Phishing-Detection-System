import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getNormalizedUrlHashInput,
    normalizeHttpUrl,
} from '../../src/services/threat-intel/url-normalization.service.js';
import { analyzeEmailLinks } from '../../src/services/link-analysis.service.js';

test('normalizes web URLs without changing reserved percent encoding', () => {
    assert.equal(
        normalizeHttpUrl(
            'HTTP://EXAMPLE.COM:80/a/./b/../%7Ealice?utm_source=news&x=%7e%2f&fbclid=ignored&keep=1#section'
        ),
        'http://example.com/a/~alice?x=~%2F&keep=1'
    );
    assert.equal(
        normalizeHttpUrl('https://www.example.com:443/path#gclid-is-a-fragment'),
        'https://www.example.com/path'
    );
});

test('accepts only http(s) candidates and gives equivalent URLs one hash input', () => {
    assert.equal(normalizeHttpUrl('www.Example.com/offer?gclid=one'), 'https://www.example.com/offer');
    assert.equal(normalizeHttpUrl('javascript:alert(1)'), null);
    assert.equal(normalizeHttpUrl('ftp://example.com/file'), null);
    assert.equal(normalizeHttpUrl('data:text/html,hello'), null);

    assert.equal(
        getNormalizedUrlHashInput('https://EXAMPLE.com:443/a/../offer?utm_campaign=mail#top'),
        getNormalizedUrlHashInput('https://example.com/offer')
    );
});

test('deduplicates normalized text and HTML links before link analysis', () => {
    const result = analyzeEmailLinks({
        textBody: 'Open https://EXAMPLE.com:443/offer?utm_source=mail#one',
        htmlBody: '<a href="https://example.com/offer?fbclid=tracking">https://example.com/offer</a>',
    });

    assert.deepEqual(result.links, ['https://example.com/offer']);
    assert.deepEqual(result.linkDomains, ['example.com']);
    assert.equal(result.linkCount, 1);
});

test('reports an HTML anchor domain mismatch without retaining query values', () => {
    const result = analyzeEmailLinks({
        htmlBody: [
            '<a title="a > b" href="https://evil.example/login?recipient=person%40example.com&token=secret">',
            'https://Trusted.Example/account',
            '</a>',
        ].join(''),
    });

    assert.deepEqual(result.anchorMismatches, [
        {
            href: { scheme: 'https', domain: 'evil.example' },
            displayed: { scheme: 'https', domain: 'trusted.example' },
            anchorTextLength: 'https://Trusted.Example/account'.length,
        },
    ]);
    assert.doesNotMatch(JSON.stringify(result.anchorMismatches), /recipient|person|token|secret|login/);
});

test('does not report a mismatch for equivalent displayed domains or ordinary anchor copy', () => {
    const result = analyzeEmailLinks({
        htmlBody: [
            '<a href="https://example.com/welcome?token=secret">www.example.com</a>',
            '<a href="https://other.example/">Click to continue</a>',
        ].join(''),
    });

    assert.deepEqual(result.anchorMismatches, []);
});

test('extracts href only from bounded anchor elements', () => {
    const harmlessHrefAttribute = '<div href="https://not-an-anchor.example/">ignored</div>';
    const anchors = Array.from(
        { length: 205 },
        (_, index) => `<a href="https://example${index}.test/">link</a>`
    ).join('');
    const result = analyzeEmailLinks({ htmlBody: `${harmlessHrefAttribute}${anchors}` });

    assert.equal(result.linkCount, 200);
    assert.equal(result.links[0], 'https://example0.test/');
    assert.equal(result.links.at(-1), 'https://example199.test/');
    assert.equal(result.links.includes('https://not-an-anchor.example/'), false);
});
