import Link from "next/link";
import { categories } from "@/data/categories";

export default function ProductNotFound() {
  return (
    <main className="min-h-[50vh] py-16">
      <h1 className="font-display text-[36px] font-bold tracking-tight">Can&apos;t find that find.</h1>
      <p className="text-[16px] text-ol-muted max-w-[560px] mt-2 mb-8">
        That product isn&apos;t in our edit. Browse a sub-brand instead — every shelf is hand-tested.
      </p>
      <div className="flex flex-wrap gap-2.5">
        {categories.map(c => (
          <Link key={c.id} href={`/shop/${c.id}`}
            className="px-4 py-2 rounded-full bg-white border border-ol-deep/10 text-[13px] font-semibold hover:border-ol-accent">
            {c.name}
          </Link>
        ))}
      </div>
    </main>
  );
}
