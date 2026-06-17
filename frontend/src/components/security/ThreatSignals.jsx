// ─────────────────────────────────────────────────────────────────────────────
// ThreatSignals.jsx — lista de "semnale" (reguli declanșate) pentru un email.
//
// Ce face, pe scurt: primește `scan.triggeredRules` (lista de reguli/semnale
// declanșate de motorul de scanare — vezi RULE_WEIGHTS din scoring.config.js
// și scan-explanation.service.js) și afișează fiecare regulă ca un rând cu
// icon, etichetă (label) prietenoasă, explicație și punctele acumulate.
// Distinge vizual semnalele venite de la reguli fixe față de cele venite de
// la AI (Ollama, semnale "ai_semantic:*").
//
// Folosit în ScanDetails.jsx, sub bara de scor.
//
// Detalii: docs/EXPLICATIE_FRONTEND.md §6.3.
// ─────────────────────────────────────────────────────────────────────────────

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Link2,
  Paperclip,
  KeyRound,
  Globe,
  Zap,
  Users,
  Building2,
  Bot,
  ShieldAlert,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/*
  Etichete prietenoase (în engleză, limba UI-ului) pentru fiecare regulă pe
  care motorul de scanare o poate declanșa. Cheile trebuie să corespundă
  exact cu numele regulilor din backend (RULE_WEIGHTS / triggeredRules).
  Fiecare intrare: { label, detail, icon, isAi }
  - label  = titlul scurt afișat
  - detail = explicația afișată sub titlu (poate fi suprascrisă de backend)
  - icon   = iconița din lucide-react
  - isAi   = true dacă semnalul vine de la analiza AI (Ollama), nu de la o regulă fixă
*/
const RULE_META = {
  user_blocklist_match: {
    label: 'Sender blocked by you',
    detail: 'You added this sender or its domain to your blocked list, so the email is always treated as likely phishing.',
    icon: ShieldAlert,
    isAi: false,
  },
  reply_to_mismatch: {
    label: 'Reply goes to a different address',
    detail: 'If you reply, your message would go to a different address than the sender — a common trick used in phishing.',
    icon: AlertTriangle,
    isAi: false,
  },
  shortened_url_detected: {
    label: 'Shortened link detected',
    detail: 'Shortened links hide the real destination and are often used in phishing.',
    icon: Link2,
    isAi: false,
  },
  'suspicious_link_pattern:ip_address_link': {
    label: 'Link uses an IP address',
    detail: 'Legitimate services use domain names, not raw IP addresses.',
    icon: Globe,
    isAi: false,
  },
  'suspicious_link_pattern:embedded_credentials': {
    label: 'Login details embedded in link',
    detail: 'A link containing a username or password is a strong sign of phishing.',
    icon: KeyRound,
    isAi: false,
  },
  'suspicious_link_pattern:punycode_domain': {
    label: 'Lookalike domain detected',
    detail: 'This domain uses special characters to look like a real brand but is not.',
    icon: Globe,
    isAi: false,
  },
  'suspicious_link_pattern:very_long_url': {
    label: 'Unusually long link',
    detail: 'Excessively long links often hide where they actually lead.',
    icon: Link2,
    isAi: false,
  },
  high_risk_attachment_extension: {
    label: 'Dangerous file attachment',
    detail: 'This email has a file attachment that could be used to install malware.',
    icon: Paperclip,
    isAi: false,
  },
  archive_attachment_extension: {
    label: 'Compressed archive attachment',
    detail: 'Zip and archive files are sometimes used to hide malicious content.',
    icon: Paperclip,
    isAi: false,
  },
  too_many_links_high: {
    label: 'Too many links',
    detail: 'An unusually high number of links is a common pattern in phishing emails.',
    icon: Link2,
    isAi: false,
  },
  too_many_links_medium: {
    label: 'Too many links',
    detail: 'A high number of links can indicate bulk phishing content.',
    icon: Link2,
    isAi: false,
  },
  'ai_semantic:urgency_high': {
    label: 'Urgency language',
    detail: 'The AI found language designed to create panic and rush you into acting.',
    icon: Zap,
    isAi: true,
  },
  'ai_semantic:urgency_medium': {
    label: 'Urgency language',
    detail: 'The AI found words pressuring you to act immediately.',
    icon: Zap,
    isAi: true,
  },
  'ai_semantic:sensitive_data_request': {
    label: 'Asks for personal information',
    detail: 'The AI detected a request for your password, payment details, or personal codes.',
    icon: KeyRound,
    isAi: true,
  },
  'ai_semantic:login_or_action_request': {
    label: 'Pressures you to act immediately',
    detail: 'The AI found language pushing you to click a link or sign in right away.',
    icon: ShieldAlert,
    isAi: true,
  },
  'ai_semantic:social_engineering_high': {
    label: 'Social engineering',
    detail: 'The AI found manipulative language — using fear, authority, or rewards to trick you.',
    icon: Users,
    isAi: true,
  },
  'ai_semantic:social_engineering_medium': {
    label: 'Social engineering',
    detail: 'The AI found some manipulation tactics in this email.',
    icon: Users,
    isAi: true,
  },
  'ai_semantic:brand_impersonation_suspected': {
    label: 'Pretending to be a known brand',
    detail: 'The AI detected that this email may be impersonating a company or brand you know.',
    icon: Building2,
    isAi: true,
  },
};

// Pentru o regulă necunoscută (nu e în RULE_META) construim o etichetă "decentă"
// direct din numele tehnic al regulii: scoatem prefixul "ai_semantic:" și
// sufixele de severitate (_high/_medium/_low), înlocuim "_" și ":" cu spații
// și punem majusculă la fiecare cuvânt. Ex: "ai_semantic:foo_bar_high" -> "Foo Bar".
const fallbackMeta = (rule) => ({
  label: rule
    .replace(/^ai_semantic:/, '')
    .replace(/_(high|medium|low)$/, '')
    .replace(/[_:]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()),
  detail: null,
  icon: AlertTriangle,
  isAi: rule.startsWith('ai_semantic:'),
});

// Caută metadatele unei reguli în RULE_META; dacă nu există, generează unele
// "din mers" cu fallbackMeta, ca să nu rămână rânduri goale pentru reguli noi.
const getRuleMeta = (rule) => RULE_META[rule] || fallbackMeta(rule);

// Un rând din lista de semnale: icon, etichetă, badge "AI" (dacă semnalul vine
// din analiza AI), explicație și punctele acumulate (dacă există).
function SignalRow({ rule, points, details: backendDetail, index }) {
  const { label, detail, icon: Icon, isAi } = getRuleMeta(rule);
  // Explicația din backend (specifică acestui email) are prioritate; altfel
  // folosim explicația generică din RULE_META.
  const displayDetail = backendDetail || detail;

  return (
    // motion.li animă apariția fiecărui rând, cu o mică întârziere în funcție
    // de poziția lui în listă (efect de "cascadă").
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-3 py-2.5',
        isAi
          ? 'border-primary/20 bg-primary/[0.04]'
          : 'border-risk-review/30 bg-risk-review/[0.06]'
      )}
    >
      {/* Iconița din stânga, cu fundal colorat diferit pentru semnale AI */}
      <span
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
          isAi ? 'bg-primary/15 text-primary' : 'bg-risk-review-soft text-risk-review'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium leading-tight">{label}</span>
          {/* Badge "AI" — afișat doar pentru semnalele detectate de Ollama */}
          {isAi && (
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-primary/10 px-1 py-0 text-[10px] font-medium text-link">
              <Bot className="h-2.5 w-2.5" />
              AI
            </span>
          )}
        </div>
        {/* Explicația detaliată — opțională, afișată doar dacă există */}
        {displayDetail && (
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{displayDetail}</p>
        )}
      </div>

      {/* Numărul de puncte adăugate la scor de această regulă (poate fi null) */}
      {points != null && (
        <Badge variant="muted" className="mt-0.5 shrink-0 tabular-nums">
          +{points}
        </Badge>
      )}
    </motion.li>
  );
}

export function ThreatSignals({ scan }) {
  // Fără scan, nu avem ce afișa.
  if (!scan) return null;

  // `triggeredRules` poate fi un array de string-uri (numele regulii) sau de
  // obiecte { rule, points, details } — vezi mai jos cum facem distincția.
  const triggered = Array.isArray(scan.triggeredRules) ? scan.triggeredRules : [];
  // Dacă nu s-a declanșat nicio regulă, nu afișăm secțiunea deloc.
  if (triggered.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="label-overline flex items-center gap-1.5 text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        What triggered the warning
        {/* Numărul total de semnale declanșate */}
        <span className="ml-auto rounded-full bg-muted px-2 py-0 text-[10px] font-semibold tabular-nums text-foreground/70">
          {triggered.length}
        </span>
      </p>
      <ul className="space-y-1.5">
        {/* Parcurgem fiecare regulă declanșată și o transformăm într-un SignalRow.
            Elementele pot fi simple string-uri (doar numele regulii) sau obiecte
            cu detalii suplimentare (puncte, descriere specifică acestui email). */}
        {triggered.map((rule, i) => (
          <SignalRow
            key={i}
            index={i}
            rule={typeof rule === 'string' ? rule : rule.rule}
            points={typeof rule === 'object' ? (rule.points ?? null) : null}
            details={typeof rule === 'object' ? rule.details : null}
          />
        ))}
      </ul>
    </div>
  );
}
