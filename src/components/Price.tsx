import { formatRupees, percentOff } from "@/lib/format";

const SIZES = {
  sm: { main: "text-[15px]", strike: "text-[12px]" },
  md: { main: "text-[20px]", strike: "text-[13px]" },
  lg: { main: "text-[28px]", strike: "text-[15px]" },
  xl: { main: "text-[36px]", strike: "text-[18px]" },
} as const;

export type PriceSize = keyof typeof SIZES;

export function Price({
  value, mrp, size = "md",
}: { value: number; mrp?: number; size?: PriceSize }) {
  const off = mrp ? percentOff(value, mrp) : 0;
  const cls = SIZES[size];
  return (
    <span className="inline-flex flex-wrap items-baseline gap-2">
      <span className={`font-display font-bold tracking-tight text-ol-ink ${cls.main}`}>
        {formatRupees(value)}
      </span>
      {mrp && (
        <span className={`text-ol-muted line-through ${cls.strike}`}>
          {formatRupees(mrp)}
        </span>
      )}
      {off > 0 && (
        <span className={`font-bold text-ol-success ${cls.strike}`}>{off}% off</span>
      )}
    </span>
  );
}
