import { FRONTEND_APP_URL } from '../../src/config/env.js';

/*
  SecureInbox transactional emails — one shared, on-brand, bulletproof shell used
  by the welcome, monthly digest, and phishing alert messages. Dark by default to
  mirror the app, with every colour set inline so it renders consistently across
  Gmail, Apple Mail, and Outlook. Risk hexes mirror src/lib/risk.js.
*/

const C = {
  bg: '#0a0d14',
  card: '#11151f',
  inner: '#161d2b',
  border: '#1f2838',
  fg: '#e7ecf3',
  muted: '#9aa6ba',
  subtle: '#6b7689',
  primary: '#3b9eff',
  onPrimary: '#04111f',
  safe: '#34c77b',
  review: '#f0b429',
  quarantine: '#f5506a',
  phishing: '#c4313a',
};

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const APP_URL = (FRONTEND_APP_URL || 'http://localhost:5173').replace(/\/$/, '');

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatNumber = (value) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat('en').format(Number(value || 0))
    : escapeHtml(value);

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));

// Turn rule ids like "reply_to_mismatch" / "link:shortener" into "Reply To Mismatch".
const humanizeRule = (value) =>
  String(value ?? '')
    .replace(/[:_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const formatMonth = (month) => {
  const [year, monthValue] = String(month).split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthValue) - 1, 1));
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

/** Bulletproof CTA button. */
const ctaButton = (label, href, bg = C.primary, color = C.onPrimary) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0;">
    <tr>
      <td align="center" bgcolor="${bg}" style="border-radius:10px;">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:12px 24px;font-family:${FONT};font-size:14px;font-weight:600;line-height:1;color:${color};text-decoration:none;border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

/** Shared shell: branded header, accent strip, dark card, footer. */
const shell = ({ preheader, accent = C.primary, title, eyebrow, body }) => `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark light">
  <meta name="supported-color-schemes" content="dark light">
</head>
<body style="margin:0;padding:0;background:${C.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">
    ${escapeHtml(preheader || '')}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 4px 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <div style="width:36px;height:36px;background:${C.primary};border-radius:10px;text-align:center;line-height:36px;font-family:${FONT};font-size:18px;font-weight:700;color:${C.onPrimary};">S</div>
                  </td>
                  <td style="font-family:${FONT};font-size:16px;font-weight:600;color:${C.fg};">SecureInbox</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;overflow:hidden;">
              <div style="height:3px;background:${accent};font-size:0;line-height:0;">&nbsp;</div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:28px;">
                    ${eyebrow ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};">${escapeHtml(eyebrow)}</p>` : ''}
                    ${title ? `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:700;color:${C.fg};">${escapeHtml(title)}</h1>` : ''}
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 8px;text-align:center;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.subtle};">
              SecureInbox — a security layer for your inbox.<br>
              <a href="${APP_URL}/dashboard" target="_blank" style="color:${C.muted};text-decoration:underline;">Open SecureInbox</a>
              &nbsp;·&nbsp; Manage emails in Settings → Notifications<br>
              © ${new Date().getFullYear()} SecureInbox
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const paragraph = (html) =>
  `<p style="margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.fg};">${html}</p>`;

const mutedLine = (html) =>
  `<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.subtle};">${html}</p>`;

const welcomeTemplate = (userName, createdAt) => ({
  subject: `Welcome to SecureInbox, ${userName}`,
  html: shell({
    preheader: 'Your SecureInbox account is ready — connect Gmail to start scanning.',
    accent: C.primary,
    eyebrow: 'Welcome',
    title: `You're all set, ${escapeHtml(userName)}`,
    body: `
      ${paragraph('Your account is ready. SecureInbox sits on top of your Gmail, scans every message for phishing signals, and gives each one a clear risk verdict — so you can read your inbox with confidence.')}
      ${paragraph('Connect your Gmail to start syncing and scanning.')}
      ${ctaButton('Open SecureInbox', `${APP_URL}/dashboard`)}
      ${mutedLine(`Account created ${escapeHtml(createdAt)}.`)}
    `,
  }),
});

const renderMetric = (label, value, hex) => `
  <td width="50%" style="padding:6px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.inner};border:1px solid ${C.border};border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding-right:7px;"><div style="width:8px;height:8px;border-radius:50%;background:${hex};"></div></td>
              <td style="font-family:${FONT};font-size:12px;color:${C.muted};">${escapeHtml(label)}</td>
            </tr>
          </table>
          <p style="margin:6px 0 0;font-family:${FONT};font-size:24px;font-weight:700;color:${C.fg};">${formatNumber(value)}</p>
        </td>
      </tr>
    </table>
  </td>`;

const RULE_DESCRIPTIONS = {
  reply_to_mismatch: 'Reply-To address differs from sender domain',
  shortened_url_detected: 'Email contains shortened or redirected URLs',
  high_risk_attachment_extension: 'Dangerous attachment type attached',
};

const getRuleDescription = (rule) => {
  if (RULE_DESCRIPTIONS[rule]) return RULE_DESCRIPTIONS[rule];
  if (/^too_many_links/.test(rule)) return 'Unusually high number of links';
  if (/^ai_semantic:/.test(rule)) return 'AI detected suspicious intent';
  return humanizeRule(rule);
};

const renderRules = (rules = []) => {
  if (rules.length === 0) {
    return `<p style="margin:0;font-family:${FONT};font-size:14px;color:${C.muted};">No rules were triggered this period.</p>`;
  }
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${rules
        .slice(0, 6)
        .map(
          (item) => `
        <tr>
          <td style="padding:9px 0;border-bottom:1px solid ${C.border};">
            <p style="margin:0;font-family:${FONT};font-size:14px;color:${C.fg};">${escapeHtml(getRuleDescription(item.rule))}</p>
            <p style="margin:2px 0 0;font-family:${FONT};font-size:11px;color:${C.subtle};">${escapeHtml(humanizeRule(item.rule))}</p>
          </td>
          <td style="padding:9px 0;border-bottom:1px solid ${C.border};font-family:${FONT};font-size:14px;font-weight:700;color:${C.fg};text-align:right;vertical-align:top;">${formatNumber(item.count)}×</td>
        </tr>`
        )
        .join('')}
    </table>`;
};

export const monthlyDigestTemplate = ({ summary, userName }) => {
  const monthLabel = formatMonth(summary.period.month);
  const counts = summary.counts;
  const ai = summary.ai;
  const safeRate =
    counts.scannedEmails > 0 ? Math.round((counts.safe / counts.scannedEmails) * 100) : 0;
  const heroAccent = safeRate >= 80 ? C.safe : safeRate >= 50 ? C.review : C.quarantine;

  const threats = (counts.suspicious || 0) + (counts.likelyPhishing || 0) + (counts.markedPhishing || 0);
  const synced = counts.syncedEmails ?? counts.scannedEmails;
  const scanned = counts.scannedEmails;

  return {
    subject: `Your SecureInbox report — ${monthLabel}`,
    html: shell({
      preheader: `${safeRate}% safe · ${formatNumber(threats)} threat${threats !== 1 ? 's' : ''} found in ${monthLabel}.`,
      accent: heroAccent,
      eyebrow: 'Monthly security briefing',
      title: `Security summary for ${monthLabel}`,
      body: `
        ${paragraph(`Hi ${escapeHtml(userName)}, here's how SecureInbox protected your inbox this month.`)}

        <!-- Hero: safe rate -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.inner};border:1px solid ${C.border};border-radius:12px;margin:4px 0 12px;">
          <tr><td style="padding:20px;text-align:center;">
            <p style="margin:0;font-family:${FONT};font-size:40px;font-weight:700;line-height:1;color:${heroAccent};">${safeRate}%</p>
            <p style="margin:6px 0 0;font-family:${FONT};font-size:13px;color:${C.muted};">of scanned messages were safe</p>
            <p style="margin:6px 0 0;font-family:${FONT};font-size:12px;color:${C.subtle};">${formatNumber(scanned)} emails scanned &mdash; ${formatNumber(threats)} threat${threats !== 1 ? 's' : ''} found</p>
          </td></tr>
        </table>

        <!-- Detection flow summary -->
        ${mutedLine(`Synced: <strong style="color:${C.muted};">${formatNumber(synced)}</strong> &nbsp;&middot;&nbsp; Scanned: <strong style="color:${C.muted};">${formatNumber(scanned)}</strong> &nbsp;&middot;&nbsp; Threats: <strong style="color:${C.quarantine};">${formatNumber(threats)}</strong>`)}

        <!-- Risk breakdown grid -->
        <h2 style="margin:20px 0 10px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${C.muted};">Risk breakdown</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 -6px;">
          <tr>
            ${renderMetric('Safe', counts.safe, C.safe)}
            ${renderMetric('Suspicious', counts.suspicious, C.review)}
          </tr>
          <tr>
            ${renderMetric('Likely phishing', counts.likelyPhishing, C.quarantine)}
            ${renderMetric('Confirmed phishing', counts.markedPhishing, C.phishing)}
          </tr>
        </table>

        <h2 style="margin:24px 0 12px;font-family:${FONT};font-size:16px;font-weight:600;color:${C.fg};">Top triggered rules</h2>
        ${renderRules(summary.topTriggeredRules)}

        ${mutedLine(`AI analyzed <strong style="color:${C.fg};">${formatNumber(ai.evaluated)}</strong> of ${formatNumber(scanned)} scanned emails. ${formatNumber(ai.failed)} failed (Ollama unavailable) &nbsp;&middot;&nbsp; ${formatNumber(ai.disabled)} skipped (AI off).`)}

        <div style="margin-top:20px;">${ctaButton('View your inbox', `${APP_URL}/inbox`)}</div>

        ${mutedLine(`Period: ${escapeHtml(summary.period.from)} – ${escapeHtml(summary.period.to)}. Generated ${escapeHtml(formatDate(summary.generatedAt))}.`)}
      `,
    }),
  };
};

export const phishingAlertTemplate = ({ userName, emails, detectedAt }) => {
  const emailCount = emails.length;
  const subject =
    emailCount === 1
      ? '[SecureInbox] Phishing email detected in your inbox'
      : `[SecureInbox] ${emailCount} phishing emails detected in your inbox`;

  const rows = emails
    .map(
      (email) => {
        const scoreLabel = email.score != null
          ? `<span style="float:right;font-family:${FONT};font-size:11px;font-weight:700;color:${C.quarantine};">Score ${Math.round(email.score)}</span>`
          : '';
        return `
      <tr>
        <td style="padding:0;border-bottom:1px solid ${C.border};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td width="4" style="background:${C.quarantine};border-radius:0;font-size:0;line-height:0;">&nbsp;</td>
              <td style="padding:12px 14px;">
                <p style="margin:0;font-family:${FONT};font-size:14px;font-weight:600;color:${C.fg};">${escapeHtml(email.subject || '(no subject)')}${scoreLabel}</p>
                <p style="margin:3px 0 0;font-family:${FONT};font-size:12px;color:${C.muted};">From: ${escapeHtml(email.from || 'unknown sender')}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
      }
    )
    .join('');

  const singleEmailId = emailCount === 1
    ? (emails[0].providerMessageId || String(emails[0]._id) || null)
    : null;
  const ctaHref = singleEmailId
    ? `${APP_URL}/inbox/${singleEmailId}`
    : `${APP_URL}/inbox?riskBucket=quarantine`;

  return {
    subject,
    html: shell({
      preheader: `Action needed: SecureInbox flagged ${emailCount} phishing message${emailCount > 1 ? 's' : ''} — do not interact until reviewed.`,
      accent: C.quarantine,
      eyebrow: 'Phishing alert',
      title: `⚠ Phishing detected in your inbox`,
      body: `
        ${paragraph(`Hi ${escapeHtml(userName)}, SecureInbox flagged <strong style="color:${C.quarantine};">${emailCount} message${emailCount > 1 ? 's' : ''}</strong> as likely phishing during the latest sync on ${escapeHtml(detectedAt)}.`)}
        ${paragraph(`<strong>Do not click any links or download attachments</strong> from these messages until you have reviewed them in SecureInbox.`)}

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.inner};border:1px solid ${C.border};border-radius:12px;overflow:hidden;margin:4px 0 16px;">
          ${rows}
        </table>

        ${ctaButton('Review flagged messages', ctaHref, C.quarantine, '#ffffff')}
        ${mutedLine('You receive this because phishing alerts are enabled. Turn them off in Settings → Notifications.')}
      `,
    }),
  };
};

export default welcomeTemplate;
