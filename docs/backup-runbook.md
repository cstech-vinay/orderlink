# OrderLink backup runbook

Nightly encrypted offsite backups of the Phase 2a Postgres. Authoritative data lives in two places:
- **Postgres** (orders, inventory, coupons, webhook events) → this runbook backs it up
- **Salesforce** (customer profiles, orders, invoice PDFs) → backed up by Salesforce's own
  platform + exports; out of scope for this sidecar

## Mechanics
- Runs inside the `orderlink-backup` container on `sfdcdevelopers-vps`
- Cron: daily at **02:30 IST / 21:00 UTC** (defined in `Dockerfile.backup`)
- Pipeline: `pg_dump --format=custom --compress=9` → `gzip -9` → `gpg --encrypt` → `rclone` upload to **Cloudflare R2**
- Local retention: 7 newest encrypted archives in `/tmp` (self-pruning)
- R2 retention: configured on the bucket side — daily for 30 days, weekly (Sun) for 3 months, monthly (1st) for 1 year
- Heartbeat: POST to `$HC_PING_URL` on success (healthchecks.io or Better Uptime)

## Pre-deploy checklist (user runs once before first backup)

1. **R2 bucket** — create `orderlink-backups` in Cloudflare dashboard. Generate a scoped write-only API token. Paste into `.env`:
   ```
   R2_BUCKET=orderlink-backups
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   ```
2. **GPG keypair** (on your workstation, not the VPS):
   ```bash
   gpg --full-generate-key       # RSA 4096, 2-year expiry, passphrase protected
   gpg --armor --export vinay@assumptionconsulting.com > ops/gpg-pub.key
   gpg --armor --export-secret-keys ... > backup-recovery.key   # store in 1Password
   ```
   Add the fingerprint to `.env`:
   ```
   BACKUP_GPG_RECIPIENT=<fingerprint or email>
   ```
   The container mounts `ops/gpg-pub.key` read-only at `/tmp/backup-pub.key`. Import into the container's GPG keyring:
   ```bash
   docker exec orderlink-backup gpg --import /tmp/backup-pub.key
   docker exec orderlink-backup gpg --lsign-key "$BACKUP_GPG_RECIPIENT"
   ```
3. **Uptime heartbeat** — sign up at [healthchecks.io](https://healthchecks.io), create a check "orderlink-backup-daily" with period 24h + grace 2h. Paste ping URL into `.env` as `HC_PING_URL`.

## Bring the container up

```bash
docker compose -f docker-compose.backup.yml up -d
# first backup fires at next 02:30 IST; to trigger now:
docker exec orderlink-backup /usr/local/bin/backup.sh
tail -f /var/log/backup.log                         # inside the container
```

## Restore procedure (TEST this before going live — see T43)

```bash
# 1. Download the encrypted dump from R2
rclone copy r2:orderlink-backups/backups/2026/04/orderlink-20260419T210000Z.dump.gz.gpg ./

# 2. Decrypt on a trusted workstation (requires the private key)
gpg --decrypt orderlink-20260419T210000Z.dump.gz.gpg > backup.dump.gz

# 3. Restore to a SCRATCH database — NEVER touch production
createdb orderlink_restore
gunzip -c backup.dump.gz | pg_restore -d orderlink_restore --clean --if-exists

# 4. Smoke-check
psql -d orderlink_restore -c "SELECT COUNT(*) FROM orders_ref;"
psql -d orderlink_restore -c "SELECT COUNT(*) FROM inventory;"
```

Restore drill is part of the pre-cutover T43 checklist. Do it at least once before taking real traffic.

## Why encrypted + offsite?
- **Encrypted:** the VPS has GSTIN, customer PII, order amounts. A stolen snapshot without GPG is useless. Without GPG the ciphertext reveals nothing.
- **Offsite:** if the VPS itself is compromised or wiped, local backups go with it. R2 is a separate blast radius.
- **Not Salesforce:** SF holds Person Accounts + Order records + invoice PDFs and has its own backup/DR. Postgres backup covers the operational state (pending reservations, webhook idempotency, coupon redemptions) that SF does not have.
