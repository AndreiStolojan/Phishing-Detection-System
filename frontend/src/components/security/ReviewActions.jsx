import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';

/**
 * Manual review controls. mark-safe is local-only; mark-phishing also tries to
 * move the Gmail message to Spam (handled by the backend).
 */
export function ReviewActions({ email, onReviewed }) {
  const safe = useAsyncAction(markEmailSafe);
  const phishing = useAsyncAction(markEmailPhishing);
  const busy = safe.loading || phishing.loading;

  const reviewedSafe = email?.userVerdict === 'safe';
  const reviewedPhishing = email?.userVerdict === 'phishing';

  const handle = async (action) => {
    const result = await action.run(email.id || email._id);
    onReviewed?.(result);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant={reviewedSafe ? 'secondary' : 'outline'}
          className="flex-1"
          disabled={busy || reviewedSafe}
          onClick={() => handle(safe)}
        >
          {safe.loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ShieldCheck className="text-risk-safe" />
          )}
          {reviewedSafe ? 'Safe ✓' : 'Safe'}
        </Button>
        <Button
          variant={reviewedPhishing ? 'destructive' : 'outline'}
          className="flex-1"
          disabled={busy || reviewedPhishing}
          onClick={() => handle(phishing)}
        >
          {phishing.loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <ShieldX className={reviewedPhishing ? '' : 'text-risk-phishing'} />
          )}
          {reviewedPhishing ? 'Phishing ✓' : 'Phishing'}
        </Button>
      </div>
      {reviewedPhishing && (
        <p className="text-xs text-muted-foreground">
          Marking as phishing also tries to move the message to Gmail Spam.
        </p>
      )}
      {(safe.error || phishing.error) && (
        <p className="text-xs text-destructive">{safe.error || phishing.error}</p>
      )}
    </div>
  );
}
