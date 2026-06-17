// ─────────────────────────────────────────────────────────────────────────────
// email.js — citire "defensivă" a câmpurilor unui email.
//
// Ce face, pe scurt: răspunsurile API pentru un email pot avea forme ușor
// diferite în funcție de endpoint (ex: `from` poate fi un string sau un obiect
// {name, address}, expeditorul poate fi sub `fromName`/`fromAddress` etc.).
// Funcțiile de aici citesc aceste câmpuri cu fallback-uri, ca restul UI-ului să
// nu trebuiască să verifice de fiecare dată toate formele posibile.
// ─────────────────────────────────────────────────────────────────────────────

// Id-ul emailului: unele endpoint-uri îl trimit ca `id`, altele ca `_id` (Mongo).
export const emailId = (email) => email?.id || email?._id;

// Numele expeditorului, cu fallback-uri în lanț: din `from` (obiect sau string),
// apoi `fromName`/`fromAddress`, în final un text generic "Unknown sender".
export const getSenderName = (email) => {
  const from = email?.from;
  if (!from) return email?.fromName || email?.fromAddress || 'Unknown sender';
  if (typeof from === 'string') return from;
  return from.name || from.address || 'Unknown sender';
};

// Adresa de email a expeditorului (folosită ex. pentru allowlist/blocklist).
export const getSenderAddress = (email) => {
  const from = email?.from;
  if (typeof from === 'string') return from;
  return from?.address || email?.fromAddress || '';
};

// Textul scurt de previzualizare al emailului (poate veni sub diverse nume de câmp).
export const getSnippet = (email) =>
  email?.snippet || email?.preview || email?.textPreview || '';

// Calculează o "monogramă" (literă + culoare) pentru avatarul expeditorului.
// E DETERMINISTĂ: același nume produce mereu aceeași literă și aceeași culoare
// (hue = nuanța din cercul de culori HSL, 0-359), printr-un hash simplu pe
// caracterele numelui — astfel avatarul nu "sare" la fiecare reîncărcare.
export const getSenderMonogram = (email) => {
  const name = getSenderName(email);
  const letter = (name.trim()[0] || '?').toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return { letter, hue: hash % 360 };
};
