# OrderLink Phase 2a — Deployment checklist

> **Every step below requires the user's explicit go-ahead.** The Phase 1 coming-soon
> page remains at `orderlink.in` until the user says "deploy." Nothing in this
> document is intended to be run by the assistant autonomously.

## Architectural reminders (so the sequence makes sense)

- **Invoice flow:** Node generates the PDF via React-PDF (T23) → uploads to Salesforce
  Files as a `ContentVersion` linked to the Order record (T28). SF is the authoritative
  invoice store. `/orders/[id]/invoice.pdf` fetches from SF with LRU caching (T25).
- **Email flow:** Salesforce Flow sends all customer + admin emails when
  `Order.Status = Confirmed` + invoice `ContentDocument` attached. The Node backend
  sends zero transactional email. No Resend, no SendGrid.
- **OTP flow:** MSG91 + HMAC-signed `orderlink-otp` cookie gates `/api/orders` (T14.5).
  Dev bypass (`"123456"` code) is disabled when `MSG91_AUTH_KEY` is set and
  `NODE_ENV=production`.
- **Database:** Postgres 16. Drizzle migrations `0000_init`, `0001_invoice_sequence`,
  `0002_order_number_sequence` must be applied before first traffic.
- **Deploy target:** sfdcdevelopers-vps, behind Traefik, shared network with existing
  projects. Same pattern as Phase 1.

---

## Pre-deploy prerequisites — user-action items

External accounts and keys — many of these have 2-7 day lead times, start early.

### Salesforce (long lead time — ~1 week end-to-end)
- [ ] Salesforce org provisioned (Developer Edition or sandbox of production)
- [ ] **Connected App** created with OAuth + JWT Bearer flow
- [ ] **Digital signature cert** generated (`openssl req -new -x509 -nodes ...`), public cert uploaded to the Connected App, private key saved to `./sf-jwt.pem` (permissions `400`, **never committed**)
- [ ] **Record Types** created on Person Account and Order:
  - `OrderLink_Customer` (Person Account)
  - `OrderLink_Order`
  - `OrderLink_Product`
- [ ] **Integration user** license allocated; profile restricted to OrderLink Record Types + ContentVersion read/write
- [ ] **Organization-Wide Email Address** `hello@orderlink.in` verified (SPF + DKIM DNS added to `orderlink.in`)
- [ ] **Salesforce Flows** created:
  - "Order → Confirmed + Invoice attached" → email customer with PDF
  - "Order → Shipped" → email customer with tracking link
  - "Order → Delivered" → thank-you email
  - "New Order" → email admin (`hello@orderlink.in`)
- [ ] JWT flow validated from a throwaway script before first real-order sync

### Razorpay
- [ ] Razorpay account KYC'd (PAN, GST, bank proof — can take 2-3 days)
- [ ] **Test keys** obtained (`rzp_test_...`) for staging + E2E tests
- [ ] **Live keys** obtained (`rzp_live_...`) for production, stored separately
- [ ] **Webhook endpoint** configured to post to `https://orderlink.in/api/razorpay/webhook` — enabled events:
  - `payment.captured`
  - `payment.failed`
  - `refund.processed`
- [ ] Webhook signing secret pasted into production `.env` as `RAZORPAY_WEBHOOK_SECRET`

### MSG91 (SMS OTP)
- [ ] MSG91 account + wallet funded (~₹1000 covers ~5000 OTPs)
- [ ] DLT entity registered on one of Airtel / Jio / Vi operator portals (3-7 days)
- [ ] MSG91 bound as telemarketer (`1302157225275643280`)
- [ ] 6-alphabet header registered on DLT (e.g. `ORDLNK`) → active status
- [ ] OTP content template approved on DLT → DLT Template ID obtained
- [ ] MSG91 panel: template added, linked to DLT Template ID, MSG91 Template ID copied
- [ ] Production `.env` has `MSG91_AUTH_KEY` + `MSG91_OTP_TEMPLATE_ID` + `MSG91_SENDER_ID`
- [ ] `OTP_COOKIE_SECRET` regenerated for production: `openssl rand -base64 32`

### Cloudflare R2 (backup target)
- [ ] Bucket `orderlink-backups` created
- [ ] Write-only API token issued
- [ ] R2 lifecycle policy set: daily 30d / weekly 3m / monthly 1y
- [ ] `.env` populated with `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`, `R2_BUCKET`

### GPG (for backup encryption)
- [ ] 4096-bit RSA keypair generated on a trusted workstation
- [ ] Public key exported to `ops/gpg-pub.key` (committed), private key stored in password manager
- [ ] Fingerprint placed into `.env` as `BACKUP_GPG_RECIPIENT`

### Sentry
- [ ] Sentry project created (Next.js platform)
- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in `.env`
- [ ] `SENTRY_AUTH_TOKEN` issued for sourcemap uploads (optional; post-launch)

### Monitoring
- [ ] Healthchecks.io account → "orderlink-backup-daily" check created → `HC_PING_URL` in `.env`
- [ ] UptimeRobot (or BetterUptime) monitor on `https://orderlink.in/api/healthz` (5-min interval, email + SMS alert)

### Content / Legal
- [ ] Full pincode whitelist (~28k pincodes) replaces the seed file at `public/pincodes.json`
- [ ] Oil Dispenser final product photos (3-5) placed under `public/assets/products/oil-dispenser/`
- [ ] Any catalog price / rename approvals merged into `src/data/products.ts`
- [ ] GST REG-14 amendment (if any retail HSN additions) submitted

---

## Deploy sequence

### Stage 1: Staging (recommended before prod)

- [ ] DNS: add A record `staging.orderlink.in` → `93.127.206.14`
- [ ] Build image on VPS: `docker build -f Dockerfile.store -t orderlink-store:staging .`
- [ ] On VPS: create `/root/orderlink-store`, clone the repo, check out `phase-2a-store`
- [ ] Create `/root/orderlink-store/.env` with **test** Razorpay + **sandbox** SF keys
- [ ] Add Traefik labels pointing `staging.orderlink.in` at the staging container
- [ ] `docker compose -f docker-compose.store.yml up -d`
- [ ] `curl -IL https://staging.orderlink.in/` → 200
- [ ] `curl https://staging.orderlink.in/api/healthz` → `{ok:true,db:"ok"}`
- [ ] Place a **full end-to-end test order** with Razorpay test card `4111 1111 1111 1111`:
  - Prepaid happy path → `/orders/:id/thanks`
  - POD happy path → `/orders/:id/thanks` with balance-due showing
  - Invalid pincode → Buy button stays disabled
- [ ] Confirm SF Flow fired and customer received the test invoice email
- [ ] Run the **backup restore drill** from R2 (see `docs/backup-runbook.md`)

### Stage 2: Production (irreversible — explicit user green-light required)

- [ ] All staging checks passed AND all Phase 1 rollback artifacts preserved
- [ ] Swap `.env` for **live** Razorpay keys, **production** SF integration user, production R2 bucket
- [ ] Rebuild image: `docker build -f Dockerfile.store -t orderlink-store:v2a-1 .`
- [ ] On VPS:
  ```bash
  cd /root/orderlink
  docker compose down                                 # Phase 1 coming-soon
  docker tag orderlink-web:latest orderlink-web:pre-2a  # save rollback image
  ```
- [ ] Bring up Phase 2a:
  ```bash
  cd /root/orderlink-store
  docker compose -f docker-compose.store.yml up -d
  docker compose -f docker-compose.backup.yml up -d
  ```
- [ ] Verify:
  - `curl -IL https://orderlink.in/` → 200 with our headers
  - `curl https://orderlink.in/api/healthz` → `{ok:true,db:"ok"}`
  - Visit `/p/oil-dispenser` in a browser, confirm activity popup + WhatsApp button + OTP gate
- [ ] Place a **₹1 smoke order** with a real Razorpay Production test card; confirm SF sync + invoice email land
- [ ] Monitor for the first 24 hours:
  - Sentry for errors
  - UptimeRobot for downtime pings
  - Admin inbox for alerts
  - Razorpay dashboard for successful/failed rates

### Stage 3: Rollback (if critical bug in first 24 hours)

- [ ] On VPS:
  ```bash
  cd /root/orderlink-store
  docker compose down
  cd /root/orderlink
  docker run -d --name orderlink-web --image orderlink-web:pre-2a ... (labels as in the pre-2a docker-compose.yml)
  ```
- [ ] DNS change not needed — Traefik labels route automatically
- [ ] Triage with Sentry, write a postmortem, fix on `phase-2a-store-hotfix` branch, redeploy

---

## What does NOT happen automatically

- **No CI/CD auto-deploy** on push to `main`. All deploys are manual.
- **No auto-rollback** on Sentry spike. Human decides.
- **No auto-scaling**. Single container; revisit when sustained RPS matters.
- **No chargeback automation.** Refunds are manual via Razorpay dashboard + SF status change.
- **No automated PII retention cleanup.** DPDP 24-month TTL runs as a monthly cron, not live.

---

## Post-launch (first month)

- [ ] Daily backup emails verified for 7 consecutive days
- [ ] First-week traffic matches expectation vs Meta Ads spend
- [ ] Customer WhatsApp volume tracked, adjust SLA if > 50 msgs/day
- [ ] Review Sentry top-10 errors, fix or suppress
- [ ] DPDP grievance email route confirmed working (`hello@orderlink.in` → SF case)
- [ ] Lighthouse mobile score audited on `orderlink.in` and top 3 product pages — target: Perf ≥ 85, A11y ≥ 90, SEO ≥ 95

---

## Phase 2b sketch (not in scope for this doc)

- Multi-SKU cart (currently single-product checkout)
- Order status webhook from Meesho → auto-update SF Order → trigger "Shipped" email Flow
- `/admin/orders` search + filter + CSV export
- International payment rails (Stripe Global / PayPal) for Indian diaspora
- Wishlist + personalization
- Subscription SKUs
