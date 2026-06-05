import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, Link2, Loader2, Paperclip, ScanLine } from 'lucide-react';

import { LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { VerdictBanner } from '@/components/security/VerdictBanner';
import { ScanDetails } from '@/components/security/ScanDetails';
import { ReviewActions } from '@/components/security/ReviewActions';
import { EmailBody } from '@/components/inbox/EmailBody';
import { getEmail, getEmailRaw } from '@/api/emailsApi';
import { getLatestScan, scanEmail } from '@/api/scansApi';
import { getSenderName, getSenderAddress } from '@/lib/email';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

export function EmailDetailPage() {
  const { emailId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Prev/next navigation — passed from InboxPage via router state
  const { ids = [] } = location.state || {};
  const currentIdx = ids.indexOf(paramId);
  const prevId = currentIdx > 0 ? ids[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < ids.length - 1 ? ids[currentIdx + 1] : null;

  const [email, setEmail] = useState(null);
  const [raw, setRaw] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scanExpanded, setScanExpanded] = useState(true);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [rescanning, setRescanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const detail = await getEmail(paramId);
      setEmail(detail);
      const [rawResult, scanResult] = await Promise.allSettled([
        getEmailRaw(paramId),
        getLatestScan(paramId),
      ]);
      if (rawResult.status === 'fulfilled') setRaw(rawResult.value);
      if (scanResult.status === 'fulfilled') setScan(scanResult.value);
      else setScan(detail.latestScan || null);
    } catch (err) {
      setError(err.message || 'Failed to load this message.');
    } finally {
      setLoading(false);
    }
  }, [paramId]);

  useEffect(() => { load(); }, [load]);

  const handleReviewed = (result) => {
    setEmail((prev) => ({ ...prev, ...result }));
    load();
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await scanEmail(email.id || email._id);
      await load();
    } finally {
      setRescanning(false);
    }
  };

  const navTo = (id) => navigate(`/inbox/${id}`, { state: { ids } });

  if (loading && !email) return <LoadingState label="Loading message…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!email) return null;

  const links = raw?.links || [];
  const attachments = raw?.attachments || [];
  const LINKS_PREVIEW = 3;
  const visibleLinks = showAllLinks ? links : links.slice(0, LINKS_PREVIEW);
  const hiddenLinksCount = links.length - LINKS_PREVIEW;

  return (
    <>
      {/* Nav bar: back + prev/next */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {(prevId || nextId) && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!prevId}
              onClick={() => navTo(prevId)}
              title="Previous message"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={!nextId}
              onClick={() => navTo(nextId)}
              title="Next message"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* 1. Verdict — first thing you read */}
      <VerdictBanner riskBucket={email.riskBucket} verdictSource={email.verdictSource} />

      {/* 2. Subject + sender + date — clean single block */}
      <div className="space-y-1 border-b border-border/60 pb-4">
        <h1 className="text-xl font-semibold leading-snug">
          {email.subject || '(no subject)'}
        </h1>
        {(() => {
          const senderName = getSenderName(email);
          const senderAddress = getSenderAddress(email);
          const showAddress = senderAddress && senderAddress !== senderName && !senderName.includes(senderAddress);
          return (
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
              <span className="font-medium text-foreground/90">{senderName}</span>
              {showAddress && (
                <span className="min-w-0 truncate text-muted-foreground">
                  &lt;{senderAddress}&gt;
                </span>
              )}
              <span className="text-border">·</span>
              <span className="text-muted-foreground">{formatDateTime(email.receivedAt)}</span>
            </div>
          );
        })()}
      </div>

      {/* 3. Email body (left) + security panel (right, sticky) */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* Message */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card className="min-w-0">
            <CardContent className="pt-5">
              <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/40 p-4">
                <EmailBody htmlBody={raw?.htmlBody} textBody={raw?.textBody} />
              </div>
            </CardContent>
          </Card>

          {(links.length > 0 || attachments.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Extracted indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {links.length > 0 && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" /> Links ({links.length})
                    </p>
                    <ul className="space-y-1">
                      {visibleLinks.map((link, i) => (
                        <li
                          key={i}
                          className="truncate rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-foreground/80"
                          title={typeof link === 'string' ? link : link.url}
                        >
                          {typeof link === 'string' ? link : link.url || link.href}
                        </li>
                      ))}
                    </ul>
                    {hiddenLinksCount > 0 && (
                      <button
                        onClick={() => setShowAllLinks((v) => !v)}
                        className="mt-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {showAllLinks ? 'Show less' : `Show ${hiddenLinksCount} more`}
                      </button>
                    )}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((att, i) => (
                      <Badge key={i} variant="muted">
                        <Paperclip className="h-3 w-3" />
                        {typeof att === 'string' ? att : att.filename || att.name || 'file'}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Security panel: Review first, then collapsible scan details */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your review</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewActions email={email} onReviewed={handleReviewed} />
            </CardContent>
          </Card>

          {/* Re-scan */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground hover:text-foreground"
            disabled={rescanning}
            onClick={handleRescan}
          >
            {rescanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanLine className="h-3.5 w-3.5" />
            )}
            {rescanning ? 'Scanning…' : 'Re-scan this message'}
          </Button>

          {/* Collapsible scan details */}
          {scan && (
            <div>
              <button
                onClick={() => setScanExpanded(!scanExpanded)}
                className="flex w-full items-center justify-between rounded-md px-1 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Scan details</span>
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    !scanExpanded && '-rotate-90'
                  )}
                />
              </button>
              <AnimatePresence initial={false}>
                {scanExpanded && (
                  <motion.div
                    key="scan-details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <ScanDetails scan={scan} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
