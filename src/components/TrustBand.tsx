import Link from "next/link";

export function TrustBand() {
  return (
    <Link
      href="/logistics"
      className="block rounded-lg border border-[color:var(--rule)] p-4 bg-cream-deep/40 hover:bg-cream-deep/80 transition"
    >
      <p className="font-sans text-sm font-medium text-ink">
        <span aria-hidden className="mr-1">&#128666;</span> Pan-India delivery &middot; 19,000+ pincodes
      </p>
      <p className="font-sans text-xs text-ink-soft mt-1">
        3&ndash;8 day delivery &middot; free shipping &middot; COD available
      </p>
      <p className="font-sans text-xs text-ink-soft/80 mt-1">
        SMS tracking updates at every stage from dispatch to door.
      </p>
    </Link>
  );
}
