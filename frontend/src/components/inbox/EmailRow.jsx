// ─────────────────────────────────────────────────────────────────────────────
// EmailRow.jsx — un rând din lista de emailuri (pagina Inbox).
//
// Ce face, pe scurt: afișează o singură linie pentru un email: o iconiță sau o
// "monogramă" (cerculeț cu litera expeditorului), numele expeditorului,
// subiectul, opțional un mic fragment din conținut ("snippet"), data primirii
// și — pentru emailurile riscante — un badge de risc. Tot rândul e un link
// către pagina de detaliu a emailului (`/inbox/:id`).
//
// Pentru verdictele "zgomotoase" (loud — needs_review, quarantine,
// confirmed_phishing) rândul are o dungă colorată pe margine, iconița de risc
// în loc de monogramă, și badge-ul de risc vizibil. Culorile/iconițele/etichetele
// vin din `lib/risk.js` (single source of truth pentru afișarea riscului).
//
// Folosit în: pagina Inbox, lista de emailuri (vezi docs/EXPLICATIE_FRONTEND.md §7).
// ─────────────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

import { RiskBadge } from '@/components/security/RiskBadge';
import { emailId, getSenderName, getSnippet, getSenderMonogram } from '@/lib/email';
import { getRiskMeta } from '@/lib/risk';
import { formatEmailDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

// Componentă "Link" din react-router, dar care poate primi și props de animație
// de la framer-motion (whileTap etc.) — practic un Link animabil.
const MotionLink = motion.create(Link);

export function EmailRow({ email, active = false, linkState = null, compact = false }) {
  const id = emailId(email); // id-ul emailului, folosit pentru link-ul către detaliu
  const { tone } = getRiskMeta(email.riskBucket); // "tonul" vizual (culori, icon) pentru riscul acestui email
  // "loud" = verdicte care merită atenție vizuală sporită (needs_review,
  // quarantine, confirmed_phishing). Restul ("calm") au doar monogramă.
  const loud = tone.emphasis === 'loud';
  const Icon = tone.icon;
  const { letter, hue } = getSenderMonogram(email); // litera + culoarea monogramei expeditorului

  return (
    <MotionLink
      to={`/inbox/${id}`}
      state={linkState}
      whileTap={{ scale: 0.995 }} // mic efect de "apăsare" la click/tap
      style={{ borderLeftColor: loud ? tone.hex : 'transparent' }}
      className={cn(
        'group flex items-center gap-3 border-l-[3px] px-4 outline-none transition-colors',
        compact ? 'py-2.5' : 'py-3',
        'hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.04]',
        'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
        active && 'bg-accent'
      )}
    >
      {/* Partea din stânga: iconiță de risc pentru verdictele "loud",
          sau monograma expeditorului pentru cele "calme" */}
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

      {/* Coloana centrală: nume expeditor, subiect și (dacă nu e modul compact)
          un mic fragment din conținut. "truncate" taie textul cu "..." dacă e
          prea lung pentru a încăpea pe un rând. */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-foreground">
          {getSenderName(email)}
        </p>
        <p className={cn('truncate text-sm', loud ? 'text-foreground/90' : 'text-foreground/80')}>
          {email.subject || '(no subject)'}
        </p>
        {!compact && (
          <p className="truncate text-caption text-muted-foreground">{getSnippet(email)}</p>
        )}
      </div>

      {/* Coloana din dreapta: data primirii și, doar pentru verdictele "loud",
          badge-ul colorat cu riscul emailului */}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <time className="text-xs tabular-nums text-muted-foreground">
          {formatEmailDate(email.receivedAt)}
        </time>
        {loud && <RiskBadge riskBucket={email.riskBucket} size="sm" />}
      </div>

      {/* Săgeata ">" din extrema dreapta, care se mișcă puțin la hover (efect vizual) */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
    </MotionLink>
  );
}
