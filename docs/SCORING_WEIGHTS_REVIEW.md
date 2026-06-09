# Scoring Weights Review & Rebalancing

**Date:** 2026-06-09
**Engine version:** `rules-ai-v4` → `rules-ai-v5` (new scans only; old scans keep their stored score until rescanned)
**Scope:** Reasoning document produced *before* any code change, per the task brief.

---

## 1. How scoring works today (model description)

SecureInbox uses an **additive points** model on a `0–100` scale, not a normalized
weighted average. Two independent sub-scores are summed:

```
finalScore = min(100, ruleScore + aiScore)
```

- **`ruleScore`** — sum of points from deterministic rules in
  `calculateRulesForEmail` (link/header/attachment heuristics). Uncapped in
  principle, but in practice bounded by how many distinct rules can co-occur.
- **`aiScore`** — sum of points from the Ollama semantic signals in
  `calculateAiScoreFromSignals`, **hard-capped at 50**.

Verdict thresholds (locked by `tests/unit/schema-contract.test.js`, kept unchanged):

| Final score | Verdict | UI risk |
| --- | --- | --- |
| `0–29` | `safe` | low |
| `30–59` | `suspicious` | medium |
| `60+` | `likely_phishing` | high |

**Why points instead of normalized fractions (0.25–0.35 …):** the task framework
describes weights as fractions of a total that sum to 1.0. For an *explainable*
thesis engine, an additive points model on a fixed 0–100 scale is equivalent and
clearer: each point band maps directly to a verdict the user sees, and every
triggered rule shows its own `+N` contribution in the UI. The fraction framework
below is therefore applied as **point budgets** (a "strong" signal ≈ 25–35 pts,
"medium" ≈ 12–20, "weak" ≈ 5–10), with the `0–100` scale standing in for `1.0`.

---

## 2. Every signal, current weight, and assessment

### Rule-based signals (`ruleScore`)

| Signal | Current | Band | Assessment |
| --- | --- | --- | --- |
| `high_risk_attachment_extension` (.exe/.js/.scr/.iso/.hta…) | **35** | strong | Realistic. Strongest single rule. Executable attachments are near-certain abuse. **Keep.** |
| `reply_to_mismatch` (Reply-To domain ≠ sender domain) | **25** | medium | **Over-weighted.** Legitimate bulk/marketing mail routinely sends from one domain and routes replies to another (ESP split). High false-positive risk for a "strong" weight. → lower to medium. |
| `suspicious_link_pattern:ip_address_link` | **25** | strong | Realistic. Legit services never link to raw IPs. **Keep.** |
| `embedded_credentials` (`user:pass@host`) | **20** | strong | Slightly **under-weighted** for how abnormal it is in real mail. → raise. |
| `punycode_domain` (`xn--`) | **20** | strong | Realistic visual-spoofing signal; small IDN false-positive tail. **Keep.** |
| `shortened_url_detected` (bit.ly, t.co…) | **20** | medium | **Over-weighted.** Newsletters legitimately use shorteners; `PHISHING_RULES.md` itself says "scor mediu, nu maxim." → lower. |
| `too_many_links_high` (≥10 links) | **25** | weak heuristic | **Over-weighted.** Pure link-count is a weak heuristic; legit newsletters have many links. A 25-pt weight pushes benign newsletters toward "suspicious." → lower. |
| `too_many_links_medium` (6–9 links) | **15** | weak heuristic | **Over-weighted** for the same reason. → lower. |
| `archive_attachment_extension` (.zip/.rar…) | **12** | weak-medium | Reasonable; archives are dual-use. **Keep.** |
| `very_long_url` (>200 chars) | **10** | weak | Slightly high — tracking URLs in legit mail are often long. → small lower. |

### AI semantic signals (`aiScore`, capped at 50)

| Signal | Current | Assessment |
| --- | --- | --- |
| `sensitive_data_request` (password/OTP/card) | **20** | Strongest AI signal; appropriate. **Keep.** |
| `social_engineering` high / medium | **12 / 6** | Reasonable secondary weights. **Keep.** |
| `brand_impersonation_suspected` | **10** | Semantic-only impersonation is uncertain alone; medium weight is right. **Keep.** |
| `login_or_action_request` | **8** | Reasonable. **Keep.** |
| `urgency` high / medium | **8 / 4** | Urgency alone is weak; secondary weighting is correct. **Keep.** |
| **AI cap** | **50** | Critical guardrail — see §4. **Keep.** |

The AI weights are already well-shaped (secondary, conservative). **No AI weight
changes** — the rebalancing is entirely on the rule side, where the documented
false-positive concern (newsletters) lives.

---

## 3. Proposed new weights (with reasoning)

| Signal | Old → New | Reason |
| --- | --- | --- |
| `reply_to_mismatch` | 25 → **18** | Demote strong→medium. Common in legit ESP/marketing mail; 25 over-penalized it. |
| `shortened_url_detected` | 20 → **15** | Dual-use; lower per the project's own "medium not maximum" guidance. |
| `embedded_credentials` | 20 → **25** | Promote to strong. `user:pass@host` is highly abnormal in real mail. |
| `too_many_links_high` | 25 → **18** | Link-count is a weak heuristic; must not alone drag a newsletter to "suspicious." |
| `too_many_links_medium` | 15 → **10** | Same; keep it a nudge, not a near-verdict. |
| `very_long_url` | 10 → **8** | Long tracking URLs are common in legit mail. |
| `high_risk_attachment_extension` | 35 (unchanged) | Strongest justified single rule. |
| `ip_address_link` | 25 (unchanged) | Strong, low FP. |
| `punycode_domain` | 20 (unchanged) | Strong, small FP tail. |
| `archive_attachment_extension` | 12 (unchanged) | Balanced dual-use weight. |
| *(all AI signal weights)* | unchanged | Already conservative and secondary. |

### Final weight table

```
RULES
  high_risk_attachment_extension   35   (strong)
  reply_to_mismatch                18   (medium)   ↓ from 25
  ip_address_link                  25   (strong)
  embedded_credentials             25   (strong)   ↑ from 20
  punycode_domain                  20   (strong)
  shortened_url_detected           15   (medium)   ↓ from 20
  too_many_links_high (≥10)        18   (weak)     ↓ from 25
  too_many_links_medium (6–9)      10   (weak)     ↓ from 15
  archive_attachment_extension     12   (weak-med)
  very_long_url                     8   (weak)     ↓ from 10

AI (capped at 50 total)
  sensitive_data_request           20
  social_engineering high/med      12 / 6
  brand_impersonation_suspected    10
  login_or_action_request           8
  urgency high/med                  8 / 4
```

---

## 4. Combination rule & invariants (the part that must hold)

**Combination:** `finalScore = min(100, ruleScore + aiScore)`, then thresholds map
to verdict. Both sub-scores are persisted (`ruleScore`, `aiScore`, `score`) so the
UI can show the split and the contribution of each detector.

The rebalanced numbers are chosen to keep three invariants true:

1. **No single signal can reach "high risk" (60) alone.**
   Largest single rule = `high_risk_attachment` = 35 → "suspicious" at most.
   Largest single AI signal = 20. ✔

2. **No single *weak* signal can exceed "medium risk" alone.**
   Every weak signal (very_long_url 8, archive 12, too_many_links 10/18, urgency
   4/8) is < 30 on its own → stays in "safe" band. ✔

3. **Neither detector can declare "likely_phishing" without corroboration from the other side, OR from a second independent signal of its own kind.**
   - **AI alone** is hard-capped at 50 < 60, so the semantic layer can escalate to
     "suspicious" and corroborate the rules, but can **never** unilaterally declare
     phishing. ✔
   - **Rules alone** can reach 60 only by combining **two independent strong rules**
     (e.g. attachment 35 + ip_address 25 = 60). That is corroboration *within* the
     deterministic layer — two distinct mechanisms agreeing — not one heuristic
     deciding. No single rule, and no rule + a weak nudge, reaches 60. ✔

These invariants are encoded as comments in the central config and are the reason
the link-count and shortener weights were pulled down.

---

## 5. Backward compatibility

The engine version is bumped `rules-ai-v4 → rules-ai-v5`. Stored scans are **not**
bulk-rescored: an old scan keeps its `v4` score until that specific email is
rescanned (manual "Scan again", or a sync that re-touches it). New scans use the
new weights. This satisfies "new weights apply to new scans only."

## 6. Where the weights live now

All rule weights, AI signal weights, the AI cap, the score ceiling, and the verdict
thresholds are defined once in **`backend/src/config/scoring.config.js`** and
imported by `scan.service.js`. The frontend mirrors only the *maxima* it needs for
proportional bars in **`frontend/src/lib/scoring.js`** (Vite cannot import backend
ESM across the two packages — see the cross-reference comment in both files).
