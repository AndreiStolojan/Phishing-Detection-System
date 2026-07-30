import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EmailBody, neutralizeLinks } from '../../src/components/inbox/EmailBody.jsx';

// SecureInbox renders phishing mail. A link inside the body must never be
// clickable — but its text and its real destination must stay readable, because
// "where did this claim to go" is the evidence the user is here to judge.
describe('EmailBody link neutralisation', () => {
  it('strips href from anchors while keeping the link text', () => {
    const { container } = render(
      <EmailBody
        htmlBody={'<p>Hi <a href="https://evil.example/login">paypal.com</a></p>'}
        riskBucket="safe"
      />
    );

    const anchor = container.querySelector('a');
    expect(anchor).not.toBeNull();
    expect(anchor).not.toHaveAttribute('href');
    expect(anchor).toHaveTextContent('paypal.com');
  });

  it('preserves the real destination for inspection instead of discarding it', () => {
    const { container } = render(
      <EmailBody
        htmlBody={'<a href="https://evil.example/login">Verify now</a>'}
        riskBucket="quarantine"
      />
    );

    const anchor = container.querySelector('a');
    expect(anchor.getAttribute('data-blocked-href')).toBe('https://evil.example/login');
    expect(anchor.getAttribute('title')).toContain('https://evil.example/login');
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
  });

  it('drops target and rel, which only matter on a navigable anchor', () => {
    // sanitizeEmailHtml hardens links with target/rel; neutralizeLinks runs
    // after it and must leave nothing behind that could be re-armed.
    const html = neutralizeLinks(
      '<a href="https://evil.example" target="_blank" rel="noopener noreferrer" ping="https://track.example">Open</a>'
    );

    // `data-blocked-href` legitimately contains "href", so match the real attribute.
    expect(html).not.toMatch(/\shref=/);
    expect(html).not.toContain('target=');
    expect(html).not.toContain('rel=');
    expect(html).not.toContain('ping=');
    expect(html).toContain('Open');
  });

  it('neutralises image-map areas too, not just anchors', () => {
    const html = neutralizeLinks('<map><area href="https://evil.example" alt="x"></map>');
    expect(html).not.toMatch(/\shref=/);
    expect(html).toContain('data-blocked-href="https://evil.example"');
  });

  it('falls back to plain text when there is no HTML body', () => {
    render(<EmailBody textBody="Your account will be closed." riskBucket="safe" />);
    expect(screen.getByText('Your account will be closed.')).toBeInTheDocument();
  });

  it('says so plainly when there is nothing to render', () => {
    render(<EmailBody riskBucket="safe" />);
    expect(screen.getByText('This message has no readable content.')).toBeInTheDocument();
  });
});
