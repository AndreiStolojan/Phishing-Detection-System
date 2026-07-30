// ─────────────────────────────────────────────────────────────────────────────
// MessagePane.jsx — panoul din dreapta al workspace-ului Inbox.
//
// Ordinea de citire (cerută explicit în spec, de sus în jos):
//   1. Subiect + expeditor (nume · adresă · ora primirii)
//   2. Verdict + acțiuni pe un singur rând (scor mare, bară subțire colorată,
//      cuvântul verdictului, o propoziție simplă, butoanele de decizie)
//   3. "Why we flagged it" — motivele scanului, în propoziții normale
//   4. Message — corpul emailului (EmailBody)
//   5. "How the score was reached" — Rule engine / AI model / Combined
//   6. Triggered rules
//   7. Links + Attachments, unul lângă altul
//
// Datele vin din trei apeluri deja existente: getEmail (detalii + stare),
// getEmailRaw (corp, linkuri, extensii de atașament) și getLatestScan (scor,
// reasons[], triggeredRules[]). Nu există cod nou de fetch aici.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, Loader2, Mail, Paperclip, ShieldCheck, ShieldX } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorState, LoadingState } from '@/components/common/states';
import { EmailBody } from '@/components/inbox/EmailBody';
import { ScoreMeter } from '@/components/inbox/ScoreMeter';
import { Button } from '@/components/ui/button';
import { getEmail, getEmailRaw } from '@/api/emailsApi';
import { getLatestScan } from '@/api/scansApi';
import { markEmailSafe, markEmailPhishing } from '@/api/actionsApi';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { getRiskMeta, getRuleLabel } from '@/lib/risk';
import { getAiStatus, AI_SCORE_MAX, RULE_SCORE_MAX, SCORE_MAX } from '@/lib/scoring';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

/* ─── Section heading (hairline + label + optional right-aligned note) ───── */

function SectionHead({ children, note, className }) {
  return (
    <div
      className={cn(
        'mt-8 flex items-baseline gap-2.5 border-t border-border/70 pt-5 text-xs font-semibold text-muted-foreground',
        className
      )}
    >
      <span>{children}</span>
      {note && (
        <span className="ml-auto font-normal text-muted-foreground-subtle tabular-nums">{note}</span>
      )}
    </div>
  );
}

/* ─── Empty right pane — a deliberate state, not an accident ─────────────── */

export function MessagePaneEmpty({ hint = 'Pick a message on the left to see why it was scored the way it was.' }) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-8 py-16 text-center">
      <span className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground">
        <Mail className="h-4 w-4" />
      </span>
      <p className="text-sm font-semibold text-foreground/80">Select a message</p>
      <p className="max-w-[34ch] text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

/* ─── Main pane ──────────────────────────────────────────────────────────── */

export function MessagePane({ id, onReviewed }) {
  const [email, setEmail] = useState(null);
  const [raw, setRaw] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null); // 'safe' | 'phishing' | null

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const detail = await getEmail(id);
      const [rawResult, scanResult] = await Promise.allSettled([
        getEmailRaw(id),
        getLatestScan(id),
      ]);
      setEmail(detail);
      setRaw(rawResult.status === 'fulfilled' ? rawResult.value : null);
      setScan(
        scanResult.status === 'fulfilled' ? scanResult.value : detail.latestScan || null
      );
    } catch (err) {
      setError(err.message || 'Failed to load this message.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Reîncarcă la fiecare schimbare de selecție; golim starea veche ca panoul
  // să nu arate pentru o clipă emailul precedent.
  useEffect(() => {
    setEmail(null);
    setRaw(null);
    setScan(null);
    load();
  }, [load]);

  const handleReview = async (kind) => {
    setBusy(kind);
    try {
      const result = await (kind === 'safe' ? markEmailSafe(id) : markEmailPhishing(id));
      setEmail((prev) => ({ ...prev, ...result }));
      toast.success(
        kind === 'safe' ? 'Marked as safe' : 'Marked as phishing · Moved to Gmail Spam'
      );
      onReviewed?.(result);
    } catch (err) {
      toast.error(err.message || 'Action failed. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  if (!id) return <MessagePaneEmpty />;
  if (loading && !email) return <LoadingState label="Loading message…" className="py-24" />;
  if (error) return <ErrorState message={error} onRetry={load} className="py-24" />;
  if (!email) return null;

  const { label: verdictLabel, description, tone } = getRiskMeta(email.riskBucket);
  const score = scan?.score ?? email.latestScan?.score ?? null;
  const ruleScore = scan?.ruleScore ?? email.latestScan?.ruleScore ?? null;
  const aiScore = scan?.aiScore ?? email.latestScan?.aiScore ?? null;
  const ai = getAiStatus(scan || email.latestScan);
  const aiOff = ai.state !== 'ok';

  const senderName = getSenderName(email);
  const senderAddress = getSenderAddress(email);
  const showAddress = senderAddress && senderAddress !== senderName;

  const reasons = Array.isArray(scan?.reasons) ? scan.reasons.filter(Boolean) : [];
  const summary = scan?.aiExplanation?.summary;
  const firstLook = reasons.length > 0 ? reasons : summary ? [summary] : [];

  const rules = Array.isArray(scan?.triggeredRules) ? scan.triggeredRules : [];
  const links = raw?.links || [];
  const attachments = raw?.attachmentExtensions || [];

  const userVerdict = email.userVerdict ?? null;

  return (
    <div className="min-w-0 max-w-[980px] px-5 pb-16 pt-6 min-[780px]:px-[30px]">
      {/* 1 ─ Subject + sender ------------------------------------------------ */}
      <h1 className="text-[1.25rem] font-semibold leading-tight tracking-tight">
        {email.subject || '(no subject)'}
      </h1>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-border/70 pb-5 text-[0.8125rem]">
        <span className="font-medium text-foreground/90">{senderName}</span>
        {showAddress && <span className="min-w-0 truncate text-muted-foreground">{senderAddress}</span>}
        <span className="ml-auto whitespace-nowrap tabular-nums text-muted-foreground">
          {formatDateTime(email.receivedAt)}
        </span>
      </div>

      {/* 2 ─ Verdict + actions on one row ------------------------------------ */}
      <div className="grid items-center gap-5 py-5 min-[780px]:grid-cols-[auto_minmax(0,1fr)_auto]">
        <div className="grid gap-[7px]">
          <div
            className="flex items-baseline gap-1 text-[2.5rem] font-bold leading-none tracking-tighter tabular-nums"
            style={{ color: tone.hex }}
          >
            {score ?? '—'}
            <span className="text-[0.8125rem] font-medium tracking-normal text-muted-foreground">
              /{SCORE_MAX}
            </span>
          </div>
          <ScoreMeter score={score} hex={tone.hex} className="w-full min-w-[92px]" />
        </div>

        <div className="min-w-0">
          <p className="text-[1.0625rem] font-semibold tracking-tight" style={{ color: tone.hex }}>
            {verdictLabel}
          </p>
          {description && (
            <p className="mt-1 max-w-[54ch] text-[0.8125rem] text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || userVerdict === 'phishing'}
            onClick={() => handleReview('phishing')}
            className="border-risk-phishing/40 text-risk-phishing hover:bg-risk-phishing-soft hover:text-risk-phishing"
          >
            {busy === 'phishing' ? <Loader2 className="animate-spin" /> : <ShieldX />}
            {userVerdict === 'phishing' ? 'Marked as phishing' : 'Mark as phishing'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={busy !== null || userVerdict === 'safe'}
            onClick={() => handleReview('safe')}
          >
            {busy === 'safe' ? <Loader2 className="animate-spin" /> : <ShieldCheck className="text-risk-safe" />}
            {userVerdict === 'safe' ? 'Marked as safe' : 'Mark as safe'}
          </Button>
        </div>
      </div>

      {/* 3 ─ Why we flagged it ----------------------------------------------- */}
      <div className="grid gap-2.5 rounded-xl border border-border/70 bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground">Why we flagged it</p>
        {firstLook.length > 0 ? (
          firstLook.map((reason, i) => (
            <p key={i} className="flex items-baseline gap-2.5 text-sm leading-relaxed text-foreground/85">
              <span
                className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full"
                style={{ backgroundColor: tone.hex }}
              />
              <span className="min-w-0">{reason}</span>
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing stood out in this message — no detection rule matched it.
          </p>
        )}
      </div>

      {/* 4 ─ The message ------------------------------------------------------ */}
      <SectionHead>Message</SectionHead>
      <div className="min-w-0 overflow-x-auto">
        <EmailBody htmlBody={raw?.htmlBody} textBody={raw?.textBody} riskBucket={email.riskBucket} />
      </div>

      {/* 5 ─ How the score was reached ---------------------------------------- */}
      <SectionHead>How the score was reached</SectionHead>
      <div className="grid gap-px overflow-hidden rounded-xl border border-border/70 bg-border/70 min-[780px]:grid-cols-3">
        <div className="bg-card px-4 py-4">
          <span className="text-xs font-medium text-muted-foreground">Rule engine</span>
          <span className="mt-1.5 block text-2xl font-semibold leading-none tracking-tight tabular-nums">
            {ruleScore ?? '—'}
          </span>
          <span className="mt-1.5 block text-xs text-muted-foreground-subtle tabular-nums">
            out of {RULE_SCORE_MAX} · {rules.length} rule{rules.length === 1 ? '' : 's'} triggered
          </span>
        </div>

        {/* AI e oprit în acest mediu: arătăm cinstit "Not enabled", nu un 0
            înșelător. Starea vine din getAiStatus (lib/scoring). */}
        <div className="bg-card px-4 py-4">
          <span className="text-xs font-medium text-muted-foreground">AI model</span>
          {aiOff ? (
            <>
              <span className="mt-1.5 block text-base font-semibold leading-tight text-muted-foreground">
                {ai.state === 'disabled' ? 'Not enabled' : 'Unavailable'}
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground-subtle">
                {ai.state === 'disabled' ? 'AI scoring is off' : ai.message}
              </span>
            </>
          ) : (
            <>
              <span className="mt-1.5 block text-2xl font-semibold leading-none tracking-tight tabular-nums">
                {aiScore ?? '—'}
              </span>
              <span className="mt-1.5 block text-xs text-muted-foreground-subtle tabular-nums">
                out of {AI_SCORE_MAX}
              </span>
            </>
          )}
        </div>

        <div className="bg-card px-4 py-4">
          <span className="text-xs font-medium text-muted-foreground">Combined</span>
          <span
            className="mt-1.5 block text-2xl font-semibold leading-none tracking-tight tabular-nums"
            style={{ color: tone.hex }}
          >
            {score ?? '—'}
          </span>
          <span className="mt-1.5 block text-xs text-muted-foreground-subtle tabular-nums">
            out of {SCORE_MAX} · {verdictLabel}
          </span>
        </div>
      </div>

      {/* 6 ─ Triggered rules --------------------------------------------------- */}
      <SectionHead note={rules.length > 0 ? `${rules.length}` : null}>Triggered rules</SectionHead>
      {rules.length > 0 ? (
        <div className="grid gap-x-7 min-[1100px]:grid-cols-2">
          {rules.map((rule, i) => (
            <div
              key={`${rule.rule}-${i}`}
              className="grid grid-cols-[9px_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/70 py-3 last:border-b-0"
            >
              <span
                className="h-[5px] w-[5px] rounded-full"
                style={{ backgroundColor: tone.hex }}
              />
              <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-foreground/90">
                  {getRuleLabel(rule.rule)}
                </p>
                {rule.details && (
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {rule.details}
                  </p>
                )}
              </div>
              <span className="text-[0.8125rem] font-semibold tabular-nums text-muted-foreground">
                +{rule.points}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No detection rule matched this message.</p>
      )}

      {/* 7 ─ Links + attachments, side by side --------------------------------- */}
      <div className="grid gap-6 min-[1100px]:grid-cols-2">
        <div>
          <SectionHead note={links.length > 0 ? `${links.length} found` : 'None'}>Links</SectionHead>
          {links.length > 0 ? (
            <ul className="grid gap-1.5">
              {links.map((link, i) => {
                const url = typeof link === 'string' ? link : link?.url || link?.href || '';
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 rounded-md bg-muted/50 px-2.5 py-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground-subtle" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/80" title={url}>
                      {url}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">This message has no links.</p>
          )}
        </div>

        <div>
          <SectionHead note={attachments.length > 0 ? `${attachments.length}` : 'None'}>
            Attachments
          </SectionHead>
          {attachments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {/* Backend-ul trimite DOAR extensiile — nu inventăm nume de fișier. */}
              {attachments.map((ext, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 font-mono text-xs text-foreground/80"
                >
                  <Paperclip className="h-3 w-3 text-muted-foreground-subtle" />
                  .{String(ext).replace(/^\./, '')}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">This message has no attachments.</p>
          )}
        </div>
      </div>

      {/* Deep link către pagina de detaliu completă (headere brute, rescan). */}
      <div className="mt-8 flex items-center gap-2 border-t border-border/70 pt-4 text-xs text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Need the raw headers or a rescan?</span>
        <Link
          to={`/inbox/${emailId(email)}`}
          className="font-medium text-link underline-offset-2 hover:underline"
        >
          Open the full report
        </Link>
      </div>
    </div>
  );
}
