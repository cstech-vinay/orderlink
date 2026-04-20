#!/bin/sh
# OrderLink nightly backup — runs inside the backup sidecar container.
# Pipeline: pg_dump (custom format) → gzip -9 → gpg --encrypt → rclone to R2.
# Emits a heartbeat ping to healthchecks.io on success.
# Env required: DATABASE_URL, BACKUP_GPG_RECIPIENT, R2_* creds, HC_PING_URL (optional).

set -eu

TS=$(date -u +"%Y%m%dT%H%M%SZ")
OUT="/tmp/orderlink-${TS}.dump.gz"

echo "[backup] starting ${TS}"

pg_dump --format=custom --compress=9 "$DATABASE_URL" | gzip -9 > "$OUT"
echo "[backup] pg_dump complete: $(stat -c%s "$OUT") bytes"

gpg --batch --yes --trust-model always \
    --encrypt --recipient "$BACKUP_GPG_RECIPIENT" "$OUT"
echo "[backup] GPG encrypt complete"

RCLONE_CONFIG_R2_TYPE=s3 \
RCLONE_CONFIG_R2_PROVIDER=Cloudflare \
RCLONE_CONFIG_R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
RCLONE_CONFIG_R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
RCLONE_CONFIG_R2_ENDPOINT="$R2_ENDPOINT" \
rclone copy "${OUT}.gpg" "r2:${R2_BUCKET}/backups/$(date -u +%Y/%m)/"
echo "[backup] R2 upload complete"

# Local retention: keep 7 newest encrypted archives
ls -1t /tmp/orderlink-*.dump.gz.gpg 2>/dev/null | tail -n +8 | xargs -r rm -f

# Heartbeat ping (healthchecks.io, Better Uptime, etc.)
if [ -n "${HC_PING_URL:-}" ]; then
  wget -qO- "$HC_PING_URL" >/dev/null || true
fi

# Remove the unencrypted temp dump (encrypted copy remains)
rm -f "$OUT"

echo "[backup] done ${TS}"
