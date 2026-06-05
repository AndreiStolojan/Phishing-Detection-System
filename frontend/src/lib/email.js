/** Helpers to read email fields defensively (shapes vary slightly by endpoint). */

export const emailId = (email) => email?.id || email?._id;

export const getSenderName = (email) => {
  const from = email?.from;
  if (!from) return email?.fromName || email?.fromAddress || 'Unknown sender';
  if (typeof from === 'string') return from;
  return from.name || from.address || 'Unknown sender';
};

export const getSenderAddress = (email) => {
  const from = email?.from;
  if (typeof from === 'string') return from;
  return from?.address || email?.fromAddress || '';
};

export const getSnippet = (email) =>
  email?.snippet || email?.preview || email?.textPreview || '';

/** Deterministic monogram (letter + hue) for a sender, so avatars are stable. */
export const getSenderMonogram = (email) => {
  const name = getSenderName(email);
  const letter = (name.trim()[0] || '?').toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return { letter, hue: hash % 360 };
};
