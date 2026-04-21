import { getSalesforceCredentials, type SalesforceConfig } from "./config";
import { tokenCache } from "./auth";

/**
 * Thin REST client for Salesforce. Handles:
 *   - bearer token injection
 *   - automatic re-auth on 401 INVALID_SESSION_ID (one retry)
 *   - structured error surface so callers can distinguish retryable vs fatal
 *   - returns parsed JSON OR raw Response for binary downloads (ContentVersion)
 *
 * Does NOT handle sObject-shape marshaling — that lives in
 * src/lib/salesforce/sobjects/*. Keeps this file small and swappable.
 */

export class SalesforceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly errorCode: string | null,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "SalesforceError";
  }

  /** Caller can retry after refresh of JWT + same call. Auth issues. */
  get isAuthError(): boolean {
    return this.status === 401 || this.errorCode === "INVALID_SESSION_ID";
  }

  /** Caller should back off + retry later — transient SF-side issue. */
  get isTransient(): boolean {
    return this.status >= 500 || this.status === 429;
  }
}

type RestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // e.g. /sobjects/Account/OrderLink_External_Id__c/orderlink:abc
  query?: Record<string, string>;
  body?: object | string;
  headers?: Record<string, string>;
  /** Skip the automatic one-shot retry on auth failure. Tests rely on this. */
  noRetry?: boolean;
};

/**
 * Make an authenticated SF REST call. Returns the parsed JSON response on 2xx
 * with content, or null for 204 No Content.
 */
export async function sfRest<T = unknown>(opts: RestOptions): Promise<T | null> {
  const config = getSalesforceCredentials();
  if (!config) throw new Error("salesforce_not_configured");
  return callWithRetry<T>(config, opts, false);
}

async function callWithRetry<T>(
  config: SalesforceConfig,
  opts: RestOptions,
  isRetry: boolean
): Promise<T | null> {
  const token = await tokenCache.get(config);
  const url = buildUrl(token.instanceUrl, config.apiVersion, opts.path, opts.query);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.value}`,
    Accept: "application/json",
    ...(opts.headers ?? {}),
  };

  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof opts.body === "string") {
      body = opts.body;
    } else {
      body = JSON.stringify(opts.body);
      headers["Content-Type"] ??= "application/json";
    }
  }

  const res = await fetch(url, { method: opts.method, headers, body });

  if (res.status === 204) return null;

  if (res.status === 401 && !isRetry && !opts.noRetry) {
    tokenCache.invalidate();
    return callWithRetry<T>(config, opts, true);
  }

  const text = await res.text();
  let parsed: unknown = null;
  if (text.length > 0) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    // SF REST errors come back as [{ errorCode, message, fields? }]
    const errorCode =
      Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === "object"
        ? ((parsed[0] as { errorCode?: string }).errorCode ?? null)
        : null;
    throw new SalesforceError(
      `SF ${opts.method} ${opts.path} failed (${res.status}): ${text}`,
      res.status,
      errorCode,
      parsed
    );
  }

  return parsed as T;
}

function buildUrl(
  instanceUrl: string,
  apiVersion: string,
  path: string,
  query?: Record<string, string>
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const qs = query
    ? "?" + new URLSearchParams(query).toString()
    : "";
  return `${instanceUrl}/services/data/${apiVersion}${cleanPath}${qs}`;
}

/**
 * Multipart upload for ContentVersion. SF requires a specific multipart
 * envelope: first part JSON metadata, second part binary file body.
 */
export async function sfUploadContentVersion(args: {
  metadata: Record<string, unknown>;
  filename: string;
  bytes: Buffer;
}): Promise<{ id: string }> {
  const config = getSalesforceCredentials();
  if (!config) throw new Error("salesforce_not_configured");

  const token = await tokenCache.get(config);
  const boundary = `----OrderLink${Date.now().toString(36)}`;
  const url = `${token.instanceUrl}/services/data/${config.apiVersion}/sobjects/ContentVersion`;

  // Build the multipart body by hand — fetch's FormData doesn't give us
  // Content-Type control per-part and SF is strict about it.
  const parts: Buffer[] = [];
  const crlf = Buffer.from("\r\n");

  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(
    Buffer.from(
      'Content-Disposition: form-data; name="entity_content"\r\n' +
        "Content-Type: application/json\r\n\r\n"
    )
  );
  parts.push(Buffer.from(JSON.stringify(args.metadata)));
  parts.push(crlf);

  parts.push(Buffer.from(`--${boundary}\r\n`));
  parts.push(
    Buffer.from(
      `Content-Disposition: form-data; name="VersionData"; filename="${args.filename}"\r\n` +
        "Content-Type: application/pdf\r\n\r\n"
    )
  );
  parts.push(args.bytes);
  parts.push(crlf);
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  const body = Buffer.concat(parts);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token.value}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
      Accept: "application/json",
    },
    body: new Uint8Array(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new SalesforceError(
      `SF ContentVersion upload failed (${res.status}): ${text}`,
      res.status,
      null,
      text
    );
  }
  const parsed = JSON.parse(text) as { id: string };
  return parsed;
}

/** Run a SOQL query, returning all records in one shot. Caller batches pages if needed. */
export async function sfQuery<T = Record<string, unknown>>(soql: string): Promise<T[]> {
  const result = await sfRest<{ records: T[] }>({
    method: "GET",
    path: "/query",
    query: { q: soql },
  });
  return result?.records ?? [];
}

/**
 * Download the raw bytes of a ContentVersion's VersionData field. SF exposes
 * a dedicated binary endpoint for this so we avoid the overhead of a
 * base64-encoded JSON blob round-trip.
 *
 *   GET /sobjects/ContentVersion/{Id}/VersionData
 *
 * Returns the Buffer + the Content-Type header SF reports (usually
 * "application/pdf" for our invoices).
 */
export async function sfDownloadVersionData(
  contentVersionId: string
): Promise<{ bytes: Buffer; contentType: string }> {
  const config = getSalesforceCredentials();
  if (!config) throw new Error("salesforce_not_configured");

  const token = await tokenCache.get(config);
  const url = `${token.instanceUrl}/services/data/${config.apiVersion}/sobjects/ContentVersion/${contentVersionId}/VersionData`;

  const doFetch = async (bearer: string): Promise<Response> =>
    fetch(url, { headers: { Authorization: `Bearer ${bearer}` } });

  let res = await doFetch(token.value);
  if (res.status === 401) {
    tokenCache.invalidate();
    const fresh = await tokenCache.get(config);
    res = await doFetch(fresh.value);
  }

  if (!res.ok) {
    const text = await res.text();
    throw new SalesforceError(
      `SF VersionData fetch failed (${res.status}): ${text}`,
      res.status,
      null,
      text
    );
  }

  const arrayBuf = await res.arrayBuffer();
  return {
    bytes: Buffer.from(arrayBuf),
    contentType: res.headers.get("Content-Type") ?? "application/octet-stream",
  };
}

/**
 * Given a ContentDocumentId (069…), resolve its latest published ContentVersion
 * and download the binary. Most-recent version is standard for invoice PDFs
 * since we only upload once per order.
 */
export async function sfDownloadLatestContentVersion(
  contentDocumentId: string
): Promise<{ bytes: Buffer; contentType: string; versionId: string }> {
  const rows = await sfQuery<{ Id: string }>(
    `SELECT Id FROM ContentVersion WHERE ContentDocumentId = '${contentDocumentId}' AND IsLatest = true LIMIT 1`
  );
  if (rows.length === 0) {
    throw new Error(`no_content_version_for_document:${contentDocumentId}`);
  }
  const { bytes, contentType } = await sfDownloadVersionData(rows[0].Id);
  return { bytes, contentType, versionId: rows[0].Id };
}
