// Load .env for tests so DATABASE_URL, ENCRYPTION_KEY, etc. are visible.
// Tests that use DB run via `describe.skipIf(!process.env.DATABASE_URL)`, so
// missing .env just makes them skip rather than fail.
import "dotenv/config";
import "@testing-library/jest-dom/vitest";
