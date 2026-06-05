import { Link } from 'react-router-dom';

import { RiskBadge } from '@/components/security/RiskBadge';
import { emailId, getSenderName, getSnippet } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

export function EmailRow({ email, active = false, linkState = null }) {
  const id = emailId(email);
  const { tone } = getRiskMeta(email.riskBucket);

  return (
    <Link
      to={`/inbox/${id}`}
      state={linkState}
      style={{ borderLeft: `3px solid ${tone.hex}` }}
      className={cn(
        'flex items-start gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-accent/50',
        active && 'bg-accent'
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{getSenderName(email)}</p>
          <time className="shrink-0 text-xs text-muted-foreground">
            {formatEmailDate(email.receivedAt)}
          </time>
        </div>
        <p className="truncate text-sm text-foreground/90">
          {email.subject || '(no subject)'}
        </p>
        <p className="truncate text-xs text-muted-foreground">{getSnippet(email)}</p>
      </div>
      <div className="shrink-0 pt-0.5">
        <RiskBadge riskBucket={email.riskBucket} size="sm" />
      </div>
    </Link>
  );
}
