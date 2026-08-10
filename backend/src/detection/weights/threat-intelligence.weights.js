export const THREAT_INTELLIGENCE_RULE_WEIGHTS = Object.freeze({
    url_known_malicious: 45,
    url_known_phishing_campaign: 45,
    domain_registered_days_ago_lt_7: 30,
    domain_registered_days_ago_lt_30: 18,
    link_text_href_mismatch: 20,
    redirect_chain_to_different_tld: 15,
    excessive_redirect_chain: 12,
    redirect_to_private_address: 40,
});
