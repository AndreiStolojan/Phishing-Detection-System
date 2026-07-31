# Follow-ups

## Preserved detection behavior

- `link-analysis.service.js` still adds `shortened_url` to
  `Email.suspiciousLinkPatterns`, but the link provider has no matching
  `LINK_PATTERN_RULES` entry and therefore ignores it. Shortener evidence
  reaches scoring only through `email.hasShortenedUrl`, which emits
  `shortened_url_detected`. This dead path is deliberately preserved because
  mapping `suspiciousLinkPatterns.shortened_url` would change scores and break
  the pre-refactor detection snapshot. Any future correction needs an explicit
  scoring/fixture decision.

- `scan.service.js` retains the synchronous compatibility façades
  `calculateRulesForEmail` and `calculateAiScoreFromSignals` for existing
  consumers and tests. They delegate to the modular providers and scorer rather
  than participating in the live scan path. Remove them only after their
  consumers have migrated.

- Stored suspicious-link patterns intentionally keep their persisted rule id
  (`suspicious_link_pattern:<key>`) for context-modifier lookup, matching the
  v7 engine. As a result, `USER_ALLOWLIST_MODIFIERS.very_long_url` does not
  suppress a `suspicious_link_pattern:very_long_url` signal. This surprising
  path is locked by the golden snapshot and `detection-scorer.test.js`; changing
  it requires an explicit scoring decision and engine-version bump.
