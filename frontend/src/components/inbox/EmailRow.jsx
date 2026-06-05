import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import { RiskBadge } from '@/components/security/RiskBadge';
import { emailId, getSenderName, getSnippet, getSenderMonogram } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

const MotionLink = motion.create(Link);

export function EmailRow({ email, active = false, linkState = null, compact = false }) {
  const id = emailId(email);
  const { tone } = getRiskMeta(email.riskBucket);
  const loud = tone.emphasis === 'loud';
  const Icon = tone.icon;
  const { letter, hue } = getSenderMonogram(email);

  return (
    <MotionLink
      to={`/inbox/${id}`}
      state={linkState}
      whileTap={{ scale: 0.995 }}
      style={{ borderLeftColor: loud ? tone.hex : 'transparent' }}
      className={cn(
        'group flex items-center gap-3 border-l-[3px] px-4 outline-none transition-colors',
        compact ? 'py-2.5' : 'py-3',
        'hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.04]',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
        active && 'bg-accent'
      )}
    >
      {/* Leading: risk icon for loud buckets, sender monogram for calm ones */}
      {loud ? (
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', tone.soft)}>
          <Icon className="h-4 w-4" />
        </span>
      ) : (
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{ backgroundColor: `hsl(${hue} 36% 20%)`, color: `hsl(${hue} 72% 74%)` }}
        >
          {letter}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[15px] font-semibold text-foreground">
            {getSenderName(email)}
          </p>
          <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatEmailDate(email.receivedAt)}
          </time>
        </div>
        <p className={cn('truncate text-sm', loud ? 'text-foreground/90' : 'text-foreground/80')}>
          {email.subject || '(no subject)'}
        </p>
        {!compact && (
          <p className="truncate text-caption text-muted-foreground">{getSnippet(email)}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {loud && <RiskBadge riskBucket={email.riskBucket} size="sm" />}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
    </MotionLink>
  );
}
