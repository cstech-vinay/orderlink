import { describe, it, expect } from "vitest";
import {
  accountExternalId,
  leadExternalId,
  couponRedemptionExternalId,
  restockExternalId,
  emailHash,
} from "@/lib/salesforce/external-ids";

describe("SF external-id derivations", () => {
  it("accountExternalId is deterministic + lowercases email + trims whitespace", () => {
    const a = accountExternalId("Priya@Example.com");
    const b = accountExternalId("priya@example.com");
    const c = accountExternalId("  priya@example.com  ");
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a).toMatch(/^orderlink:[0-9a-f]{30}$/);
  });

  it("different emails produce different account ids", () => {
    expect(accountExternalId("a@x.com")).not.toBe(accountExternalId("b@x.com"));
  });

  it("leadExternalId embeds the UUID verbatim", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(leadExternalId(uuid)).toBe(`orderlink:lead:${uuid}`);
  });

  it("couponRedemptionExternalId uses the orderRef uuid", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(couponRedemptionExternalId(uuid)).toBe(`orderlink:redemption:${uuid}`);
  });

  it("restockExternalId ties slug + email hash", () => {
    const id = restockExternalId("oil-dispenser", "priya@example.com");
    expect(id).toMatch(/^orderlink:restock:oil-dispenser:[0-9a-f]{16}$/);
    // same inputs → same id
    expect(id).toBe(restockExternalId("oil-dispenser", "PRIYA@example.com"));
    // different slug → different id
    expect(id).not.toBe(restockExternalId("rice-face-wash", "priya@example.com"));
  });

  it("emailHash returns 64-char SHA-256 hex", () => {
    const hash = emailHash("priya@example.com");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // known value for this input (computed via: echo -n "priya@example.com" | sha256sum)
    expect(hash).toBe(
      "6bdb7e961d54ddc243ec721e6e211ac0a179b19a9ce2ad52a418198e146e69fe"
    );
  });
});
