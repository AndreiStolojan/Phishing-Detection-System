export const riskBucketOptions = [
  {
    value: 'all',
    label: 'Toate',
    shortLabel: 'Toate',
    description: 'Toate emailurile sincronizate',
    tone: 'neutral',
  },
  {
    value: 'safe',
    label: 'Sigur',
    shortLabel: 'Sigur',
    description: 'Scanarea nu a gasit semnale importante de risc',
    tone: 'success',
  },
  {
    value: 'needs_review',
    label: 'Necesita verificare',
    shortLabel: 'Verificare',
    description: 'Email suspect care trebuie verificat manual',
    tone: 'warning',
  },
  {
    value: 'quarantine',
    label: 'Carantina',
    shortLabel: 'Carantina',
    description: 'Email cu risc ridicat, nerevizuit manual',
    tone: 'error',
  },
  {
    value: 'reviewed_safe',
    label: 'Confirmat sigur',
    shortLabel: 'Confirmat sigur',
    description: 'Utilizatorul a confirmat ca emailul este sigur',
    tone: 'successStrong',
  },
  {
    value: 'confirmed_phishing',
    label: 'Phishing confirmat',
    shortLabel: 'Phishing',
    description: 'Utilizatorul a confirmat manual phishing-ul',
    tone: 'dangerStrong',
  },
  {
    value: 'unscanned',
    label: 'Nescanat',
    shortLabel: 'Nescanat',
    description: 'Email fara scanare curenta',
    tone: 'muted',
  },
];

const riskBucketMap = riskBucketOptions.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

const unknownRiskBucket = {
  value: 'unknown',
  label: 'Stare necunoscuta',
  shortLabel: 'Necunoscut',
  description: 'Backend-ul a trimis o stare necunoscuta',
  tone: 'muted',
};

const verdictLabels = {
  safe: 'Sigur',
  suspicious: 'Suspect',
  likely_phishing: 'Probabil phishing',
  phishing: 'Phishing confirmat',
};

const reviewStatusLabels = {
  reviewed: 'Revizuit manual',
  pending_review: 'Necesita review',
  no_review_needed: 'Nu necesita review',
  unscanned: 'Nescanat',
};

const verdictSourceLabels = {
  user: 'Review manual',
  scan: 'Scanare automata',
  none: 'Fara sursa',
};

const providerLabels = {
  gmail: 'Gmail',
  google: 'Google',
};

const manualActionLabels = {
  mark_safe: 'Marcat sigur',
  mark_phishing: 'Marcat phishing',
};

const providerActionLabels = {
  gmail_move_to_spam: 'Mutare in Gmail Spam',
  move_to_spam: 'Mutare in Spam',
};

const providerActionStatusLabels = {
  success: 'Reusita',
  failed: 'Esuata',
  skipped: 'Omisa',
  pending: 'In asteptare',
  connected: 'Conectat',
  disconnected: 'Deconectat',
  active: 'Activ',
  expired: 'Expirat',
  error: 'Eroare',
  unknown: 'Necunoscut',
};

const aiStatusLabels = {
  generated: 'Generata',
  fallback: 'Fallback controlat',
  skipped: 'Omisa',
  failed: 'Esuata',
  disabled: 'AI oprit',
  unavailable: 'Indisponibila',
};

const aiSourceLabels = {
  ollama: 'Ollama',
  controlled_fallback: 'Fallback controlat',
  backend_fallback: 'Fallback backend',
};

const aiFallbackReasonLabels = {
  ai_disabled: 'AI oprit din setari',
  ollama_unavailable: 'Ollama indisponibil',
  invalid_ai_output: 'Raspuns AI invalid',
  generation_failed: 'Generarea a esuat',
  no_ai_explanation: 'Fara explicatie AI',
};

const ruleLabels = {
  reply_to_mismatch: 'Reply-To diferit de expeditor',
  shortened_url_detected: 'Link scurtat detectat',
  'suspicious_link_pattern:ip_address_link': 'Link către adresă IP',
  'suspicious_link_pattern:embedded_credentials': 'Date de autentificare în link',
  'suspicious_link_pattern:punycode_domain': 'Domeniu punycode',
  'suspicious_link_pattern:very_long_url': 'URL neobișnuit de lung',
  high_risk_attachment_extension: 'Atașament cu extensie riscantă',
  archive_attachment_extension: 'Atașament arhivă',
  too_many_links_high: 'Număr foarte mare de linkuri',
  too_many_links_medium: 'Număr mare de linkuri',
  'ai_semantic:urgency_high': 'AI: limbaj urgent puternic',
  'ai_semantic:urgency_medium': 'AI: limbaj urgent moderat',
  'ai_semantic:sensitive_data_request': 'AI: cerere de date sensibile',
  'ai_semantic:login_or_action_request': 'AI: cerere de login sau acțiune',
  'ai_semantic:social_engineering_high': 'AI: presiune socială puternică',
  'ai_semantic:social_engineering_medium': 'AI: presiune socială moderată',
  'ai_semantic:brand_impersonation_suspected': 'AI: posibilă impersonare de brand',
};

const humanizeToken = (value, fallback = 'Necunoscut') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
};

export const getRiskBucketMeta = (riskBucket) => (
  riskBucketMap[riskBucket] || unknownRiskBucket
);

export const formatRiskBucket = (riskBucket) => (
  getRiskBucketMeta(riskBucket).label
);

export const formatVerdict = (verdict) => (
  verdictLabels[verdict] || (verdict ? humanizeToken(verdict) : 'Fara verdict')
);

export const formatReviewStatus = (reviewStatus) => (
  reviewStatusLabels[reviewStatus] || humanizeToken(reviewStatus, 'Status necunoscut')
);

export const formatVerdictSource = (verdictSource) => (
  verdictSourceLabels[verdictSource] || humanizeToken(verdictSource, 'Fara sursa')
);

export const formatRiskScore = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'Fara scor';
  }

  return `${Math.round(score)}/100`;
};

export const formatProvider = (provider) => (
  providerLabels[provider] || humanizeToken(provider, 'Provider necunoscut')
);

export const formatManualAction = (action) => (
  manualActionLabels[action] || humanizeToken(action, 'Fara actiune manuala')
);

export const formatProviderAction = (action) => (
  providerActionLabels[action] || humanizeToken(action, 'Actiune provider necunoscuta')
);

export const formatProviderActionStatus = (status) => (
  providerActionStatusLabels[status] || humanizeToken(status, 'Status necunoscut')
);

export const formatAiStatus = (status) => (
  aiStatusLabels[status] || humanizeToken(status, 'Status AI necunoscut')
);

export const formatAiSource = (source) => (
  aiSourceLabels[source] || humanizeToken(source, 'Sursa necunoscuta')
);

export const formatAiFallbackReason = (reason) => (
  aiFallbackReasonLabels[reason] || humanizeToken(reason, 'Motiv fallback necunoscut')
);

export const formatRuleName = (rule) => (
  ruleLabels[rule] || humanizeToken(rule, 'Regula necunoscuta')
);

export const formatTechnicalLabel = (value, fallback = 'Necunoscut') => (
  humanizeToken(value, fallback)
);
