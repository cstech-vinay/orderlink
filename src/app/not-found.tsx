import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-20">
      <h1 className="font-display text-[clamp(48px,8vw,96px)] font-bold tracking-tight">404.</h1>
      <p className="text-[18px] text-ol-muted max-w-[460px] mt-2 mb-8">
        This page got lost on the way to the merchant. Let&apos;s get you back to the curated finds.
      </p>
      <Link href="/"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px]">
        Back to home
      </Link>
    </main>
  );
}
