import { describe, it, expect, beforeAll, vi } from "vitest";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import { generateKeyPairSync, createVerify } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { fetchAccessToken, TokenCache } from "@/lib/salesforce/auth";

// Generate a throwaway RSA keypair the tests can sign against. Public key
// verifies the JWT signature produced by fetchAccessToken.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

let keyPath: string;

beforeAll(async () => {
  const tmp = path.join(os.tmpdir(), `sf-jwt-test-${Date.now()}`);
  await mkdir(tmp, { recursive: true });
  keyPath = path.join(tmp, "sf-jwt.key");
  await writeFile(keyPath, privateKey, "utf-8");
});

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

describe("fetchAccessToken — JWT signing + token exchange", () => {
  it("signs a valid RS256 JWT and exchanges it for an access token", async () => {
    const fetchMock = vi.fn(async (url: string | URL, init: RequestInit | undefined) => {
      expect(String(url)).toBe("https://test.salesforce.com/services/oauth2/token");
      expect(init?.method).toBe("POST");
      const body = new URLSearchParams(init?.body as string);
      expect(body.get("grant_type")).toBe(
        "urn:ietf:params:oauth:grant-type:jwt-bearer"
      );
      const jwt = body.get("assertion")!;

      // Verify the JWT structure + signature with the public key
      const [h, p, s] = jwt.split(".");
      const header = JSON.parse(base64UrlDecode(h));
      const payload = JSON.parse(base64UrlDecode(p));
      expect(header.alg).toBe("RS256");
      expect(payload.iss).toBe("test-consumer-key");
      expect(payload.sub).toBe("integration@example.com");
      expect(payload.aud).toBe("https://test.salesforce.com");
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

      const verifier = createVerify("RSA-SHA256");
      verifier.update(`${h}.${p}`);
      verifier.end();
      const sigBytes = Buffer.from(
        s.replace(/-/g, "+").replace(/_/g, "/") +
          "=".repeat((4 - (s.length % 4)) % 4),
        "base64"
      );
      expect(verifier.verify(publicKey, sigBytes)).toBe(true);

      return new Response(
        JSON.stringify({
          access_token: "ATOKEN_FAKE",
          instance_url: "https://test.my.salesforce.com",
          token_type: "Bearer",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const token = await fetchAccessToken({
      loginUrl: "https://test.salesforce.com",
      instanceUrl: "https://test.my.salesforce.com",
      apiVersion: "v66.0",
      consumerKey: "test-consumer-key",
      username: "integration@example.com",
      privateKeyPath: keyPath,
      externalIdPrefix: "orderlink",
      recordTypeIds: { personAccount: "012a", order: "012b", lead: "012c" },
    });

    expect(token.value).toBe("ATOKEN_FAKE");
    expect(token.instanceUrl).toBe("https://test.my.salesforce.com");
    expect(token.expiresAt).toBeGreaterThan(Date.now());

    vi.unstubAllGlobals();
  });

  it("throws with the SF error body when exchange returns non-2xx", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: "invalid_grant", error_description: "user hasn't approved this consumer" }),
        { status: 400 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchAccessToken({
        loginUrl: "https://test.salesforce.com",
        instanceUrl: "https://test.my.salesforce.com",
        apiVersion: "v66.0",
        consumerKey: "bad-key",
        username: "integration@example.com",
        privateKeyPath: keyPath,
        externalIdPrefix: "orderlink",
        recordTypeIds: { personAccount: "012a", order: "012b", lead: "012c" },
      })
    ).rejects.toThrow(/SF JWT exchange failed \(400\)/);

    vi.unstubAllGlobals();
  });
});

describe("TokenCache", () => {
  it("returns cached token while unexpired", async () => {
    const cache = new TokenCache();
    let calls = 0;
    const fetchMock = vi.fn(async () => {
      calls++;
      return new Response(
        JSON.stringify({
          access_token: `T${calls}`,
          instance_url: "https://x",
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const config = {
      loginUrl: "https://test.salesforce.com",
      instanceUrl: "https://x",
      apiVersion: "v66.0",
      consumerKey: "k",
      username: "u",
      privateKeyPath: keyPath,
      externalIdPrefix: "orderlink",
      recordTypeIds: { personAccount: "012a", order: "012b", lead: "012c" },
    };
    const a = await cache.get(config);
    const b = await cache.get(config);
    expect(a.value).toBe("T1");
    expect(b.value).toBe("T1"); // cached
    expect(calls).toBe(1);

    // Force refresh re-fetches
    const c = await cache.get(config, true);
    expect(c.value).toBe("T2");
    expect(calls).toBe(2);

    vi.unstubAllGlobals();
  });
});
