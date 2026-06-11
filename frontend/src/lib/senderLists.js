/**
 * Client-side mirror of the backend list matcher (sender-list.service.js):
 * an exact sender entry beats a domain entry, domain entries match suffix-aware
 * (entry for paypal.com matches mail.paypal.com but not evil-paypal.com).
 * Used to show the current trust/block state on the email detail page.
 */

export const normalizeAddress = (value) => {
  const raw = String(value || '').trim();
  const angle = raw.match(/<([^>]+)>/);
  return (angle ? angle[1] : raw).trim().toLowerCase();
};

export const normalizeDomain = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.$/, '');

const domainMatches = (senderDomain, listedDomain) =>
  senderDomain === listedDomain || senderDomain.endsWith(`.${listedDomain}`);

export const findListEntries = (entries, senderAddress, senderDomain) => {
  const address = normalizeAddress(senderAddress);
  const domain = normalizeDomain(senderDomain);
  const all = entries || [];

  const senderEntry =
    (address && all.find((e) => e.kind === 'sender' && e.value === address)) || null;
  const domainEntry =
    (domain && all.find((e) => e.kind === 'domain' && domainMatches(domain, e.value))) || null;

  // Exact sender entry beats a domain entry — same precedence as the backend.
  return { senderEntry, domainEntry, match: senderEntry || domainEntry };
};

export const matchSenderList = (entries, senderAddress, senderDomain) =>
  findListEntries(entries, senderAddress, senderDomain).match;
