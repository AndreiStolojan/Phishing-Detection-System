const welcomeTemplate = (userName, createdAt) => ({
  subject: `Bine ai venit, ${userName}! 🎉`,
  html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f4f4f5;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0; padding: 40px; text-align: center;">
          <div style="width: 80px; height: 80px; background-color: white; border-radius: 50%; margin: 0 auto 20px; line-height: 80px; font-size: 36px; font-weight: bold; color: #667eea;">
            ${userName.charAt(0).toUpperCase()}
          </div>
          <h1 style="color: white; margin: 0; font-family: 'Segoe UI', Arial, sans-serif; font-size: 28px;">
            Bine ai venit, ${userName}!
          </h1>
        </div>

        <div style="background-color: white; border-radius: 0 0 16px 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <h2 style="font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin-top: 0; font-size: 20px;">
            🎊 Contul tău a fost creat cu succes!
          </h2>

          <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #555; line-height: 1.6;">
            Suntem încântați să te avem alături de noi. Contul tău este acum activ și gata de utilizare.
          </p>

          <div style="background-color: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; font-family: 'Segoe UI', Arial, sans-serif;">
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #666;">
                  👤 Nume
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #e9ecef; color: #333; font-weight: 600; text-align: right;">
                  ${userName}
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #666;">
                  📅 Data înregistrării
                </td>
                <td style="padding: 12px 0; color: #333; font-weight: 600; text-align: right;">
                  ${createdAt}
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="font-family: 'Segoe UI', Arial, sans-serif; color: #666; font-size: 14px;">
              Dacă ai întrebări, nu ezita să ne contactezi! 💬
            </p>
          </div>

        </div>

        <p style="text-align: center; font-family: 'Segoe UI', Arial, sans-serif; color: #999; font-size: 12px; margin-top: 30px;">
          © 2026 Toate drepturile rezervate
        </p>

      </div>
    </body>
    </html>
  `
});

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatNumber = (value) =>
  Number.isFinite(Number(value))
    ? new Intl.NumberFormat('ro-RO').format(Number(value || 0))
    : escapeHtml(value);

const formatDate = (value) =>
  new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest',
  }).format(new Date(value));

const formatMonth = (month) => {
  const [year, monthValue] = String(month).split('-');
  const date = new Date(Date.UTC(Number(year), Number(monthValue) - 1, 1));

  return new Intl.DateTimeFormat('ro-RO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
};

const renderMetric = (label, value) => `
  <tr>
    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #4b5563;">
      ${escapeHtml(label)}
    </td>
    <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 700; text-align: right;">
      ${formatNumber(value)}
    </td>
  </tr>
`;

const renderRules = (rules = []) => {
  if (rules.length === 0) {
    return '<p style="margin: 0; color: #6b7280;">Nu au fost declanșate reguli în această perioadă.</p>';
  }

  return `
    <table style="width: 100%; border-collapse: collapse;">
      ${rules.map((item) => `
        <tr>
          <td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb; color: #374151;">
            ${escapeHtml(item.rule)}
          </td>
          <td style="padding: 9px 0; border-bottom: 1px solid #e5e7eb; color: #111827; font-weight: 700; text-align: right;">
            ${formatNumber(item.count)} apariții
          </td>
        </tr>
      `).join('')}
    </table>
  `;
};

export const monthlyDigestTemplate = ({ summary, userName }) => {
  const monthLabel = formatMonth(summary.period.month);
  const counts = summary.counts;
  const ai = summary.ai;
  const safeRate = counts.scannedEmails > 0
    ? Math.round((counts.safe / counts.scannedEmails) * 100)
    : 0;

  return {
    subject: `Sumar lunar phishing - ${monthLabel}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 680px; margin: 0 auto; padding: 32px 18px; font-family: 'Segoe UI', Arial, sans-serif;">
          <div style="background-color: #0f172a; color: #ffffff; padding: 28px 32px; border-radius: 8px 8px 0 0;">
            <p style="margin: 0 0 8px; color: #cbd5e1; font-size: 14px;">Raport lunar de securitate</p>
            <h1 style="margin: 0; font-size: 26px; line-height: 1.25;">Sumar phishing pentru ${escapeHtml(monthLabel)}</h1>
          </div>

          <div style="background-color: #ffffff; padding: 28px 32px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">
              Salut, ${escapeHtml(userName)}. Acesta este sumarul manual generat pentru emailurile sincronizate și scanate în aplicație.
            </p>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 26px;">
              ${renderMetric('Emailuri sincronizate', counts.syncedEmails)}
              ${renderMetric('Emailuri scanate', counts.scannedEmails)}
              ${renderMetric('Emailuri sigure', counts.safe)}
              ${renderMetric('Emailuri suspecte', counts.suspicious)}
              ${renderMetric('Emailuri probabil phishing', counts.likelyPhishing)}
              ${renderMetric('Emailuri în carantină', counts.quarantined)}
              ${renderMetric('Emailuri revizuite manual', counts.reviewed)}
              ${renderMetric('Rată emailuri sigure din scanări', `${safeRate}%`)}
            </table>

            <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin-bottom: 22px;">
              <h2 style="margin: 0 0 14px; color: #111827; font-size: 18px;">Reguli declanșate frecvent</h2>
              ${renderRules(summary.topTriggeredRules)}
            </div>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 18px; margin-bottom: 22px;">
              <h2 style="margin: 0 0 12px; color: #1e3a8a; font-size: 18px;">Status analiză semantică locală</h2>
              <p style="margin: 0; color: #1f2937; line-height: 1.6;">
                Evaluări reușite: <strong>${formatNumber(ai.evaluated)}</strong>,
                eșuate: <strong>${formatNumber(ai.failed)}</strong>,
                dezactivate: <strong>${formatNumber(ai.disabled)}</strong>.
              </p>
            </div>

            <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
              Perioadă: ${escapeHtml(summary.period.from)} - ${escapeHtml(summary.period.to)}.
              Generat la: ${escapeHtml(formatDate(summary.generatedAt))}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

export const phishingAlertTemplate = ({ userName, emails, detectedAt }) => {
  const emailCount = emails.length;
  const subjectLine = emailCount === 1
    ? `[SecureInbox] Phishing email detected in your inbox`
    : `[SecureInbox] ${emailCount} phishing emails detected in your inbox`;

  const emailRows = emails.map((email) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #fca5a5; color: #7f1d1d; font-size: 14px; word-break: break-word;">
        <strong>${escapeHtml(email.subject || '(no subject)')}</strong><br>
        <span style="font-size: 12px; color: #991b1b;">From: ${escapeHtml(email.from || 'unknown')}</span>
      </td>
    </tr>
  `).join('');

  return {
    subject: subjectLine,
    html: `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: 'Segoe UI', Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 16px 16px 0 0; padding: 36px 40px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 12px;">🚨</div>
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
              Phishing Alert
            </h1>
            <p style="color: #fca5a5; margin: 8px 0 0; font-size: 15px;">
              SecureInbox detected a high-risk email in your inbox
            </p>
          </div>
          <div style="background: white; border-radius: 0 0 16px 16px; padding: 36px 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.08);">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-top: 0;">
              Hi <strong>${escapeHtml(userName)}</strong>,
            </p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              SecureInbox flagged <strong>${emailCount} email${emailCount > 1 ? 's' : ''}</strong> as <strong style="color: #dc2626;">likely phishing</strong> during the latest sync on ${escapeHtml(detectedAt)}.
            </p>
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 10px; margin: 24px 0; overflow: hidden;">
              <div style="background: #fee2e2; padding: 10px 16px;">
                <strong style="color: #991b1b; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
                  Flagged Email${emailCount > 1 ? 's' : ''}
                </strong>
              </div>
              <table style="width: 100%; border-collapse: collapse;">
                ${emailRows}
              </table>
            </div>
            <p style="color: #374151; font-size: 15px; line-height: 1.6;">
              Please open SecureInbox and review these emails. Do <strong>not</strong> click any links or download attachments until you have verified they are safe.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">
              You are receiving this alert because you have phishing alerts enabled in SecureInbox settings.
              To disable alerts, go to <strong>Settings → Notifications</strong>.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };
};

export default welcomeTemplate;
