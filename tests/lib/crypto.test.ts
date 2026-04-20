import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "node:crypto";
import { encryptJSON, decryptJSON } from "@/lib/crypto";

describe("crypto — AES-GCM JSON envelope", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  it("round-trips a JSON payload", () => {
    const data = {
      customer_email: "priya@example.com",
      mobile: "9876543210",
      addressLine1: "221B Baker Street",
    };
    const e = encryptJSON(data);
    expect(e.ciphertext.length).toBeGreaterThan(0);
    expect(Buffer.from(e.iv, "base64").length).toBe(12);
    expect(Buffer.from(e.tag, "base64").length).toBe(16);
    const back = decryptJSON<typeof data>(e);
    expect(back).toEqual(data);
  });

  it("fails to decrypt if ciphertext is tampered", () => {
    const e = encryptJSON({ foo: "bar" });
    e.ciphertext[0] ^= 0xff;
    expect(() => decryptJSON(e)).toThrow();
  });

  it("fails to decrypt if auth tag is tampered", () => {
    const e = encryptJSON({ foo: "bar" });
    const tag = Buffer.from(e.tag, "base64");
    tag[0] ^= 0xff;
    e.tag = tag.toString("base64");
    expect(() => decryptJSON(e)).toThrow();
  });

  it("produces different ciphertexts for the same plaintext (random IV)", () => {
    const a = encryptJSON({ foo: "bar" });
    const b = encryptJSON({ foo: "bar" });
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("throws if ENCRYPTION_KEY is missing", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => encryptJSON({ foo: "bar" })).toThrow(/ENCRYPTION_KEY/);
  });

  it("throws if ENCRYPTION_KEY is not 32 base64-decoded bytes", () => {
    process.env.ENCRYPTION_KEY = Buffer.from("too-short").toString("base64");
    expect(() => encryptJSON({ foo: "bar" })).toThrow(/32 base64/);
  });
});
