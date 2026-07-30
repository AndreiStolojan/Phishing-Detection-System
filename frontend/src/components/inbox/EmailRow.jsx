// ─────────────────────────────────────────────────────────────────────────────
// EmailRow.jsx — one row of the inbox message list (left pane).
//
// What it shows, in order (phishing triage: evidence before decoration):
//   1. sender name + received time on one line;
//   2. the sender ADDRESS — in triage the address is the evidence
//      (paypal-account-verify.com), so it is never hidden behind a click;
//   3. the subject;
//   4. a meta line: score meter + the score + the verdict with a coloured dot.
//
// Three modes:
//   - default: a <Link> to /inbox/:id (deep links / older bookmarks);
//   - `onSelect`: a <button> that selects the message in the right pane;
//   - `checkable`: the row is wrapped so a bulk-select checkbox can sit beside
//     the button (a checkbox cannot be nested inside a <button>).
//
// Colour split, deliberate: the NUMBER and its meter use the continuous ramp
// from lib/scoreScale.js, the verdict WORD keeps its categorical colour from
// lib/risk.js. The number answers "how bad", the word answers "which bucket".
// ─────────────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ScoreMeter } from '@/components/inbox/ScoreMeter';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { getRiskTextColor, isScored } from '@/lib/scoreScale';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

// react-router's Link, wrapped so it also accepts framer-motion props.
const MotionLink = motion.create(Link);
const MotionButton = motion.button;

export function EmailRow({
  email,
  active = false,
  linkState = null,
  compact = false,
  onSelect = null,
  checkable = false,
  checked = false,
  onCheck = null,
}) {
  const id = emailId(email);
  const { label, tone } = getRiskMeta(email.riskBucket);
  const score = email.latestScan?.score ?? null;
  const scored = isScored(score);

  const name = getSenderName(email);
  const address = getSenderAddress(email);
  // Don't repeat the address when it is identical to the displayed name.
  const showAddress = Boolean(address) && address !== name;

  const className = cn(
    'group grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-[3px]',
    'border-l-2 text-left outline-none transition-colors',
    checkable ? 'pl-2 pr-[18px]' : 'px-[18px]',
    compact ? 'py-2' : 'py-[11px]',
    // Selection is periwinkle (primary): "this is the one you're working on" is
    // a state of the interface, not a level of danger. Hover stays neutral.
    active && 'border-l-primary bg-primary/[0.14]',
    // In bulk-select mode the hover tint belongs to the wrapper (which also
    // covers the checkbox), so the button must not paint a second one.
    !active && 'border-l-transparent',
    !active && !checkable && 'hover:bg-foreground/[0.045]',
    'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50'
  );

  const content = (
    <>
      <span className="truncate text-[0.8125rem] font-semibold text-foreground">
        {name}
      </span>
      <time className="shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatEmailDate(email.receivedAt)}
      </time>

      {showAddress && (
        <span className="col-span-2 truncate text-xs text-muted-foreground">
          {address}
        </span>
      )}

      <span
        className={cn(
          'col-span-2 mt-0.5 truncate text-[0.8125rem]',
          active ? 'text-foreground/90' : 'text-foreground/70'
        )}
      >
        {email.subject || '(no subject)'}
      </span>

      <span className="col-span-2 mt-1 flex min-w-0 items-center gap-2.5">
        <ScoreMeter score={score} className="w-16" />
        <span
          className={cn(
            'min-w-[1.5rem] shrink-0 text-right text-xs font-semibold tabular-nums',
            !scored && 'text-muted-foreground'
          )}
          style={scored ? { color: getRiskTextColor(score) } : undefined}
        >
          {scored ? score : '—'}
        </span>
        <span className={cn('flex min-w-0 items-center gap-1.5 text-xs', tone.text)}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
          <span className="truncate">{label}</span>
        </span>
      </span>
    </>
  );

  // Workspace mode: select into the right pane, no navigation.
  if (onSelect) {
    const button = (
      <MotionButton
        type="button"
        onClick={() => onSelect(id)}
        whileTap={{ scale: 0.995 }}
        aria-current={active ? 'true' : undefined}
        className={className}
      >
        {content}
      </MotionButton>
    );

    if (!checkable) return button;

    // Bulk-select mode: the checkbox sits outside the button, sharing the row's
    // hover/selected surface so the two still read as one target area.
    return (
      <div className="flex min-w-0 items-start gap-2 pl-3 transition-colors hover:bg-foreground/[0.045]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onCheck?.(id)}
          aria-label={`Select ${email.subject || 'message'}`}
          className="mt-3.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
        />
        {button}
      </div>
    );
  }

  // Default mode: link to the detail route (deep link, /inbox/:id).
  return (
    <MotionLink
      to={`/inbox/${id}`}
      state={linkState}
      whileTap={{ scale: 0.995 }}
      className={className}
    >
      {content}
    </MotionLink>
  );
}
