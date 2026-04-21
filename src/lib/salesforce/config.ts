/**
 * Salesforce env-var configuration. All SF writer code reads from here so env
 * assumptions live in one place. Returns null when sync is disabled or creds
 * are placeholder-only so callers can short-circuit without throwing.
 */

export type SalesforceConfig = {
  loginUrl: string; // e.g. https://test.salesforce.com (sandbox) or https://login.salesforce.com
  instanceUrl: string; // e.g. https://codesierra--uat.sandbox.my.salesforce.com
  apiVersion: string; // e.g. v66.0
  consumerKey: string;
  username: string;
  privateKeyPath: string;
  externalIdPrefix: string; // "orderlink"
  recordTypeIds: {
    personAccount: string;
    order: string;
    lead: string;
    product?: string;
  };
};

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  return v === "" || v === "CHANGE_ME" || v.startsWith("CHANGE_ME");
}

/**
 * Returns the config whenever required creds are set, REGARDLESS of the
 * SF_SYNC_ENABLED flag. Use this for reads (invoice download, admin queries)
 * that should work even when writes are paused.
 *
 * Returns null only when a required env var is missing or placeholder.
 */
export function getSalesforceCredentials(): SalesforceConfig | null {
  const required = [
    "SF_LOGIN_URL",
    "SF_INSTANCE_URL",
    "SF_CONSUMER_KEY",
    "SF_USERNAME",
    "SF_JWT_PRIVATE_KEY_PATH",
    "SF_PERSON_ACCOUNT_RECORD_TYPE_ID",
    "SF_ORDER_RECORD_TYPE_ID",
    "SF_LEAD_RECORD_TYPE_ID",
  ];
  for (const key of required) {
    if (isPlaceholder(process.env[key])) return null;
  }

  return {
    loginUrl: process.env.SF_LOGIN_URL!,
    instanceUrl: process.env.SF_INSTANCE_URL!,
    apiVersion: process.env.SF_API_VERSION ?? "v66.0",
    consumerKey: process.env.SF_CONSUMER_KEY!,
    username: process.env.SF_USERNAME!,
    privateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH!,
    externalIdPrefix: process.env.SF_EXTERNAL_ID_PREFIX ?? "orderlink",
    recordTypeIds: {
      personAccount: process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID!,
      order: process.env.SF_ORDER_RECORD_TYPE_ID!,
      lead: process.env.SF_LEAD_RECORD_TYPE_ID!,
      product: isPlaceholder(process.env.SF_PRODUCT_RECORD_TYPE_ID)
        ? undefined
        : process.env.SF_PRODUCT_RECORD_TYPE_ID,
    },
  };
}

/**
 * Returns a full config when Salesforce sync is enabled AND all required env
 * vars are set. Returns null otherwise — callers treat that as "skip sync"
 * (same pattern as MSG91 dev bypass). Use this for WRITES (worker drains,
 * verify-inline sync, admin back-sync).
 */
export function getSalesforceConfig(): SalesforceConfig | null {
  if (process.env.SF_SYNC_ENABLED !== "true") return null;

  const required = [
    "SF_LOGIN_URL",
    "SF_INSTANCE_URL",
    "SF_CONSUMER_KEY",
    "SF_USERNAME",
    "SF_JWT_PRIVATE_KEY_PATH",
    "SF_PERSON_ACCOUNT_RECORD_TYPE_ID",
    "SF_ORDER_RECORD_TYPE_ID",
    "SF_LEAD_RECORD_TYPE_ID",
  ];
  for (const key of required) {
    if (isPlaceholder(process.env[key])) return null;
  }

  return {
    loginUrl: process.env.SF_LOGIN_URL!,
    instanceUrl: process.env.SF_INSTANCE_URL!,
    apiVersion: process.env.SF_API_VERSION ?? "v66.0",
    consumerKey: process.env.SF_CONSUMER_KEY!,
    username: process.env.SF_USERNAME!,
    privateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH!,
    externalIdPrefix: process.env.SF_EXTERNAL_ID_PREFIX ?? "orderlink",
    recordTypeIds: {
      personAccount: process.env.SF_PERSON_ACCOUNT_RECORD_TYPE_ID!,
      order: process.env.SF_ORDER_RECORD_TYPE_ID!,
      lead: process.env.SF_LEAD_RECORD_TYPE_ID!,
      product: isPlaceholder(process.env.SF_PRODUCT_RECORD_TYPE_ID)
        ? undefined
        : process.env.SF_PRODUCT_RECORD_TYPE_ID,
    },
  };
}

export function isSalesforceEnabled(): boolean {
  return getSalesforceConfig() !== null;
}
