// Greutăți pentru dovezile SPF/DKIM/DMARC calculate la sincronizarea Gmail.

export const EMAIL_AUTH_RULE_WEIGHTS = Object.freeze({
    dmarc_fail_policy_reject: 40,
    dmarc_fail_policy_quarantine: 30,
    dmarc_fail_policy_none: 15,
    spf_hardfail: 20,
    dkim_invalid_signature: 20,
    no_authentication_at_all: 10,
    claimed_brand_authentication_failed: 25,
});
