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
