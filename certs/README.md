# JWT Keypair for OrderLink ↔ Salesforce

Used by the Connected App `OrderLink_Storefront_Integration` for JWT Bearer OAuth flow (§6 of `docs/salesforce-integration-spec.md`).

- `sf-jwt.key` — **private key** (RSA 2048). Stays on this machine / the storefront VPS. Gitignored. Hand off to storefront team out-of-band.
- `sf-jwt.crt` — **public certificate** (self-signed, 10 years). Embedded into the Connected App metadata at `force-app/main/default/connectedApps/OrderLink_Storefront_Integration.connectedApp-meta.xml`.

## Regenerate (rotation)

```bash
cd /tmp
MSYS_NO_PATHCONV=1 openssl genrsa -out sf-jwt.key 2048
MSYS_NO_PATHCONV=1 openssl req -new -key sf-jwt.key -out sf-jwt.csr \
  -subj "/C=IN/ST=Maharashtra/L=Pune/O=CodeSierra Tech/CN=orderlink-sf-jwt"
MSYS_NO_PATHCONV=1 openssl x509 -req -in sf-jwt.csr -signkey sf-jwt.key -out sf-jwt.crt -days 3650
cp sf-jwt.key sf-jwt.crt "<repo>/certs/"
```

After rotation, re-embed the new `.crt` in the Connected App metadata and redeploy.
