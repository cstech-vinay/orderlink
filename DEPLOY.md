# OrderLink — deployment notes

## Architecture

- **Host:** `sfdcdevelopers-vps` (93.127.206.14)
- **Path on VPS:** `/root/orderlink`
- **Container:** `orderlink-web` (nginx:1.27-alpine, ~50 MB)
- **Reverse proxy:** shared Traefik instance at `/root/traefik` (ports 80/443)
- **TLS:** Let's Encrypt via Traefik TLS-ALPN-01 challenge (resolver `mytlschallenge`)
- **Network:** `traefik_public` (external, shared with all sites)

## Go-live checklist

### 1. DNS (ONLY remaining blocker)

The domain currently resolves to `2.57.91.91` (Namecheap DNS parking). Change to:

| Record | Type | Value | TTL |
|---|---|---|---|
| `orderlink.in` (apex, `@`) | A | `93.127.206.14` | 300 |
| `www.orderlink.in` | A | `93.127.206.14` | 300 |

Either:
- Switch nameservers off `orbit.dns-parking.com` to your registrar's default DNS (or Cloudflare), then add the A records, **or**
- Keep the current NS (if your registrar allows records there) and add A records.

### 2. After DNS propagates (~5–15 min)

```bash
# verify DNS
dig +short orderlink.in @1.1.1.1         # should print 93.127.206.14
dig +short www.orderlink.in @1.1.1.1     # should print 93.127.206.14

# verify TLS + 301 + 200
curl -Iv https://orderlink.in/            # 200, TLS valid
curl -Iv https://www.orderlink.in/        # 301 → https://orderlink.in/
curl -Iv https://orderlink.in/old-page    # 301 → https://orderlink.in/
```

Traefik auto-retries cert issuance on next request to the domain — no manual intervention needed once DNS resolves to the VPS.

## Operational commands (run on VPS)

```bash
cd /root/orderlink

# View logs
docker compose logs -f --tail 100

# Restart
docker compose restart

# Rebuild after changes
docker compose up -d --build

# Stop
docker compose down

# Tear down entirely
docker compose down --rmi local
```

## Updating content

1. Edit locally (`index.html`, `assets/optimized/*`, etc.)
2. Rsync:
   ```bash
   # from project root on local machine
   tar czf - \
     --exclude='assets/bg.jpg' \
     --exclude='assets/logo_horizontal.png' \
     --exclude='assets/logo_standalone.png' \
     index.html Dockerfile docker-compose.yml nginx.conf \
     robots.txt sitemap.xml .dockerignore assets/ \
     | ssh sfdcdevelopers-vps 'cd /root/orderlink && tar xzf -'
   ```
3. Rebuild:
   ```bash
   ssh sfdcdevelopers-vps 'cd /root/orderlink && docker compose up -d --build'
   ```

## File inventory

| File | Purpose |
|---|---|
| `index.html` | Single-page static HTML with inline CSS |
| `assets/optimized/*.webp` | Responsive WebP images (11 variants, ~564 KB total) |
| `assets/*.{jpg,png}` | Original source images (excluded from image via `.dockerignore`) |
| `Dockerfile` | nginx:1.27-alpine, serves `/usr/share/nginx/html` |
| `docker-compose.yml` | Traefik labels, TLS, headers, healthcheck |
| `nginx.conf` | Server block: `/` → 200, unknown path → 301 to `/` |
| `robots.txt` | Allow all crawlers, points to sitemap |
| `sitemap.xml` | Single entry: `/` |
| `.dockerignore` | Excludes originals + dev cruft from build context |

## Design notes (why things are the way they are)

- **Stack:** nginx:alpine + static HTML. No Node, no Tailwind build step, no framework. A coming-soon page doesn't earn a pipeline; replace the whole container when the real store lands.
- **Images:** Originals live in `assets/` for reference but are NOT shipped in the image. Only `assets/optimized/*.webp` is copied in. Shrinks image size from ~54 MB to ~43 MB.
- **Redirects:** The 301 for unknown paths is deliberate — the domain was purchased as an expired domain with existing backlinks. Funnelling every old URL to `/` preserves link equity while Google reconsolidates.
- **Fonts:** Loaded from Google Fonts via `preconnect` + `display=swap`. To self-host later, download the Fraunces + Instrument Sans + JetBrains Mono woff2 subsets, drop into `assets/fonts/`, and replace the `<link>` with local `@font-face` declarations.
- **Security headers:** Set by both nginx AND Traefik middleware (defense in depth). When the real store ships with dynamic content, tighten further (CSP, etc).
