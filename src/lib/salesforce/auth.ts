import { readFile } from "node:fs/promises";
import { createSign } from "node:crypto";
import type { SalesforceConfig } from "./config";

/**
 * Minimal Salesforce OAuth 2.0 JWT Bearer flow implementation. No external
 * deps — Node's crypto signs the JWT, fetch exchanges it for a token.
 *
 * Spec: https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_jwt_flow.htm
 */

export type AccessToken = {
  value: string;
  instanceUrl: string;
  expiresAt: number; // epoch ms
};

function base64UrlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf-8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function signJwt(args: {
  consumerKey: string;
  username: string;
  audience: string;
  privateKeyPem: string;
}): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: args.consumerKey,
      sub: args.username,
      aud: args.audience,
      exp: nowSeconds + 180, // 3-minute window — Salesforce accepts up to 3 min
    })
  );
  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64UrlEncode(signer.sign(args.privateKeyPem));
  return `${unsigned}.${signature}`;
}

/**
 * Exchange a signed JWT for a Salesforce access token. The returned token is
 * valid for roughly 1 hour (SF default session duration). Callers should cache
 * and refresh on expiry or on 401 INVALID_SESSION_ID responses.
 */
export async function fetchAccessToken(config: SalesforceConfig): Promise<AccessToken> {
  const privateKeyPem = await readFile(config.privateKeyPath, "utf-8");
  const jwt = await signJwt({
    consumerKey: config.consumerKey,
    username: config.username,
    audience: config.loginUrl, // e.g. https://test.salesforce.com
    privateKeyPem,
  });

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const res = await fetch(`${config.loginUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`SF JWT exchange failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    instance_url: string;
    token_type?: string;
  };

  return {
    value: data.access_token,
    instanceUrl: data.instance_url,
    // Default session expiry is ~2h but we refresh at 1h to avoid 401 races.
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
}

/**
 * Simple in-memory token cache. Process-lifetime only — when the worker
 * restarts, first call re-fetches. That's fine since JWT exchange is cheap.
 */
export class TokenCache {
  private token: AccessToken | null = null;
  private pending: Promise<AccessToken> | null = null;

  async get(config: SalesforceConfig, forceRefresh: boolean = false): Promise<AccessToken> {
    if (!forceRefresh && this.token && Date.now() < this.token.expiresAt) {
      return this.token;
    }
    if (this.pending) return this.pending;

    this.pending = fetchAccessToken(config).then((t) => {
      this.token = t;
      this.pending = null;
      return t;
    });
    try {
      return await this.pending;
    } catch (err) {
      this.pending = null;
      throw err;
    }
  }

  invalidate(): void {
    this.token = null;
  }
}

// Module-level singleton — T30 worker runs in a single process, single cache
// is enough. If we ever scale out horizontally, move this to a shared store.
export const tokenCache = new TokenCache();
