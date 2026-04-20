import { createHash } from "node:crypto";

/**
 * Deterministic External Ids for Salesforce upserts. Keeps the PK
 * derivation in one place so sObject writers + test fixtures agree.
 *
 * All IDs are prefixed so humans can tell them apart in SF UI.
 *   orderlink:{first-30-hex-chars-of-sha256-email}          → Account (Person)
 *   orderlink:lead:{orderRefUuid}                           → Lead (abandoned)
 *   orderlink:redemption:{orderRefUuid}                     → Coupon redemption
 *   orderlink:restock:{productSlug}:{first-16-hex-email}    → Restock waitlist
 */

function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

export function accountExternalId(email: string): string {
  return `orderlink:${hashEmail(email).slice(0, 30)}`;
}

export function leadExternalId(orderRefUuid: string): string {
  return `orderlink:lead:${orderRefUuid}`;
}

export function couponRedemptionExternalId(orderRefUuid: string): string {
  return `orderlink:redemption:${orderRefUuid}`;
}

export function restockExternalId(productSlug: string, email: string): string {
  return `orderlink:restock:${productSlug}:${hashEmail(email).slice(0, 16)}`;
}

/** Full 64-char SHA-256 hex of lowercased email — used in CouponRedemption.Customer_Email_Hash__c */
export function emailHash(email: string): string {
  return hashEmail(email);
}
