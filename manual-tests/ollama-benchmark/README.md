# Ollama Benchmark (Manual Test)

Acest benchmark compară mai multe modele Ollama folosind exact pipeline-ul semantic existent în proiect:

- `buildAiAnalysisInput` din `services/scan-ai-input.service.js`
- `analyzeEmailSemanticsWithOllama` din `services/ollama-semantic.service.js`

## Comandă rapidă

```bash
npm run benchmark:ollama -- --models qwen2.5:3b,gemma3:4b --fixtures manual-tests/ollama-benchmark/fixtures
```

## Ce raportează per model

- `Total` = număr total de cazuri din fixture-uri
- `Evaluated` = cazuri cu `status: evaluated`
- `Failed` = cazuri cu `status: failed`
- `ParserFallback` = cazuri unde parserul semantic a intrat în fallback (`parserFallback: true`)
- `AvgLatencyMs` = media latenței (`latencyMs`) pentru toate cazurile procesate

## Format fixture JSON (așteptat)

Scriptul acceptă:

- un fișier JSON cu array de cazuri;
- un obiect JSON cu `cases: []`;
- un singur obiect-caz.

Formatul recomandat pentru fiecare caz:

```json
{
  "id": "urgent-password-reset",
  "email": {
    "subject": "Reset your account now",
    "from": "Security Team <security@example-support.com>",
    "replyTo": "helpdesk@evil-reset.io",
    "textBody": "Your account will be closed today unless you confirm now.",
    "htmlBody": "<p>Your account will be closed today unless you confirm now.</p>",
    "snippet": "Confirm account now",
    "links": ["https://example-support.com/verify"],
    "senderDomain": "example-support.com",
    "replyToDomain": "evil-reset.io",
    "linkCount": 1
  }
}
```

Notă:

- câmpul `email` este opțional; dacă lipsește, scriptul tratează obiectul-caz direct ca email input;
- dacă `linkCount` lipsește, se folosește automat `links.length`.
