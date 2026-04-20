import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getSalesforceConfig, isSalesforceEnabled } from "@/lib/salesforce/config";

const REQUIRED_KEYS = [
  "SF_SYNC_ENABLED",
  "SF_LOGIN_URL",
  "SF_INSTANCE_URL",
  "SF_CONSUMER_KEY",
  "SF_USERNAME",
  "SF_JWT_PRIVATE_KEY_PATH",
  "SF_PERSON_ACCOUNT_RECORD_TYPE_ID",
  "SF_ORDER_RECORD_TYPE_ID",
  "SF_LEAD_RECORD_TYPE_ID",
  "SF_PRODUCT_RECORD_TYPE_ID",
  "SF_API_VERSION",
  "SF_EXTERNAL_ID_PREFIX",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const k of REQUIRED_KEYS) out[k] = process.env[k];
  return out;
}

function restoreEnv(snap: Record<string, string | undefined>): void {
  for (const k of REQUIRED_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

describe("getSalesforceConfig", () => {
  let original: ReturnType<typeof snapshotEnv>;

  beforeEach(() => {
    original = snapshotEnv();
    for (const k of REQUIRED_KEYS) delete process.env[k];
  });

  afterEach(() => {
    restoreEnv(original);
  });

  it("returns null when SF_SYNC_ENABLED is not 'true'", () => {
    process.env.SF_SYNC_ENABLED = "false";
    expect(getSalesforceConfig()).toBeNull();
    expect(isSalesforceEnabled()).toBe(false);
  });

  it("returns null when SF_SYNC_ENABLED is unset", () => {
    expect(getSalesforceConfig()).toBeNull();
  });

  it("returns null when any required key is placeholder 'CHANGE_ME'", () => {
    process.env.SF_SYNC_ENABLED = "true";
    process.env.SF_LOGIN_URL = "https://test.salesforce.com";
    process.env.SF_INSTANCE_URL = "https://x.my.salesforce.com";
    process.env.SF_CONSUMER_KEY = "CHANGE_ME";
    process.env.SF_USERNAME = "integration@example.com";
    process.env.SF_JWT_PRIVATE_KEY_PATH = "./certs/sf-jwt.key";
    process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID = "012aaaa";
    process.env.SF_ORDER_RECORD_TYPE_ID = "012bbbb";
    process.env.SF_LEAD_RECORD_TYPE_ID = "012cccc";
    expect(getSalesforceConfig()).toBeNull();
  });

  it("returns full config when all required vars are present", () => {
    process.env.SF_SYNC_ENABLED = "true";
    process.env.SF_LOGIN_URL = "https://test.salesforce.com";
    process.env.SF_INSTANCE_URL = "https://x.my.salesforce.com";
    process.env.SF_CONSUMER_KEY = "3MVG9...";
    process.env.SF_USERNAME = "integration@example.com";
    process.env.SF_JWT_PRIVATE_KEY_PATH = "./certs/sf-jwt.key";
    process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID = "012C40000016ZsBIAU";
    process.env.SF_ORDER_RECORD_TYPE_ID = "012C40000016ZsAIAU";
    process.env.SF_LEAD_RECORD_TYPE_ID = "012C40000016Zs9IAE";

    const config = getSalesforceConfig();
    expect(config).not.toBeNull();
    expect(config?.consumerKey).toBe("3MVG9...");
    expect(config?.recordTypeIds.personAccount).toBe("012C40000016ZsBIAU");
    expect(config?.recordTypeIds.product).toBeUndefined();
    expect(config?.apiVersion).toBe("v66.0"); // default
    expect(config?.externalIdPrefix).toBe("orderlink"); // default
  });

  it("honors SF_API_VERSION override", () => {
    process.env.SF_SYNC_ENABLED = "true";
    process.env.SF_LOGIN_URL = "https://test.salesforce.com";
    process.env.SF_INSTANCE_URL = "https://x.my.salesforce.com";
    process.env.SF_CONSUMER_KEY = "x";
    process.env.SF_USERNAME = "x";
    process.env.SF_JWT_PRIVATE_KEY_PATH = "x";
    process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID = "012a";
    process.env.SF_ORDER_RECORD_TYPE_ID = "012b";
    process.env.SF_LEAD_RECORD_TYPE_ID = "012c";
    process.env.SF_API_VERSION = "v63.0";
    expect(getSalesforceConfig()?.apiVersion).toBe("v63.0");
  });
});
