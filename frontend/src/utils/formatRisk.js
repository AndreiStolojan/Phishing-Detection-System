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
  phishing: 'Phishing',
};

const reviewStatusLabels = {
  reviewed: 'Revizuit',
  pending_review: 'Necesita review',
  no_review_needed: 'Nu necesita review',
  unscanned: 'Nescanat',
};

const verdictSourceLabels = {
  user: 'utilizator',
  scan: 'scanare',
};

export const getRiskBucketMeta = (riskBucket) => (
  riskBucketMap[riskBucket] || unknownRiskBucket
);

export const formatRiskBucket = (riskBucket) => (
  getRiskBucketMeta(riskBucket).label
);

export const formatVerdict = (verdict) => (
  verdictLabels[verdict] || 'Fara verdict'
);

export const formatReviewStatus = (reviewStatus) => (
  reviewStatusLabels[reviewStatus] || 'Status necunoscut'
);

export const formatVerdictSource = (verdictSource) => (
  verdictSourceLabels[verdictSource] || 'fara sursa'
);

export const formatRiskScore = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'Fara scor';
  }

  return `${Math.round(score)}/100`;
};
