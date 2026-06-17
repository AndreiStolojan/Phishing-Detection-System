// ─────────────────────────────────────────────────────────────────────────────
// senderListsApi.js — apeluri pentru listele de expeditori (allowlist/blocklist).
//
// Ce face, pe scurt: citește, adaugă și șterge intrări din listele personale
// ale userului — adrese/domenii marcate explicit ca "de încredere" sau
// "blocate", folosite de motorul de scanare ca semnal suplimentar.
// ─────────────────────────────────────────────────────────────────────────────

import { apiClient } from './apiClient.js';

// Returnează listele de expeditori. Dacă `withMatchCounts` e true, backend-ul
// include și câte emailuri se potrivesc cu fiecare intrare.
export const getSenderLists = ({ withMatchCounts = false } = {}) =>
  apiClient.get(`/sender-lists${withMatchCounts ? '?withMatchCounts=1' : ''}`);

// Adaugă o intrare nouă într-o listă. `listType` = allowlist/blocklist,
// `kind` = tipul valorii (ex. email/domeniu), `value` = valoarea concretă.
export const addSenderListEntry = ({ listType, kind, value }) =>
  apiClient.post('/sender-lists', { listType, kind, value });

// Șterge intrarea cu id-ul `id` dintr-o listă.
export const removeSenderListEntry = (id) => apiClient.del(`/sender-lists/${id}`);
