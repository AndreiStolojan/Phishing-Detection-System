import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { emailId } from '@/lib/email';
import { springSnappy } from '@/lib/motion';
import { cn } from '@/lib/utils';

function AnimatedCheck() {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -25 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={springSnappy}
      className="inline-flex"
    >
      <Check />
    </motion.span>
  );
}

/**
 * Manual review controls. mark-safe is local-only; mark-phishing also tries to
 * move the Gmail message to Spam (handled by the backend). State flips
 * optimistically and rolls back if the request fails.
 */
export function ReviewActions({ email, onReviewed }) {
  const safe = useAsyncAction(markEmailSafe);
  const phishing = useAsyncAction(markEmailPhishing);
  const busy = safe.loading || phishing.loading;

  const [verdict, setVerdict] = useState(email?.userVerdict ?? null);
  useEffect(() => {
    setVerdict(email?.userVerdict ?? null);
  }, [email?.userVerdict, email?.id, email?._id]);

  const reviewedSafe = verdict === 'safe';
  const reviewedPhishing = verdict === 'phishing';

  const handle = async (kind) => {
    const previous = verdict;
    setVerdict(kind); // optimistic
    try {
      const action = kind === 'safe' ? safe : phishing;
      const result = await action.run(emailId(email));
      toast.success(
        kind === 'safe' ? 'Marked as safe' : 'Marked as phishing · Moved to Gmail Spam'
      );
      onReviewed?.(result);
    } catch (err) {
      setVerdict(previous); // roll back
      toast.error(err.message || 'Action failed. Please try again.');
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="outline"
          className={cn(
            'flex-1',
            reviewedSafe && 'border-risk-safe/40 bg-risk-safe-soft text-risk-safe hover:bg-risk-safe-soft'
          )}
          disabled={busy || reviewedSafe}
          onClick={() => handle('safe')}
        >
          {safe.loading ? (
            <Loader2 className="animate-spin" />
          ) : reviewedSafe ? (
            <AnimatedCheck />
          ) : (
            <ShieldCheck className="text-risk-safe" />
          )}
          {reviewedSafe ? 'Marked safe' : 'Mark safe'}
        </Button>
        <Button
          variant="outline"
          className={cn(
            'flex-1',
            reviewedPhishing &&
              'border-risk-phishing/40 bg-risk-phishing-soft text-risk-phishing hover:bg-risk-phishing-soft'
          )}
          disabled={busy || reviewedPhishing}
          onClick={() => handle('phishing')}
        >
          {phishing.loading ? (
            <Loader2 className="animate-spin" />
          ) : reviewedPhishing ? (
            <AnimatedCheck />
          ) : (
            <ShieldX className="text-risk-quarantine" />
          )}
          {reviewedPhishing ? 'Marked phishing' : 'Mark phishing'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Marking as phishing also moves the message to Gmail Spam.
      </p>
    </div>
  );
}
