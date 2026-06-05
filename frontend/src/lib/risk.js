import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

/*
  Single source of truth for how risk states look across the whole app.
  Backend gives us two related fields:
    - riskBucket: safe | needs_review | quarantine | reviewed_safe |
                  confirmed_phishing | unscanned
    - effectiveVerdict: safe | suspicious | likely_phishing | phishing | null
  Every badge, banner, chart slice and filter chip reads from here so colours
  stay consistent.
*/

const TONES = {
  safe: {
    icon: ShieldCheck,
    text: 'text-risk-safe',
    soft: 'bg-risk-safe-soft text-risk-safe border border-risk-safe/30',
    dot: 'bg-risk-safe',
    bar: 'bg-risk-safe',
    hex: 'var(--color-risk-safe)',
  },
  review: {
    icon: AlertTriangle,
    text: 'text-risk-review',
    soft: 'bg-risk-review-soft text-risk-review border border-risk-review/30',
    dot: 'bg-risk-review',
    bar: 'bg-risk-review',
    hex: 'var(--color-risk-review)',
  },
  quarantine: {
    icon: ShieldAlert,
    text: 'text-risk-quarantine',
    soft: 'bg-risk-quarantine-soft text-risk-quarantine border border-risk-quarantine/30',
    dot: 'bg-risk-quarantine',
    bar: 'bg-risk-quarantine',
    hex: 'var(--color-risk-quarantine)',
  },
  phishing: {
    icon: ShieldX,
    text: 'text-risk-phishing',
    soft: 'bg-risk-phishing-soft text-risk-phishing border border-risk-phishing/30',
    dot: 'bg-risk-phishing',
    bar: 'bg-risk-phishing',
    hex: 'var(--color-risk-phishing)',
  },
  unscanned: {
    icon: HelpCircle,
    text: 'text-risk-unscanned',
    soft: 'bg-risk-unscanned-soft text-risk-unscanned border border-risk-unscanned/30',
    dot: 'bg-risk-unscanned',
    bar: 'bg-risk-unscanned',
    hex: 'var(--color-risk-unscanned)',
  },
};

const RISK_BUCKET_META = {
  safe: { label: 'Safe', tone: TONES.safe, description: 'Scan found no risk signals.' },
  reviewed_safe: {
    label: 'Reviewed safe',
    tone: TONES.safe,
    description: 'You confirmed this message is safe.',
  },
  needs_review: {
    label: 'Suspicious',
    tone: TONES.review,
    description: 'Scan flagged suspicious signals — worth a closer look.',
  },
  quarantine: {
    label: 'Quarantine',
    tone: TONES.quarantine,
    description: 'Likely phishing, not yet reviewed.',
  },
  confirmed_phishing: {
    label: 'Confirmed phishing',
    tone: TONES.phishing,
    description: 'You marked this message as phishing.',
  },
  unscanned: {
    label: 'Unscanned',
    tone: TONES.unscanned,
    description: 'No current scan for this message.',
  },
};

const VERDICT_META = {
  safe: { label: 'Safe', tone: TONES.safe },
  suspicious: { label: 'Suspicious', tone: TONES.review },
  likely_phishing: { label: 'Likely phishing', tone: TONES.quarantine },
  phishing: { label: 'Phishing', tone: TONES.phishing },
};

const UNKNOWN = {
  label: 'Unknown',
  tone: TONES.unscanned,
  description: '',
};

export const getRiskMeta = (riskBucket) => RISK_BUCKET_META[riskBucket] || UNKNOWN;

export const getVerdictMeta = (verdict) =>
  VERDICT_META[verdict] || { label: 'No verdict', tone: TONES.unscanned };

/** Filter chips for the inbox, in priority order. */
export const RISK_FILTERS = [
  { key: '', label: 'All' },
  { key: 'quarantine', label: 'Quarantine' },
  { key: 'needs_review', label: 'Suspicious' },
  { key: 'confirmed_phishing', label: 'Confirmed phishing' },
  { key: 'safe', label: 'Safe' },
];

/** Turn a snake_case enum into a readable label as a last resort. */
export const humanize = (value) => {
  if (!value) return '';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
