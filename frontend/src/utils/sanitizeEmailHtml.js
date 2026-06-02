import DOMPurify from 'dompurify';

const hardenLinks = (documentNode) => {
  for (const link of Array.from(documentNode.querySelectorAll('a'))) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
};

export const sanitizeEmailHtml = (html) => {
  if (typeof html !== 'string' || html.trim().length === 0) {
    return '';
  }

  const sanitized = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['srcset'],
  });
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(sanitized, 'text/html');

  hardenLinks(documentNode);

  return documentNode.body.innerHTML.trim();
};
