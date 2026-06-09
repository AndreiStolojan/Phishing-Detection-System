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
    emphasis: 'quiet',
    text: 'text-risk-safe',
    soft: 'bg-risk-safe-soft text-risk-safe border border-risk-safe/30',
    dot: 'bg-risk-safe',
    bar: 'bg-risk-safe',
    hex: 'var(--color-risk-safe)',
  },
  review: {
    icon: AlertTriangle,
    emphasis: 'loud',
    text: 'text-risk-review',
    soft: 'bg-risk-review-soft text-risk-review border border-risk-review/30',
    dot: 'bg-risk-review',
    bar: 'bg-risk-review',
    hex: 'var(--color-risk-review)',
  },
  quarantine: {
    icon: ShieldAlert,
    emphasis: 'loud',
    text: 'text-risk-quarantine',
    soft: 'bg-risk-quarantine-soft text-risk-quarantine border border-risk-quarantine/30',
    dot: 'bg-risk-quarantine',
    bar: 'bg-risk-quarantine',
    hex: 'var(--color-risk-quarantine)',
  },
  phishing: {
    icon: ShieldX,
    emphasis: 'loud',
    text: 'text-risk-phishing',
    soft: 'bg-risk-phishing-soft text-risk-phishing border border-risk-phishing/30',
    dot: 'bg-risk-phishing',
    bar: 'bg-risk-phishing',
    hex: 'var(--color-risk-phishing)',
  },
  unscanned: {
    icon: HelpCircle,
    emphasis: 'quiet',
    text: 'text-risk-unscanned',
    soft: 'bg-risk-unscanned-soft text-risk-unscanned border border-risk-unscanned/30',
    dot: 'bg-risk-unscanned',
    bar: 'bg-risk-unscanned',
    hex: 'var(--color-risk-unscanned)',
  },
};

const RISK_BUCKET_META = {
  safe: { label: 'Safe', tone: TONES.safe, description: 'No threats detected in this email.' },
  reviewed_safe: {
    label: 'Reviewed safe',
    tone: TONES.safe,
    description: 'You confirmed this email is safe.',
  },
  needs_review: {
    label: 'Suspicious',
    tone: TONES.review,
    description: 'This email has suspicious patterns — worth a closer look.',
  },
  quarantine: {
    label: 'Likely phishing',
    tone: TONES.quarantine,
    description: 'This email looks like phishing. Review it before taking any action.',
  },
  confirmed_phishing: {
    label: 'Confirmed phishing',
    tone: TONES.phishing,
    description: 'You marked this email as phishing.',
  },
  unscanned: {
    label: 'Unscanned',
    tone: TONES.unscanned,
    description: 'This email has not been scanned yet.',
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

/*
  CATEGORY_COLORS — the single source of truth for the colour of each phishing
  data category, used everywhere the same categories are charted: the dashboard
  trend + risk donut, the reports detection breakdown, and the inbox badges.

  Keys are the canonical category ids. Every chart maps its own local field name
  (e.g. `needs_review`, `quarantine`, `likelyPhishing`) onto one of these, so a
  category is always drawn in the same colour across the whole app. The values
  point at the stable `--color-risk-*` CSS variables defined in index.css, so
  there are no duplicated or drifting hex values.

  The four colours are deliberately distinct hues on the dark theme this app
  ships with: green / amber / rose / violet. The app is dark-only, so only the
  dark background is targeted (see PROJECT_STATE.md).
*/
export const CATEGORY_COLORS = {
  safe: 'var(--color-risk-safe)',
  suspicious: 'var(--color-risk-review)',
  likely_phishing: 'var(--color-risk-quarantine)',
  confirmed_phishing: 'var(--color-risk-phishing)',
  unscanned: 'var(--color-risk-unscanned)',
};

export const CATEGORY_LABELS = {
  safe: 'Safe',
  suspicious: 'Suspicious',
  likely_phishing: 'Likely phishing',
  confirmed_phishing: 'Confirmed phishing',
  unscanned: 'Unscanned',
};

export const getRiskMeta = (riskBucket) => RISK_BUCKET_META[riskBucket] || UNKNOWN;

export const getVerdictMeta = (verdict) =>
  VERDICT_META[verdict] || { label: 'No verdict', tone: TONES.unscanned };

/** Filter chips for the inbox, in priority order. */
export const RISK_FILTERS = [
  { key: '', label: 'All' },
  { key: 'quarantine', label: 'Likely phishing' },
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

/** Short, user-friendly names for every rule key — used in charts and tooltips. */
const RULE_LABELS = {
  reply_to_mismatch: 'Reply address differs',
  shortened_url_detected: 'Shortened link',
  'suspicious_link_pattern:ip_address_link': 'Link uses IP address',
  'suspicious_link_pattern:embedded_credentials': 'Login details in link',
  'suspicious_link_pattern:punycode_domain': 'Lookalike domain',
  'suspicious_link_pattern:very_long_url': 'Unusually long link',
  high_risk_attachment_extension: 'Dangerous attachment',
  archive_attachment_extension: 'Archive attachment',
  too_many_links_high: 'Too many links',
  too_many_links_medium: 'Too many links',
  'ai_semantic:urgency_high': 'Urgency language',
  'ai_semantic:urgency_medium': 'Urgency language',
  'ai_semantic:sensitive_data_request': 'Asks for personal info',
  'ai_semantic:login_or_action_request': 'Pressures to act',
  'ai_semantic:social_engineering_high': 'Social engineering',
  'ai_semantic:social_engineering_medium': 'Social engineering',
  'ai_semantic:brand_impersonation_suspected': 'Brand impersonation',
};

export const getRuleLabel = (rule) => {
  const key = String(rule || '');
  if (RULE_LABELS[key]) return RULE_LABELS[key];
  if (key.startsWith('suspicious_link_pattern:')) return 'Suspicious link';
  return key
    .replace(/^ai_semantic:/, '')
    .replace(/_(high|medium|low)$/, '')
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};
