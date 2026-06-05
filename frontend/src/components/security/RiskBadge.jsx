import { getRiskMeta } from '@/lib/risk';
import { cn } from '@/lib/utils';

/**
 * Pill that shows the final risk bucket for an email.
 * Used in the inbox list and email header. Icon + colour come from lib/risk.
 */
const SM_LABELS = {
  confirmed_phishing: 'Phishing',
  reviewed_safe: 'Reviewed',
};

export function RiskBadge({ riskBucket, size = 'default', showIcon = true, className }) {
  const { label, tone } = getRiskMeta(riskBucket);
  const Icon = tone.icon;
  const displayLabel = size === 'sm' ? (SM_LABELS[riskBucket] ?? label) : label;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        tone.soft,
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        className
      )}
    >
      {showIcon && <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {displayLabel}
    </span>
  );
}
