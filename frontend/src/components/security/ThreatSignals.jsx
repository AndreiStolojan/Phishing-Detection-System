import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Link2,
  Paperclip,
  KeyRound,
  Globe,
  Zap,
  Users,
  Building2,
  Bot,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/*
  Human-readable labels for every rule the scan engine can trigger.
  Each entry: { label, detail, icon, isAi }
*/
const RULE_META = {
  reply_to_mismatch: {
    label: 'Reply-To address mismatch',
    detail: 'The address you would reply to is different from the sender — a common trick used in phishing.',
    icon: AlertTriangle,
    isAi: false,
  },
  shortened_url_detected: {
    label: 'Shortened URL detected',
    detail: 'Shortened links hide the real destination and are often used in phishing.',
    icon: Link2,
    isAi: false,
  },
  'suspicious_link_pattern:ip_address_link': {
    label: 'Link uses an IP address',
    detail: 'Legitimate services use domain names, not raw IP addresses.',
    icon: Globe,
    isAi: false,
  },
  'suspicious_link_pattern:embedded_credentials': {
    label: 'Login details embedded in link',
    detail: 'A link containing a username or password is a strong sign of phishing.',
    icon: KeyRound,
    isAi: false,
  },
  'suspicious_link_pattern:punycode_domain': {
    label: 'Lookalike domain detected',
    detail: 'This domain uses special characters to look like a real brand but is not.',
    icon: Globe,
    isAi: false,
  },
  'suspicious_link_pattern:very_long_url': {
    label: 'Unusually long link',
    detail: 'Excessively long links often hide where they actually lead.',
    icon: Link2,
    isAi: false,
  },
  high_risk_attachment_extension: {
    label: 'Dangerous file attachment',
    detail: 'This email has a file attachment that could be used to install malware.',
    icon: Paperclip,
    isAi: false,
  },
  archive_attachment_extension: {
    label: 'Compressed archive attachment',
    detail: 'Zip and archive files are sometimes used to hide malicious content.',
    icon: Paperclip,
    isAi: false,
  },
  too_many_links_high: {
    label: 'Too many links',
    detail: 'An unusually high number of links is a common pattern in phishing emails.',
    icon: Link2,
    isAi: false,
  },
  too_many_links_medium: {
    label: 'Too many links',
    detail: 'A high number of links can indicate bulk phishing content.',
    icon: Link2,
    isAi: false,
  },
  'ai_semantic:urgency_high': {
    label: 'Urgency language',
    detail: 'The AI found language designed to create panic and rush you into acting.',
    icon: Zap,
    isAi: true,
  },
  'ai_semantic:urgency_medium': {
    label: 'Urgency language',
    detail: 'The AI found words pressuring you to act immediately.',
    icon: Zap,
    isAi: true,
  },
  'ai_semantic:sensitive_data_request': {
    label: 'Asks for personal information',
    detail: 'The AI detected a request for your password, payment details, or personal codes.',
    icon: KeyRound,
    isAi: true,
  },
  'ai_semantic:login_or_action_request': {
    label: 'Pressures you to act immediately',
    detail: 'The AI found language pushing you to click a link or sign in right away.',
    icon: ShieldAlert,
    isAi: true,
  },
  'ai_semantic:social_engineering_high': {
    label: 'Social engineering',
    detail: 'The AI found manipulative language — using fear, authority, or rewards to trick you.',
    icon: Users,
    isAi: true,
  },
  'ai_semantic:social_engineering_medium': {
    label: 'Social engineering',
    detail: 'The AI found some manipulation tactics in this email.',
    icon: Users,
    isAi: true,
  },
  'ai_semantic:brand_impersonation_suspected': {
    label: 'Pretending to be a known brand',
    detail: 'The AI detected that this email may be impersonating a company or brand you know.',
    icon: Building2,
    isAi: true,
  },
};

const fallbackMeta = (rule) => ({
  label: rule
    .replace(/^ai_semantic:/, '')
    .replace(/_(high|medium|low)$/, '')
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()),
  detail: null,
  icon: AlertTriangle,
  isAi: rule.startsWith('ai_semantic:'),
});

const getRuleMeta = (rule) => RULE_META[rule] || fallbackMeta(rule);

function SignalRow({ rule, points, details: backendDetail, index }) {
  const { label, detail, icon: Icon, isAi } = getRuleMeta(rule);
  const displayDetail = backendDetail || detail;

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2.5',
        isAi
          ? 'border-primary/20 bg-primary/[0.04]'
          : 'border-border/60 bg-background/30'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
          isAi ? 'bg-primary/15 text-primary' : 'bg-risk-review-soft text-risk-review'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium leading-tight">{label}</span>
          {isAi && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 px-1 py-0 text-[10px] font-medium text-primary">
              <Bot className="h-2.5 w-2.5" />
              AI
            </span>
          )}
        </div>
        {displayDetail && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{displayDetail}</p>
        )}
      </div>

      {points != null && (
        <Badge variant="muted" className="mt-0.5 shrink-0 tabular-nums">
          +{points}
        </Badge>
      )}
    </motion.li>
  );
}

export function ThreatSignals({ scan }) {
  if (!scan) return null;

  const triggered = Array.isArray(scan.triggeredRules) ? scan.triggeredRules : [];
  if (triggered.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="label-overline flex items-center gap-1.5 text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        What triggered the warning
        <span className="ml-auto rounded-full bg-muted px-2 py-0 text-[10px] font-semibold tabular-nums text-foreground/70">
          {triggered.length}
        </span>
      </p>
      <ul className="space-y-1.5">
        {triggered.map((rule, i) => (
          <SignalRow
            key={i}
            index={i}
            rule={typeof rule === 'string' ? rule : rule.rule}
            points={typeof rule === 'object' ? (rule.points ?? null) : null}
            details={typeof rule === 'object' ? rule.details : null}
          />
        ))}
      </ul>
    </div>
  );
}
