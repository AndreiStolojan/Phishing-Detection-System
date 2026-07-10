# Explainable Detection Engine

SecureInbox scores each synced email from 0 to 100. Deterministic rules are the
primary source of the verdict. Each triggered rule records an identifier,
points, and a human-readable reason.

| Score | Verdict |
| --- | --- |
| 0-29 | Safe |
| 30-59 | Suspicious |
| 60-100 | Likely phishing |

The final score separates `ruleScore` from `aiScore`. Rule signals cover
patterns such as reply-to mismatches, shortened or obfuscated URLs, suspicious
attachments, and unusual link volume. User-maintained trusted and blocked
sender lists add controlled context; a blocked sender reaches the phishing
threshold by design.

Ollama can optionally extract local semantic signals such as urgency, sensitive
data requests, login prompts, social engineering, and possible brand
impersonation. Its contribution is capped at 50, below the 60-point phishing
threshold. AI therefore cannot produce a phishing verdict on its own.

This is explainability by construction: the UI shows the verdict, score split,
and triggered evidence. It does not claim SHAP, LIME, a trained classifier, or
precision/recall metrics.
