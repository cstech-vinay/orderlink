// Auth-only smoke test. Hits Salesforce's token endpoint with the configured
// JWT, prints success/failure. Does NOT write anything to SF.
// Run: docker compose -f docker-compose.dev.yml exec app env SF_SYNC_ENABLED=true npx tsx scripts/sf-auth-smoke.ts
import "dotenv/config";
import { getSalesforceConfig } from "@/lib/salesforce/config";
import { fetchAccessToken } from "@/lib/salesforce/auth";

async function main() {
  const config = getSalesforceConfig();
  if (!config) {
    console.error(
      "[sf-auth] config not loadable — SF_SYNC_ENABLED=true and all creds required"
    );
    process.exit(1);
  }

  console.log("[sf-auth] attempting JWT exchange against", config.loginUrl);
  console.log("[sf-auth] username:", config.username);
  console.log("[sf-auth] consumer key:", config.consumerKey.slice(0, 20) + "...");
  console.log("[sf-auth] private key:", config.privateKeyPath);

  try {
    const token = await fetchAccessToken(config);
    console.log("[sf-auth] ✓ SUCCESS");
    console.log("[sf-auth] instance_url:", token.instanceUrl);
    console.log("[sf-auth] access_token:", token.value.slice(0, 20) + "...");
    console.log("[sf-auth] expiresAt:", new Date(token.expiresAt).toISOString());
    process.exit(0);
  } catch (err) {
    console.error("[sf-auth] ✗ FAILED:");
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}

main();
