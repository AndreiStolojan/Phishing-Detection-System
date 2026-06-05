import DOMPurify from 'dompurify';

const hardenLinks = (documentNode) => {
  for (const link of Array.from(documentNode.querySelectorAll('a'))) {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener noreferrer');
  }
};

const isRemote = (value) => /^https?:/i.test(value || '');

/**
 * Strip remote images and background images (common tracking-pixel vectors) and
 * report how many were blocked, so the reader can offer a "Load images" control.
 */
const blockRemoteImages = (documentNode) => {
  let blocked = 0;

  for (const img of Array.from(documentNode.querySelectorAll('img'))) {
    if (isRemote(img.getAttribute('src'))) {
      img.remove();
      blocked += 1;
    }
  }

  for (const el of Array.from(documentNode.querySelectorAll('[style]'))) {
    const style = el.getAttribute('style') || '';
    if (/background(-image)?\s*:\s*[^;]*url\(\s*['"]?https?:/i.test(style)) {
      el.setAttribute(
        'style',
        style.replace(/background(-image)?\s*:\s*[^;]*url\([^)]*\)[^;]*;?/gi, '')
      );
      blocked += 1;
    }
  }

  for (const el of Array.from(documentNode.querySelectorAll('[background]'))) {
    if (isRemote(el.getAttribute('background'))) {
      el.removeAttribute('background');
      blocked += 1;
    }
  }

  return blocked;
};

/**
 * Sanitize email HTML for display. Scripts/iframes/forms are always stripped and
 * links hardened. When `blockImages` is set, remote images are removed and the
 * count is returned so the caller can show a privacy banner.
 *
 * @returns {{ html: string, blockedImages: number }}
 */
export const sanitizeEmailHtml = (html, { blockImages = false } = {}) => {
  if (typeof html !== 'string' || html.trim().length === 0) {
    return { html: '', blockedImages: 0 };
  }

  const sanitized = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['srcset'],
  });
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(sanitized, 'text/html');

  hardenLinks(documentNode);
  const blockedImages = blockImages ? blockRemoteImages(documentNode) : 0;

  return { html: documentNode.body.innerHTML.trim(), blockedImages };
};
