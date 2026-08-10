// senderAuth.js — traduce `email.authResults` (SPF / DKIM / DMARC, calculate la
// sincronizare) în trei stări pe care interfața le poate desena onest.
//
// De ce e nevoie de fișierul ăsta: backendul produce un obiect bogat, dar
// întrebarea userului e simplă — "chiar a venit de la cine zice?". Iar între
// "a picat verificarea" și "n-am putut verifica" e o diferență pe care interfața
// NU are voie s-o ascundă: un mecanism necunoscut desenat ca eșec inventează o
// acuzație, iar unul desenat ca reușită inventează o garanție. De aceea
// starea are TREI valori, nu două.
//
// Nimic din fișierul ăsta nu recalculează risc; scorul rămâne al backendului.

// `status: 'ok'` cere ca TOATE componentele să fi reușit (antetul Gmail de
// încredere, semnăturile, politica DMARC). Când e 'unavailable', unele mecanisme
// pot avea totuși un rezultat concluziv — pe acelea le arătăm, restul rămân
// necunoscute, în loc să pierdem tot setul de dovezi.
const CONCLUSIVE_RESULTS = new Set(['pass', 'fail']);

const normalizeResult = (value) => String(value ?? '').trim().toLowerCase();

// Un mecanism e 'unknown' când n-a rulat, a dat eroare tranzitorie, sau
// domeniul nu publică nimic. 'none' NU e eșec: înseamnă "nu există politică".
const toState = (rawResult) => {
    const result = normalizeResult(rawResult);

    if (result === 'pass') return 'pass';
    if (result === 'fail') return 'fail';

    return 'unknown';
};

// Explicația arătată sub fiecare mecanism. Scrisă pentru cineva care nu știe ce
// e SPF, deci descrie ce s-a verificat, nu numele protocolului.
const MECHANISM_COPY = {
    spf: {
        label: 'Sending server',
        pass: 'The server that sent this message is authorised by the sender’s domain.',
        fail: 'The server that sent this message is not authorised by the sender’s domain.',
        unknown: 'We could not check which server sent this message.',
        none: 'The sender’s domain does not say which servers may send for it.',
    },
    dkim: {
        label: 'Message signature',
        pass: 'The message carries a valid signature from the sender’s domain.',
        fail: 'The message carries a signature that does not verify.',
        unknown: 'We could not check the message signature.',
        none: 'The message was not signed.',
    },
    dmarc: {
        label: 'Domain policy',
        pass: 'The sender’s domain confirms this message really came from them.',
        fail: 'The sender’s domain says this message failed its own checks.',
        unknown: 'We could not check the sender’s domain policy.',
        none: 'The sender’s domain publishes no policy for us to check against.',
    },
};

const describe = (mechanism, state, rawResult) => {
    const copy = MECHANISM_COPY[mechanism];

    // 'none' e un caz distinct de 'unknown': ȘTIM că nu există politică, spre
    // deosebire de "n-am putut afla". Ambele se desenează la fel (necunoscut),
    // dar textul trebuie să spună adevărul.
    if (state === 'unknown' && normalizeResult(rawResult) === 'none') {
        return copy.none;
    }

    return copy[state];
};

/*
 * Întoarce forma pe care o consumă interfața:
 *   {
 *     available: boolean,        // avem vreo dovadă de arătat?
 *     verified: boolean,         // DMARC a trecut — singura garanție reală
 *     summary: string,           // o propoziție pentru capul de secțiune
 *     tone: 'pass'|'fail'|'unknown',
 *     mechanisms: [{ id, label, state, description }]
 *   }
 *
 * DMARC decide tonul general pentru că e singurul mecanism care leagă
 * autentificarea de domeniul din "From" — adică de numele pe care îl vede
 * userul. SPF și DKIM pot trece pentru un domeniu complet diferit.
 */
export const getSenderAuthentication = (authResults) => {
    if (!authResults || typeof authResults !== 'object') {
        return {
            available: false,
            verified: false,
            tone: 'unknown',
            summary: 'This message was synced before sender checks were available.',
            mechanisms: [],
        };
    }

    const mechanisms = ['spf', 'dkim', 'dmarc'].map((id) => {
        const rawResult = authResults[id]?.result;
        const state = toState(rawResult);

        return {
            id,
            label: MECHANISM_COPY[id].label,
            state,
            description: describe(id, state, rawResult),
        };
    });

    const dmarc = mechanisms.find((mechanism) => mechanism.id === 'dmarc');
    const anyConclusive = mechanisms.some((mechanism) =>
        CONCLUSIVE_RESULTS.has(mechanism.state)
    );

    const summary =
        dmarc.state === 'pass'
            ? 'This message really came from the domain it claims.'
            : dmarc.state === 'fail'
                ? 'This message failed the sender domain’s own checks.'
                : anyConclusive
                    ? 'We could only partly verify this sender.'
                    : 'We could not verify this sender.';

    return {
        available: true,
        verified: dmarc.state === 'pass',
        tone: dmarc.state,
        summary,
        mechanisms,
    };
};
