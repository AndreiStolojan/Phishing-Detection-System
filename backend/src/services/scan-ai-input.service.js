// ─────────────────────────────────────────────────────────────────────────────
// scan-ai-input.service.js — pregătește "pachetul" de date trimis către AI.
//
// Ce face, pe scurt: ia un email deja parsat din baza de date și construiește un
// obiect mai mic și mai sigur, care va fi trimis modelului local Ollama pentru
// analiza semantică (vezi ollama-semantic.service.js). Aici se taie textul prea
// lung, se limitează numărul de linkuri și se adaugă contextul de brand (dacă
// expeditorul e un domeniu oficial verificat).
//
// De ce e nevoie de pasul ăsta: emailurile pot avea corpuri de text foarte lungi
// sau zeci de linkuri — trimiterea integrală ar încetini modelul AI (sau l-ar
// face să dea erori). Reducem inputul la "esențial", dar păstrăm informația
// relevantă pentru detectarea phishingului.
//
// Detalii: docs/EXPLICATIE_BACKEND.md §4.5 (pasul 4) și §4.7.
// ─────────────────────────────────────────────────────────────────────────────

// Scoate tagurile HTML (<...>) dintr-un text, înlocuindu-le cu spațiu — folosit
// ca rezervă (fallback) când emailul nu are versiune de text simplu.
const stripHtmlTags = (htmlValue) => htmlValue.replace(/<[^>]*>/g, ' ');

// Înlocuiește orice succesiune de spații/taburi/linii noi cu un singur spațiu și
// elimină spațiile de la margini — curăță textul înainte de a-l trimite la AI.
const normalizeWhitespace = (textValue) => textValue.replace(/\s+/g, ' ').trim();

// Limite de lungime/numar pentru bucățile trimise la AI (în caractere, respectiv
// număr de linkuri). Scopul: input mic, rapid de procesat, dar suficient de
// informativ pentru model.
const MAX_AI_SUBJECT_CHARS = 180;
const MAX_AI_HEADER_CHARS = 180;
const MAX_AI_BODY_CHARS = 1200;
const MAX_AI_LINKS = 6;
const MAX_AI_LINK_CHARS = 120;

// Taie un text la maximum `maxChars` caractere (fără "..." la final — e doar o
// trunchiere simplă).
const truncateText = (textValue, maxChars) =>
    textValue.length <= maxChars ? textValue : textValue.slice(0, maxChars);

// Construiește obiectul de input pentru AI dintr-un email și un context de brand
// (vine din verifySenderBrand, vezi scan.service.js). Acest obiect este trimis
// ca JSON modelului Ollama în ollama-semantic.service.js.
export const buildAiAnalysisInput = (email, brandContext = {}) => {
    // Preferăm corpul de text simplu; dacă nu există, scoatem tagurile din HTML;
    // dacă nici acela nu există, folosim "snippet"-ul (preview-ul scurt de la Gmail).
    const textBody = normalizeWhitespace(email.textBody || '');
    const htmlFallback = normalizeWhitespace(stripHtmlTags(email.htmlBody || ''));
    const rawAnalysisBody = textBody || htmlFallback || email.snippet || '';
    const analysisBody = truncateText(rawAnalysisBody, MAX_AI_BODY_CHARS);
    // Curățăm și normalizăm lista de linkuri găsite în email.
    const links = (email.links || [])
        .map((linkValue) => normalizeWhitespace(String(linkValue || '')))
        .filter(Boolean);
    // Păstrăm doar primele MAX_AI_LINKS linkuri, fiecare trunchiat la MAX_AI_LINK_CHARS.
    const limitedLinks = links
        .slice(0, MAX_AI_LINKS)
        .map((linkValue) => truncateText(linkValue, MAX_AI_LINK_CHARS));

    return {
        subject: truncateText(email.subject || '', MAX_AI_SUBJECT_CHARS),
        from: truncateText(email.from || '', MAX_AI_HEADER_CHARS),
        replyTo: truncateText(email.replyTo || '', MAX_AI_HEADER_CHARS),
        senderDomain: email.senderDomain || '',
        // Contextul de verificare a brandului e mereu prezent, ca promptul să poată
        // raționa despre domeniul real al expeditorului. brandName/officialDomains
        // se completează doar dacă expeditorul e un brand verificat.
        senderVerifiedBrand: Boolean(brandContext.senderVerifiedBrand),
        brandName: brandContext.brandName || null,
        officialDomains: brandContext.senderVerifiedBrand
            ? brandContext.officialDomains || []
            : [],
        body: analysisBody,
        links: limitedLinks,
        // Metadate suplimentare — nu sunt folosite direct în scor, dar ajută la
        // depanare/debug (ex: cât s-a trunchiat textul, câte linkuri au fost omise).
        metadata: {
            senderDomain: email.senderDomain || '',
            replyToDomain: email.replyToDomain || '',
            linkCount: email.linkCount || 0,
            linksIncludedCount: limitedLinks.length,
            linksTruncated: links.length > limitedLinks.length,
            bodyTruncated: rawAnalysisBody.length > analysisBody.length,
            bodyCharsIncluded: analysisBody.length,
        },
    };
};
