import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Link2,
  Loader2,
  Paperclip,
  ScanLine,
  CheckCircle2,
  UserCheck,
  UserPlus,
  Copy,
  Check,
  ShieldAlert,
  AlertTriangle,
  Terminal,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';

import { LoadingState, ErrorState } from '@/components/common/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanDetails } from '@/components/security/ScanDetails';
import { ReviewActions } from '@/components/security/ReviewActions';
import { EmailBody } from '@/components/inbox/EmailBody';
import { getEmail, getEmailRaw } from '@/api/emailsApi';
import { getLatestScan, scanEmail } from '@/api/scansApi';
import { bustCacheByPrefix } from '@/hooks/useApi';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { formatDateTime } from '@/utils/formatDate';
import { springSoft } from '@/lib/motion';
import { cn } from '@/lib/utils';

/* ─── Score ring ─────────────────────────────────────────────────────────── */

function ScoreRing({ score, color, children }) {
  const size = 52;
  const r = 23;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((score ?? 0) / 100, 1);
  const offset = circ * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-border/40"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-[4px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ─── Warning banner (injected above email body) ─────────────────────────── */

const WARN_BUCKETS = new Set(['quarantine', 'confirmed_phishing', 'needs_review']);

const WARN_COPY = {
  quarantine: {
    heading: 'Likely phishing — proceed with caution',
    body: 'Do not click links, open attachments, or type in your password or personal details. Review the security signals before taking any action.',
  },
  confirmed_phishing: {
    heading: 'Confirmed phishing',
    body: 'You marked this email as phishing. Do not interact with any links or attachments.',
  },
  needs_review: {
    heading: 'Unusual patterns detected',
    body: 'This email has suspicious patterns. Be careful before clicking links or downloading anything.',
  },
};

function WarningBanner({ riskBucket, tone }) {
  if (!WARN_BUCKETS.has(riskBucket)) return null;
  const copy = WARN_COPY[riskBucket];
  const WarnIcon = riskBucket === 'needs_review' ? AlertTriangle : ShieldAlert;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="rounded-lg border p-3"
      style={{
        backgroundColor: `color-mix(in oklch, ${tone.hex} 10%, transparent)`,
        borderColor: `color-mix(in oklch, ${tone.hex} 25%, transparent)`,
      }}
    >
      <div className="flex items-start gap-2.5">
        <WarnIcon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.text)} />
        <div className="min-w-0">
          <p className={cn('text-sm font-semibold', tone.text)}>{copy.heading}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{copy.body}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Sender trust signals ───────────────────────────────────────────────── */

function SenderSignals({ email }) {
  const chips = [];

  if (email.isFirstTimeSender) {
    chips.push(
      <span
        key="first"
        className="inline-flex items-center gap-1 rounded-full border border-risk-review/30 bg-risk-review-soft px-2 py-0.5 text-[11px] font-medium text-risk-review"
      >
        <UserPlus className="h-3 w-3" />
        First-time sender
      </span>
    );
  }

  const replyMismatch =
    email.replyToDomain &&
    email.senderDomain &&
    email.replyToDomain.toLowerCase() !== email.senderDomain.toLowerCase();

  if (replyMismatch) {
    chips.push(
      <span
        key="reply"
        className="inline-flex items-center gap-1 rounded-full border border-risk-quarantine/30 bg-risk-quarantine-soft px-2 py-0.5 text-[11px] font-medium text-risk-quarantine"
        title={`Replies go to ${email.replyToDomain} · Sender is ${email.senderDomain}`}
      >
        <AlertTriangle className="h-3 w-3" />
        Reply address differs
      </span>
    );
  }

  if (chips.length === 0) return null;
  return <div className="mt-2 flex flex-wrap gap-1.5">{chips}</div>;
}

/* ─── Copy-to-clipboard link row ─────────────────────────────────────────── */

function LinkRow({ url }) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 1800);
    });
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <li className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5">
      <span
        className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80"
        title={url}
      >
        {url}
      </span>
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy URL'}
        className={cn(
          'shrink-0 rounded p-0.5 transition-colors',
          copied ? 'text-risk-safe' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </li>
  );
}

/* ─── Raw headers viewer ─────────────────────────────────────────────────── */

const IMPORTANT_HEADERS = new Set([
  'authentication-results', 'arc-authentication-results',
  'received', 'from', 'reply-to', 'dkim-signature',
  'x-spam-status', 'x-mailer'
]);

function RawHeadersCard({ headers }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAll = () => {
    const text = headers.map(h => `${h.name}: ${h.value}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <Card>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Technical details</span>
          <Badge variant="muted">{headers.length}</Badge>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/60 px-4 pb-4 pt-3">
              <div className="flex justify-end mb-2">
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-risk-safe" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy all'}
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto rounded-lg bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                {headers.map((h, i) => {
                  const isImportant = IMPORTANT_HEADERS.has(h.name.toLowerCase());
                  return (
                    <div key={i} className={cn('break-all', isImportant && 'text-primary')}>
                      <span className="font-semibold">{h.name}:</span>{' '}
                      <span className="text-foreground/70">{h.value}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export function EmailDetailPage() {
  const { emailId: paramId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const { ids = [] } = location.state || {};
  const currentIdx = ids.indexOf(paramId);
  const prevId = currentIdx > 0 ? ids[currentIdx - 1] : null;
  const nextId = currentIdx >= 0 && currentIdx < ids.length - 1 ? ids[currentIdx + 1] : null;

  const [email, setEmail] = useState(null);
  const [raw, setRaw] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const navTo = useCallback(
    (id) => navigate(`/inbox/${id}`, { state: { ids }, replace: true }),
    [navigate, ids]
  );

  const goBack = useCallback(() => {
    if (ids.length > 0) navigate(-1);
    else navigate('/inbox');
  }, [ids, navigate]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.key === 'ArrowLeft' || e.key === 'k') && prevId) { e.preventDefault(); navTo(prevId); }
      else if ((e.key === 'ArrowRight' || e.key === 'j') && nextId) { e.preventDefault(); navTo(nextId); }
      else if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prevId, nextId, navTo, goBack]);

  const handleReviewed = (result) => {
    setEmail((prev) => ({ ...prev, ...result }));
    bustCacheByPrefix('inbox-', 'dash-', 'risky-');
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      await scanEmail(emailId(email));
      await load();
      bustCacheByPrefix('inbox-', 'dash-', 'risky-');
      toast.success('Scan complete');
    } catch (err) {
      toast.error(err.message || 'Scan failed.');
    } finally {
      setRescanning(false);
    }
  };

  if (loading && !email) return <LoadingState label="Loading message…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!email) return null;

  const links = raw?.links || [];
  const attachments = raw?.attachmentExtensions || [];
  const LINKS_PREVIEW = 5;
  const visibleLinks = showAllLinks ? links : links.slice(0, LINKS_PREVIEW);
  const hiddenLinksCount = links.length - LINKS_PREVIEW;

  const senderName = getSenderName(email);
  const senderAddress = getSenderAddress(email);
  const showAddress =
    senderAddress && senderAddress !== senderName && !senderName.includes(senderAddress);
  const total = ids.length;
  const position = currentIdx >= 0 ? currentIdx + 1 : null;

  const { label, description, tone } = getRiskMeta(email.riskBucket);
  const isSafe = email.riskBucket === 'safe' || email.riskBucket === 'reviewed_safe';
  const VerdictIcon = isSafe ? CheckCircle2 : tone.icon;
  const sourceLabel =
    email.verdictSource === 'user'
      ? 'Reviewed by you'
      : email.verdictSource === 'scan'
      ? 'Automatic scan'
      : null;
  const SourceIcon = email.verdictSource === 'user' ? UserCheck : ScanLine;
  const scanScore = scan?.score ?? email?.latestScan?.score ?? null;

  return (
    <div className="space-y-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Button>
        {(prevId || nextId) && (
          <div className="flex items-center gap-1">
            {position && total > 1 && (
              <span className="mr-1 text-xs tabular-nums text-muted-foreground">
                {position} of {total}
              </span>
            )}
            <Button variant="ghost" size="icon-sm" disabled={!prevId}
              onClick={() => prevId && navTo(prevId)} title="Previous message (←)">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled={!nextId}
              onClick={() => nextId && navTo(nextId)} title="Next message (→)">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Verdict header card */}
      <Card style={{ borderLeftColor: tone.hex, borderLeftWidth: 3 }}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            {/* Animated score ring wrapping the verdict icon */}
            <ScoreRing score={scanScore} color={tone.hex}>
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tone.soft)}>
                <VerdictIcon className={cn('h-5 w-5', tone.text)} />
              </span>
            </ScoreRing>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('text-sm font-semibold', tone.text)}>{label}</span>
                {scanScore != null && (
                  <span className={cn('text-xs tabular-nums opacity-70', tone.text)}>
                    {scanScore}/100
                  </span>
                )}
                {sourceLabel && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <SourceIcon className="h-3 w-3" />
                    {sourceLabel}
                  </span>
                )}
              </div>
              <h1 className="mt-1.5 text-h3 font-semibold leading-snug">
                {email.subject || '(no subject)'}
              </h1>
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                <span className="font-medium text-foreground/90">{senderName}</span>
                {showAddress && (
                  <span className="min-w-0 truncate text-muted-foreground">
                    &lt;{senderAddress}&gt;
                  </span>
                )}
                <span className="text-border">·</span>
                <span className="text-muted-foreground">{formatDateTime(email.receivedAt)}</span>
              </div>
              {description && (
                <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
              )}

              {/* Sender trust signals: first-time sender + reply-to mismatch */}
              <SenderSignals email={email} />
            </div>

            <Button variant="outline" size="sm" className="shrink-0"
              disabled={rescanning} onClick={handleRescan}>
              {rescanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanLine className="h-4 w-4" />}
              {rescanning ? 'Scanning…' : 'Scan again'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email body (left) + security panel (right, sticky) */}
      <div className="grid min-w-0 gap-4 lg:grid-cols-3">
        {/* Message */}
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <Card className="min-w-0">
            <CardContent className="overflow-x-auto p-5">
              {/* Warning banner lives inside the reading context, above the body */}
              <WarningBanner riskBucket={email.riskBucket} tone={tone} />
              <div className={cn(WARN_BUCKETS.has(email.riskBucket) && 'mt-4')}>
                <EmailBody
                  htmlBody={raw?.htmlBody}
                  textBody={raw?.textBody}
                  riskBucket={email.riskBucket}
                />
              </div>
            </CardContent>
          </Card>

          {(links.length > 0 || attachments.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Links &amp; Attachments</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {links.length > 0 && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Link2 className="h-3.5 w-3.5" />
                      Links ({links.length})
                    </p>
                    <ul className="space-y-1">
                      {visibleLinks.map((link, i) => (
                        <LinkRow
                          key={i}
                          url={typeof link === 'string' ? link : link.url || link.href || ''}
                        />
                      ))}
                    </ul>
                    {hiddenLinksCount > 0 && (
                      <button
                        onClick={() => setShowAllLinks((v) => !v)}
                        className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                      >
                        {showAllLinks ? 'Show less' : `Show ${hiddenLinksCount} more`}
                      </button>
                    )}
                  </div>
                )}
                {attachments.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments ({attachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((ext, i) => (
                        <Badge key={i} variant="muted">
                          <Paperclip className="h-3 w-3" />
                          .{ext}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {raw?.rawHeaders?.length > 0 && (
            <RawHeadersCard headers={raw.rawHeaders} />
          )}
        </div>

        {/* Security panel */}
        <div className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Your decision</CardTitle>
            </CardHeader>
            <CardContent>
              <ReviewActions email={email} onReviewed={handleReviewed} />
            </CardContent>
          </Card>

          {scan && <ScanDetails scan={scan} />}
        </div>
      </div>
    </div>
  );
}
