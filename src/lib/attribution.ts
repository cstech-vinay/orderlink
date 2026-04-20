const STORAGE_KEY = "orderlink.attribution";

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  referrer?: string;
  landing_page?: string;
  captured_at?: string;
};

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch {
    return {};
  }
}

export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const existing = readAttribution();
  if (existing.captured_at) return; // first-touch only per session

  const url = new URL(window.location.href);
  const read = (k: string) => url.searchParams.get(k) ?? undefined;
  const next: Attribution = {
    utm_source: read("utm_source"),
    utm_medium: read("utm_medium"),
    utm_campaign: read("utm_campaign"),
    utm_term: read("utm_term"),
    utm_content: read("utm_content"),
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname + window.location.search,
    captured_at: new Date().toISOString(),
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // sessionStorage may throw in private browsing / quota-exceeded; attribution is non-essential
  }
}
