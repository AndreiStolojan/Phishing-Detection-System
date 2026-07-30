// ─────────────────────────────────────────────────────────────────────────────
// EmailRow.jsx — un rând din lista de emailuri (panoul stâng al Inbox-ului).
//
// Ce arată, în ordine (triaj de phishing: dovada înaintea decorului):
//   1. numele expeditorului + ora primirii, pe același rând;
//   2. adresa expeditorului (mai mică, estompată) — în triaj adresa E dovada;
//   3. subiectul;
//   4. o linie meta: mini-bară de scor + scorul întreg + verdictul cu un bulin
//      colorat.
//
// Rândul poate funcționa în două moduri:
//   - implicit: e un <Link> către /inbox/:id (deep link / pagina de detaliu);
//   - cu prop-ul `onSelect`: devine un <button> care selectează emailul în
//     panoul din dreapta, fără navigare (workspace-ul cu două panouri).
//
// Culorile/etichetele de risc vin din `lib/risk.js` (sursă unică de adevăr).
// ─────────────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { ScoreMeter } from '@/components/inbox/ScoreMeter';
import { emailId, getSenderName, getSenderAddress } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

// Link din react-router care acceptă și props de animație framer-motion.
const MotionLink = motion.create(Link);
const MotionButton = motion.button;

export function EmailRow({
  email,
  active = false,
  linkState = null,
  compact = false,
  onSelect = null,
}) {
  const id = emailId(email);
  const { label, tone } = getRiskMeta(email.riskBucket);
  const score = email.latestScan?.score ?? null;

  const name = getSenderName(email);
  const address = getSenderAddress(email);
  // Nu repetăm adresa dacă e identică cu numele afișat (unele emailuri n-au nume).
  const showAddress = Boolean(address) && address !== name;

  const className = cn(
    'group grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-[3px]',
    'border-l-2 px-[18px] text-left outline-none transition-colors',
    compact ? 'py-2' : 'py-[11px]',
    // Selecția e periwinkle (primary): "ăsta e cel la care lucrezi" e o stare a
    // interfeței, nu un nivel de pericol. Hover-ul rămâne neutru.
    active
      ? 'border-l-primary bg-primary/[0.14]'
      : 'border-l-transparent hover:bg-foreground/[0.045]',
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

      <span className="col-span-2 mt-1 flex items-center gap-2.5">
        <ScoreMeter score={score} hex={tone.hex} className="w-16" />
        <span
          className={cn(
            'min-w-[1.5rem] text-right text-xs font-semibold tabular-nums',
            score == null ? 'text-muted-foreground' : tone.text
          )}
        >
          {score ?? '—'}
        </span>
        <span className={cn('flex min-w-0 items-center gap-1.5 text-xs', tone.text)}>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)} />
          <span className="truncate">{label}</span>
        </span>
      </span>
    </>
  );

  // Mod "workspace": selectează în panoul din dreapta, fără navigare.
  if (onSelect) {
    return (
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
  }

  // Mod implicit: link către pagina de detaliu (deep link, /inbox/:id).
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
