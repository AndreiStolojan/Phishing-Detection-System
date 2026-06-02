import { describe, expect, it } from 'vitest';

import { sanitizeEmailHtml } from '../../src/utils/sanitizeEmailHtml.js';

describe('sanitizeEmailHtml', () => {
  it('removes script tags and event handlers', () => {
    const result = sanitizeEmailHtml(
      '<div><script>alert(1)</script><a href="https://example.com" onclick="bad()">Open</a></div>'
    );

    expect(result).not.toContain('script');
    expect(result).not.toContain('onclick');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('keeps remote images after sanitizing unsafe markup', () => {
    const result = sanitizeEmailHtml('<img src="https://tracker.example/pixel.png" alt="pixel">');

    expect(result).toContain('<img');
    expect(result).toContain('src="https://tracker.example/pixel.png"');
    expect(result).toContain('alt="pixel"');
  });
});
