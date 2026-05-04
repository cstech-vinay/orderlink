import Link from "next/link";
import { Icon } from "./Icon";

export function SectionHead({
  eyebrow, title, link,
}: { eyebrow: string; title: string; link?: { label: string; href: string } }) {
  return (
    <div className="flex justify-between items-end mb-6 gap-4 flex-wrap">
      <div>
        <div className="text-[12px] font-bold tracking-[0.14em] text-ol-accent uppercase mb-1.5">
          {eyebrow}
        </div>
        <h2 className="font-display font-bold tracking-tight m-0 text-[clamp(28px,3.5vw,42px)]"
            style={{ textWrap: "balance" }}>
          {title}
        </h2>
      </div>
      {link && (
        <Link href={link.href}
          className="text-[14px] font-semibold text-ol-ink inline-flex items-center gap-1.5">
          {link.label} <Icon name="arrow-right" size={14}/>
        </Link>
      )}
    </div>
  );
}
