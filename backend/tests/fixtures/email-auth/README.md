# Email authentication fixtures

These fixtures are synthetic and contain no SecureInbox user data.

- `dkim-good.eml` and `dkim-dns.json` come from Postal Systems' `mailauth`
  DKIM test fixtures. `dkim-tampered.eml` changes only the signed body, and
  `dkim-unsigned.eml` was created for SecureInbox.
- `arc-two-hop-pass.eml` and `arc-dns.json` are the `cv_pass_i2_1` case from
  ValiMail's ARC validation suite as vendored by `mailauth`. It is a complete
  two-hop cryptographic chain with reserved example domains.

Source revision: `c8eefbbb1ecc036b2478f0c8c45fe91dd2fd7e65`

https://github.com/postalsys/mailauth/tree/c8eefbbb1ecc036b2478f0c8c45fe91dd2fd7e65/test/fixtures

The upstream fixtures are MIT licensed. See `LICENSE.txt` in this directory.
