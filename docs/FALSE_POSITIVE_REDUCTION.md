# False-Positive Reduction — Brand Verification & Context Modifiers

**Date:** 2026-06-10
**Engine version:** `rules-ai-v5` → `rules-ai-v6` (new scans only; old scans keep their score until rescanned)
**Semantic prompt:** `semantic-v2` → `semantic-v3`
**Scope:** Reasoning document produced *before* the code change, per the task brief. Companion to `docs/SCORING_WEIGHTS_REVIEW.md` (which owns the base weights — left untouched here).

---

## STEP 1 — Written analysis (the 5 questions)

### 1. What is the current brand-impersonation detection logic?

There is **no deterministic brand-impersonation rule**. The only impersonation signal in the
whole engine is a single boolean from the Ollama semantic layer, `brandImpersonationSuspected`,
worth **+10** points on the AI sub-score (`AI_SIGNAL_WEIGHTS.brand_impersonation_suspected`).
The local model is asked, in free text, "does this look like impersonation of a known brand?"
and returns true/false. Nothing else (no rule, no list, no header check) participates.

### 2. Does the current logic check whether the sender's domain matches the brand?

**No.** This is the core defect. The model receives the subject, body, links and `from`
string, but the engine never compares the *actual sender domain* against the brand the email
appears to represent. So a legitimate `service@paypal.com` email mentioning PayPal and a
spoofed `security@paypal-alerts.ru` email mentioning PayPal are treated the same: the model
sees "PayPal" language, often returns `brandImpersonationSuspected = true`, and **+10** is
added to a real PayPal email. The most reliable anti-impersonation signal — *the sender is
literally on the brand's own domain* — was being ignored.

### 3. What other rules contribute to false positives on legitimate brand mail?

Legitimate transactional/marketing mail naturally trips several signals at once:

| Signal | Weight | Why it fires on legit brand mail |
| --- | --- | --- |
| `reply_to_mismatch` | 18 | ESPs send from one domain, route replies to another (very common). |
| `too_many_links_high` / `_medium` | 18 / 10 | Brand newsletters are link-dense by design. |
| `ai_semantic:urgency_*` | 8 / 4 | "Your statement is ready", "action required" are normal account alerts. |
| `ai_semantic:login_or_action_request` | 8 | Every brand email has a "Sign in" / "View order" CTA. |
| `ai_semantic:social_engineering_*` | 12 / 6 | Account/security framing overlaps with this. |
| `ai_semantic:brand_impersonation_suspected` | 10 | Fires precisely because it's a brand email (see Q2). |

A real PayPal statement email can easily stack `brand_impersonation (10) + urgency (8) +
login_or_action (8) + too_many_links_medium (10) = 36` → **"suspicious"**, with zero actual
malicious content. That is the false-positive engine.

### 4. What context does the Ollama prompt receive? Can it reason about the sender?

Before this change: the `semantic-v2` prompt embedded the serialized email (which *did*
include `metadata.senderDomain`), but the **instructions never told the model to use the
sender domain to judge impersonation**. It was told, generically, "phishing emails typically
impersonate a known brand…", which biases it toward flagging any brand-looking email. It had
the domain buried in data but no instruction to reason about it, and no notion of "this sender
is verified".

### 5. Are the verdict thresholds too aggressive?

Thresholds are `safe 0–29 / suspicious 30–59 / likely_phishing 60+` on a 0–100 scale
(≈ `0.30` and `0.60` normalized). Compared with the task's suggested `0.35 / 0.65`, ours are
only marginally tighter. They are **not** the primary false-positive driver — the driver is
that legit brand mail *accumulates real points it shouldn't*. Lowering the global threshold
would also lower recall on genuine phishing. The correct fix is to stop awarding those points
in the verified-brand context, not to move the goalposts. See Task 4 for the decision.

---

## TASK 1 — Brand domain matching (the primary fix)

New config `backend/src/config/brand-domains.config.js` + new service
`backend/src/services/brand-verification.service.js`.

`verifySenderBrand({ senderDomain })` returns
`{ senderVerifiedBrand, brandKey, brandName, matchedDomain, officialDomains, senderDomain }`.

- **Match = suffix-aware.** `senderDomain === official || senderDomain.endsWith("." + official)`,
  so `mail.paypal.com` ✓ matches `paypal.com`, while `evil-paypal.com` ✗ and
  `paypal.com.evil.com` ✗ do not.
- When verified: `brand_impersonation_suspected` is forced to **0** (Task 2 modifier), the
  `sender_verified_brand` flag is set and threaded everywhere (rules, AI scoring, AI prompt,
  explanation, persisted on the `Scan`, exposed on the API, shown as a UI badge).
- When **not** verified (brand not in the list, or sender domain doesn't match): nothing
  changes — the existing Ollama impersonation analysis runs exactly as before (safe fallback).

### Brand domain list

| Brand | Official sending domains (verified) |
| --- | --- |
| PayPal | paypal.com, paypal.co.uk, paypal.de, paypal.fr, paypal.es, paypal.it, paypal.me, paypalobjects.com |
| Google | google.com, accounts.google.com, mail.google.com, docs.google.com, drive.google.com, youtube.com |
| Amazon | amazon.com, amazon.co.uk, amazon.de, amazon.fr, amazon.es, amazon.it, amazon.ca, amazon.in, amazon.co.jp |
| Microsoft | microsoft.com, microsoftonline.com, office.com, office365.com, microsoft365.com, azure.com, windows.com, microsoftstore.com, accountprotection.microsoft.com, email.microsoft.com |
| Apple | apple.com, id.apple.com, email.apple.com, itunes.com |
| Netflix | netflix.com, netflix.net, mailer.netflix.com |
| Meta / Facebook | facebook.com, facebookmail.com, fb.com, meta.com, instagram.com, mail.instagram.com |
| LinkedIn | linkedin.com, e.linkedin.com |
| DHL | dhl.com, dhl.de |
| FedEx | fedex.com |
| UPS | ups.com |

**Shared-infrastructure domains are also excluded.** Beyond consumer mailboxes (below),
`amazonses.com` is deliberately *not* listed: it is AWS SES's shared sending infrastructure
that any AWS customer can send through, so a suffix match on it would "verify" an attacker as
Amazon. Same principle as consumer mailboxes — a domain only qualifies if the brand *alone*
can send from it. (This and a few unverifiable lookalikes — `google-mail.com`,
`linkedinmail.com`, `dpdhl.com` — were caught and removed in an adversarial review pass.)

**Deliberate deviation from the brief — consumer mailbox domains are excluded.** The task
example lists `live.com`/`outlook.com` under Microsoft and `icloud.com` under Apple. I
**intentionally left those out** and put them in a `CONSUMER_MAILBOX_DOMAINS` block that is
never verified. Reason: anyone can open an `@outlook.com` / `@icloud.com` / `@gmail.com`
address. Treating those as "verified Microsoft/Apple/Google" would let an attacker mail
phishing from a throwaway consumer account and have its urgency/link/CTA signals discounted —
a serious recall hole, made worse here because this app *syncs Gmail*, so a huge share of
inbound mail is from `gmail.com`. Only **brand-controlled** domains (which an attacker cannot
send from) grant verification. This is the single most important judgment call in the PR.

---

## TASK 2 — Cascading context modifiers

New `VERIFIED_BRAND_MODIFIERS` map + `applyVerifiedBrandModifier()` helper in
`scoring.config.js` (one place, documented in a comment block). These are **multipliers
applied at the moment a rule fires** — the base weights in `RULE_WEIGHTS` /
`AI_SIGNAL_WEIGHTS` are never mutated. They apply **iff `senderVerifiedBrand === true`**.

### Before/after (effective points on a verified-brand email)

| Signal | Base weight | Multiplier | Verified weight | Reasoning |
| --- | --- | --- | --- | --- |
| `brand_impersonation_suspected` | 10 | **×0.0** | **0** | It came from the real brand — not impersonation. |
| `login_or_action_request` (CTA) | 8 | **×0.3** | **2** | "Sign in / View order" is standard in transactional mail. |
| `too_many_links_high` | 18 | **×0.4** | **7** | Brand newsletters are link-heavy by design. |
| `too_many_links_medium` | 10 | **×0.4** | **4** | Same. |
| `urgency_high` | 8 | **×0.5** | **4** | Real companies send account/security alerts. |
| `urgency_medium` | 4 | **×0.5** | **2** | Same. |
| `social_engineering_high` | 12 | **×0.5** | **6** | Overlaps with the "account alert" framing above. |
| `social_engineering_medium` | 6 | **×0.5** | **3** | Same. |
| `reply_to_mismatch` | 18 | **×0.5** | **9** | Verified brands routinely split send/reply domains (ESP). |

**Left at full weight on purpose (NOT discounted):**
- `sensitive_data_request` (20) — a real brand never asks for your password/OTP/card by email;
  this stays a top signal even from a "verified" sender, covering compromised accounts and any
  spoofing the domain check can't catch.
- `shortened_url_detected`, `ip_address_link`, `embedded_credentials`, `punycode_domain`,
  `very_long_url`, `high_risk_attachment_extension`, `archive_attachment_extension` —
  payload/transport signals that are abnormal no matter who sends them.

**Not implemented (honest gap):** the brief lists "HTML-heavy / lots of images" and "generic
greeting" rows. This engine has **no** such rules, so there is no weight to modify. I did
**not** add them — adding a new penalty just to discount it would only create *new* false
positives for the unverified mail that is the larger problem. Noted as future work.

---

## TASK 3 — Ollama prompt update

The semantic prompt now has two variants (same strict-JSON contract, identical keys, so the
parser is unchanged). Sender domain is always present in the serialized input *and* referenced
in the instructions.

### Before (verified-brand case had no special handling)
```
You are a cybersecurity analyst specializing in phishing detection.
...
Phishing emails typically impersonate a known brand or authority, create urgency or fear,
request credentials... or pressure the reader to click a link or sign in quickly.
{ strict JSON keys }
```

### After (verified-brand variant)
```
You are a cybersecurity analyst specializing in phishing detection.
...
This email's sender domain ({senderDomain}) has been verified as an OFFICIAL domain of
{brandName} (official domains: {officialDomains}).
This is a legitimate sender, NOT an impersonation. Always set "brandImpersonationSuspected"
to false.

Because the sender is legitimate, focus your analysis on whether the email still contains
OTHER phishing indicators despite the trusted sender:
- links that point to domains OTHER than {brandName}'s official domains;
- requests for passwords, OTP codes, card numbers, or other sensitive data;
- pressure to sign in or act immediately;
- content inconsistent with the kind of email this brand normally sends.
{ identical strict JSON keys }
```

For **unverified** senders the prompt keeps its original shape but now explicitly instructs the
model to use the provided `senderDomain` to decide whether a claimed brand matches the real
sender (sharper impersonation analysis, not weaker). Even if the model ignores the instruction
and returns `brandImpersonationSuspected = true` for a verified sender, the score modifier
forces it to 0 — belt and suspenders.

---

## TASK 4 — Threshold decision

**Decision: keep `suspicious = 30`, `likely_phishing = 60`. No change.**

- They are already close to the task's suggested `35 / 65`, and they are locked by
  `tests/unit/schema-contract.test.js` and `scoring-config.test.js` as a stable contract.
- The false positives were caused by legit mail *earning real points it shouldn't*, not by an
  over-tight threshold. The fix removes those points in context (brand verification + modifier
  layer). Loosening the global threshold instead would blanket-reduce recall on genuine
  phishing — the opposite of what a precision-focused system wants.
- The three-tier verdict system and the §4 invariants of `SCORING_WEIGHTS_REVIEW.md` (no single
  signal reaches 60; AI capped below 60; rules reach 60 only via two strong corroborating
  rules) are all preserved. Thresholds remain in one config location (`RISK_THRESHOLDS`).

---

## Expected impact

**Eliminates / strongly reduces** false positives on:
- Legit transactional/marketing mail from the listed brands on their own domains (PayPal
  statements, Amazon shipping, Microsoft/Google account alerts, Apple receipts, LinkedIn/Meta
  notifications, courier tracking). Worked example: the PayPal statement from Q3 drops from
  `10 + 8 + 8 + 10 = 36` (suspicious) to `0 + 4 + 2 + 4 = 10` (safe).
- The "brand email always looks like impersonation" feedback loop (Q2) — gone for verified
  senders.

**Does NOT address** (out of scope or by design):
- Legit brands **not in the list**, or sending from a domain we haven't catalogued — they get
  no discount and may still be flagged. Mitigated by making the list trivial to extend.
- Phishing from **consumer mailbox** domains (gmail/outlook/icloud) — intentionally *not*
  discounted (see Task 1); this is a deliberate recall-preserving choice, not a miss.
- A **compromised** verified-brand account sending real phishing — partly covered because
  `sensitive_data_request`, attachment, IP-link and credential signals stay at full weight.

## What it does NOT fix (other false-positive sources noticed, out of scope)

1. **No deterministic display-name-vs-domain impersonation rule.** Impersonation of an
   *unverified* sender still rests entirely on the (sometimes flaky) local LLM. A cheap
   deterministic rule — "display name claims brand B but sender domain ∉ B's official domains"
   — would add precision on the attack side. Out of scope here because this PR targets
   false-positive *reduction*; adding a new positive-detection rule is a separate, recall-side
   change.
2. **No SPF/DKIM/DMARC.** True sender authentication would make verification far more robust
   (and would catch envelope spoofing the From-header check can't). Listed as future work in
   `PHISHING_RULES.md`.
3. **`reply_to_mismatch` is still a blunt rule for unverified ESP mail** — a legit small sender
   using Mailchimp still trips it at full weight. Only verified brands get the discount.
4. **Sequential sync scan + Ollama latency** (already tracked in `PROJECT_STATE.md`) is
   unrelated to scoring but affects the perceived quality of the pipeline.
5. **Subdomain takeover of a listed brand domain** — if a brand abandons a DNS record under a
   listed domain and an attacker claims it, mail from that subdomain would be verified. This is
   an accepted residual risk for an MVP (rare, and the full-weight payload signals still apply);
   real mitigation is SPF/DKIM/DMARC (item 2) plus narrowing entries to known sending hosts.
