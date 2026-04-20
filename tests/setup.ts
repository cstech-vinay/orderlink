// Load .env for tests so DATABASE_URL, ENCRYPTION_KEY, etc. are visible.
// Tests that use DB run via `describe.skipIf(!process.env.DATABASE_URL)`, so
// missing .env just makes them skip rather than fail.
//
// Load .env.test FIRST so its DATABASE_URL wins. That points vitest at the
// isolated Postgres on port 5433 (docker service `db-test`). Previously the
// test suite shared the dev DB and its DELETE FROM orders_ref in beforeEach
// wiped in-progress real orders — see commit message for OL-2026-0003 incident.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.test", override: true });
loadEnv(); // fall through to .env for anything not in .env.test

import "@testing-library/jest-dom/vitest";
