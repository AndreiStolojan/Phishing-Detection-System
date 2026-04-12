# SOURCES

## Scop

Acest fișier strânge sursele discutate până acum în conversațiile de lucru pentru proiectul de licență.

Rolul lui este practic:

- să existe un loc unic unde păstrăm linkurile utile;
- să nu mai căutăm din nou prin chat;
- să putem refolosi mai târziu aceste surse în lucrare, documentație sau capitolul de stare a artei.

Notă:

- lista de mai jos este un registru de lucru, nu încă bibliografia finală în format academic;
- la redactarea licenței, sursele vor trebui trecute într-un stil unitar de citare.

## 1. Surse despre modele OpenAI și folosirea Codex

Acestea au fost folosite când am discutat ce model este mai potrivit pentru planificare versus implementare.

- OpenAI, "Introducing upgrades to Codex"  
  https://openai.com/index/introducing-upgrades-to-codex/
- OpenAI Developers, "GPT-5.1 chat latest"  
  https://developers.openai.com/api/docs/models/gpt-5.1-chat-latest

## 2. Surse despre phishing și semnale uzuale folosite în practică

Acestea au fost folosite când am discutat ce feature-uri merită detectate euristic.

- Google Support, informații generale despre phishing și semnale de risc  
  https://support.google.com/legal/answer/8253?hl=en
- Google Workspace Admin Help, advanced phishing and malware protection  
  https://support.google.com/a/answer/9157861?hl=en
- Microsoft Learn, anti-phishing policies in Microsoft 365  
  https://learn.microsoft.com/en-us/microsoft-365/security/office-365-security/anti-phishing-policies-about/
- Microsoft Learn, spoofing protection and related anti-phishing guidance  
  https://learn.microsoft.com/en-us/defender-office-365/anti-phishing-protection-spoofing-about
- Microsoft Learn, impersonation insight in Defender for Office 365  
  https://learn.microsoft.com/en-us/defender-office-365/anti-phishing-mdo-impersonation-insight
- Sublime Security, set de reguli open-source pentru detecție email threats  
  https://github.com/sublime-security/sublime-rules

## 3. Surse despre Gmail API și parsarea emailurilor

Acestea au fost folosite când am discutat sync-ul, `format=full`, atașamentele și parsarea conținutului.

- Google Workspace Gmail API, `users.messages.get`  
  https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get
- Google Workspace Gmail API, `users.messages.attachments`  
  https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages.attachments

## 4. Surse pentru verificări externe de linkuri și reputație

Acestea au fost discutate ca opțiuni pentru faze ulterioare, nu ca bază principală a MVP-ului.

### 4.1 VirusTotal

- VirusTotal API overview  
  https://docs.virustotal.com/docs/api-overview
- VirusTotal, scan URL  
  https://docs.virustotal.com/reference/scan-url
- VirusTotal, URL object / report  
  https://docs.virustotal.com/reference/url-object

### 4.2 Google Safe Browsing

- Google Safe Browsing overview  
  https://developers.google.com/safe-browsing
- Google Safe Browsing REST reference  
  https://developers.google.com/safe-browsing/reference/rest

### 4.3 urlscan.io

- urlscan.io API docs  
  https://urlscan.io/docs/api/
- urlscan.io search API  
  https://docs.urlscan.io/apis/urlscan-openapi/search/search

### 4.4 Bitly

- Bitly API reference  
  https://dev.bitly.com/api-reference/

## 5. Surse academice și research apropiat de tema proiectului

Acestea au fost folosite când am discutat dacă merită un sistem hibrid: reguli + analiză semantică / AI.

- MDPI Computers, articol despre detecție phishing și persuasiune / social engineering  
  https://www.mdpi.com/2073-431X/14/12/523
- MDPI Electronics, articol despre folosirea LLM-urilor pentru phishing detection  
  https://www.mdpi.com/2079-9292/15/2/368
- MDPI Applied Sciences, articol despre feature extraction și clasificare în phishing detection  
  https://www.mdpi.com/2076-3417/13/15/8756

## 6. Surse pentru Ollama și folosirea AI local

Acestea au fost folosite când am discutat cum să introducem un strat semantic local și explainability.

- Ollama API introduction  
  https://docs.ollama.com/api/introduction
- Ollama quickstart  
  https://docs.ollama.com/quickstart
- Ollama documentation, structured outputs  
  https://docs.ollama.com/capabilities/structured-outputs
- Ollama API, chat endpoint  
  https://docs.ollama.com/api/chat
- Ollama model library, `gemma3`  
  https://ollama.com/library/gemma3
- Ollama model library, `qwen2.5`  
  https://ollama.com/library/qwen2.5
- Ollama model library, `mistral-small`  
  https://ollama.com/library/mistral-small

## 7. Cum folosim practic aceste surse în licență

Împărțirea recomandată este:

- sursele din secțiunea 2 pentru capitolul despre phishing și semnale practice;
- sursele din secțiunea 3 pentru capitolul de implementare Gmail și preluare emailuri;
- sursele din secțiunea 4 pentru opțiuni de extindere și comparație cu verificări externe;
- sursele din secțiunea 5 pentru motivația academică a abordării hibride;
- sursele din secțiunea 6 pentru partea de explainability AI local;
- sursele din secțiunea 1 doar dacă vrei să justifici alegerea instrumentelor de dezvoltare, nu neapărat în corpul principal al licenței.

## 8. Surse care merită adăugate mai târziu

Mai târziu ar merita să adăugăm și:

- surse despre SPF, DKIM și DMARC;
- surse despre WHOIS / domain age;
- surse despre prompt injection în email content;
- surse despre explainable AI în cybersecurity;
- eventual 1-2 articole comparative între rule-based și LLM-assisted phishing detection.
