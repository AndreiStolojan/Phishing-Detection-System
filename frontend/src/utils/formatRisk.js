export const RISK_BUCKETS = [
  { key: '', label: 'All', description: 'Every synced message' },
  { key: 'needs_review', label: 'Needs Review', description: 'Suspicious messages' },
  { key: 'quarantine', label: 'Quarantine', description: 'Likely phishing, not reviewed' },
  { key: 'confirmed_phishing', label: 'Confirmed Phishing', description: 'Marked by user' },
  { key: 'safe', label: 'Safe', description: 'Algorithmically safe' },
  { key: 'unscanned', label: 'Unscanned', description: 'No current scan' },
];

const riskConfig = {
  reviewed_safe: {
    label: 'Reviewed Safe',
    severity: 'success',
    tone: '#55c27a',
  },
  confirmed_phishing: {
    label: 'Confirmed Phishing',
    severity: 'error',
    tone: '#ef6f6c',
  },
  quarantine: {
    label: 'Quarantine',
    severity: 'error',
    tone: '#ef6f6c',
  },
  needs_review: {
    label: 'Needs Review',
    severity: 'warning',
    tone: '#f0b84f',
  },
  safe: {
    label: 'Safe',
    severity: 'success',
    tone: '#55c27a',
  },
  unscanned: {
    label: 'Unscanned',
    severity: 'default',
    tone: '#a8b0bd',
  },
};

export const formatRiskBucket = (riskBucket) =>
  riskConfig[riskBucket] || {
    label: 'Unknown',
    severity: 'default',
    tone: '#a8b0bd',
  };

export const formatVerdict = (verdict) => {
  if (!verdict) {
    return 'No verdict';
  }

  return verdict
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
