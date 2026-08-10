// ─────────────────────────────────────────────────────────────────────────────
// SenderAuthentication.jsx — arată dacă emailul chiar vine de la cine pretinde.
//
// Ce face, pe scurt: desenează cele trei verificări de expeditor (server de
// trimitere, semnătură, politica domeniului) pe care backendul le calculează la
// sincronizare și pe care interfața nu le-a arătat niciodată — deși erau deja
// în răspunsul API. Până acum singura urmă vizibilă a autentificării era o
// regulă în lista "Rules that fired", cu id-ul brut al regulii.
//
// Regula de aur a componentei: NU desenăm o verificare nereușită și una
// neefectuată la fel. `getSenderAuthentication` întoarce trei stări exact ca să
// putem spune "n-am putut verifica" fără să pară acuzație.
//
// Nu recalculează niciun risc; scorul rămâne al backendului.
// ─────────────────────────────────────────────────────────────────────────────

import { CircleHelp, ShieldCheck, ShieldX } from 'lucide-react';

import { getSenderAuthentication } from '@/lib/senderAuth';
import { cn } from '@/lib/utils';

// Cele trei stări, fiecare cu iconița și culoarea ei. `unknown` folosește
// intenționat tonul neutru "unscanned", nu galbenul de avertisment: absența unei
// verificări nu e un semnal de risc.
const STATE_TONE = {
    pass: {
        icon: ShieldCheck,
        hex: 'var(--color-risk-safe)',
        srLabel: 'Passed',
    },
    fail: {
        icon: ShieldX,
        hex: 'var(--color-risk-quarantine)',
        srLabel: 'Failed',
    },
    unknown: {
        icon: CircleHelp,
        hex: 'var(--color-risk-unscanned)',
        srLabel: 'Not verified',
    },
};

function Mechanism({ label, state, description }) {
    const tone = STATE_TONE[state] ?? STATE_TONE.unknown;
    const Icon = tone.icon;

    return (
        <div className="grid grid-cols-[16px_minmax(0,1fr)] items-baseline gap-3 border-b border-border/70 py-3 last:border-b-0">
            <Icon
                aria-hidden="true"
                className="h-4 w-4 translate-y-[3px]"
                style={{ color: tone.hex }}
            />
            <div className="min-w-0">
                <p className="text-[0.8125rem] font-medium text-foreground/90">
                    {label}
                    {/* Starea e purtată de culoare și de formă; screen readerele
                        au nevoie de ea în text. */}
                    <span className="sr-only"> — {tone.srLabel}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground break-words">
                    {description}
                </p>
            </div>
        </div>
    );
}

export function SenderAuthentication({ authResults, className }) {
    const { available, tone, summary, mechanisms } = getSenderAuthentication(authResults);

    if (!available) {
        return (
            <p className={cn('mt-3 text-sm text-muted-foreground', className)}>{summary}</p>
        );
    }

    return (
        <div className={cn('min-w-0', className)}>
            <p
                className="mt-3 text-[0.8125rem] font-medium"
                style={{ color: STATE_TONE[tone]?.hex }}
            >
                {summary}
            </p>
            <div className="mt-1.5">
                {mechanisms.map((mechanism) => (
                    <Mechanism key={mechanism.id} {...mechanism} />
                ))}
            </div>
        </div>
    );
}

export default SenderAuthentication;
