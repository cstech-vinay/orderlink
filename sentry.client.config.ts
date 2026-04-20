import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    beforeSend(event) {
      return scrubPii(event);
    },
  });
}

const PII_FIELDS = [
  "customer_name",
  "customer_email",
  "customer_mobile",
  "ship_line1",
  "ship_line2",
  "fullname",
  "full_name",
  "email",
  "mobile",
  "phone",
  "address",
  "pincode",
];

function scrubPii<T extends Sentry.ErrorEvent>(event: T): T {
  const visit = (obj: unknown): void => {
    if (!obj || typeof obj !== "object") return;
    for (const k of Object.keys(obj as Record<string, unknown>)) {
      const record = obj as Record<string, unknown>;
      if (PII_FIELDS.some((f) => k.toLowerCase().includes(f))) {
        record[k] = "[REDACTED]";
      } else {
        visit(record[k]);
      }
    }
  };
  if (event.extra) visit(event.extra);
  if (event.contexts) visit(event.contexts);
  if (event.request?.data) visit(event.request.data);
  return event;
}
