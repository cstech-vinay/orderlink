import Link from "next/link";
import { MerchantLogo } from "./MerchantLogo";
import { Icon } from "./Icon";
import { formatRupees } from "@/lib/format";
import type { AffiliateProduct } from "@/data/affiliate-products";

export function MerchantList({ product }: { product: AffiliateProduct }) {
  return (
    <div className="bg-white border border-ol-deep/10 rounded-ol overflow-hidden mb-4">
      <div className="px-4 py-3.5 bg-ol-soft flex justify-between items-center">
        <strong className="text-[14px]">Best prices today</strong>
        <span className="text-[12px] text-ol-muted">Updated 2 hrs ago</span>
      </div>
      {product.merchants.map((m, i) => (
        <div key={m.id}
          className={`p-[18px] flex items-center justify-between gap-4 flex-wrap ${i ? "border-t border-ol-deep/[0.07]" : ""}`}>
          <div className="flex items-center gap-3.5 min-w-0">
            <MerchantLogo id={m.id} height={26}/>
            <div>
              <div className="font-bold text-[18px] font-display tracking-tight">{formatRupees(m.price)}</div>
              <div className="text-[12px] text-ol-muted flex gap-2.5">
                <span className="inline-flex items-center gap-1"><Icon name="truck" size={11}/> {m.eta}</span>
                <span className={`inline-flex items-center gap-1 ${m.stock === "Few left" ? "text-ol-warn" : "text-ol-success"}`}>
                  <Icon name="check" size={11}/> {m.stock}
                </span>
              </div>
            </div>
          </div>
          <Link href={`/go/${product.id}/${m.id}`}
            className="inline-flex items-center gap-2 bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px] px-4 py-2.5 rounded-full">
            Go to {m.label} <Icon name="external" size={14}/>
          </Link>
        </div>
      ))}
    </div>
  );
}
