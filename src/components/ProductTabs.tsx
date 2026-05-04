"use client";
import { useState } from "react";
import { Icon } from "./Icon";
import { Stars } from "./Stars";
import type { AffiliateProduct } from "@/data/affiliate-products";

type Tab = "overview" | "specs" | "reviews";

export function ProductTabs({ product }: { product: AffiliateProduct }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs: [Tab, string][] = [
    ["overview", "Why we love it"],
    ["specs",    "Specs"],
    ["reviews",  `Reviews (${product.reviewCount.toLocaleString("en-IN")})`],
  ];

  return (
    <div className="border-t border-ol-deep/10 mb-8">
      <div className="flex gap-1 py-2 overflow-x-auto" role="tablist">
        {tabs.map(([k, label]) => {
          const active = tab === k;
          return (
            <button key={k} role="tab" aria-selected={active}
              onClick={() => setTab(k)}
              className={`px-4 py-3 rounded-xl font-semibold text-[14px] whitespace-nowrap border ${active ? "bg-white border-ol-deep/15 text-ol-ink" : "bg-transparent border-transparent text-ol-muted"}`}>
              {label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && <OverviewBody p={product}/>}
      {tab === "specs"    && <SpecsBody    p={product}/>}
      {tab === "reviews"  && <ReviewsBody  p={product}/>}
    </div>
  );
}

function OverviewBody({ p }: { p: AffiliateProduct }) {
  return (
    <div className="grid gap-10 mb-14 ol-detail-grid" style={{ gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)" }}>
      <div>
        <h3 className="font-display text-[24px] tracking-tight mt-0 mb-3.5">Why we love it</h3>
        <p className="text-[17px] leading-relaxed text-[#3A3D52] m-0 mb-5 max-w-[680px]" style={{ textWrap: "pretty" }}>
          {p.summary} Our editors spent two weeks with this one before adding it to the edit — durability tested, price tracked, and compared against four similar finds.
        </p>
        <div className="border-l-[3px] border-ol-accent pl-4 my-6 max-w-[600px]">
          <p className="font-display italic text-[18px] leading-snug text-ol-ink m-0">
            &ldquo;The kind of buy where you wonder how you lived without it. Not flashy, just genuinely good.&rdquo;
          </p>
          <div className="mt-2.5 text-[13px] text-ol-muted">— Asha N., OrderLink curator</div>
        </div>
      </div>
      <div className="bg-white border border-ol-deep/10 rounded-ol p-6">
        <h4 className="font-display text-[18px] m-0 mb-4 tracking-tight">Highlights</h4>
        <ul className="list-none p-0 m-0 flex flex-col gap-3">
          {p.highlights.map(h => (
            <li key={h} className="flex gap-3 text-[14px] leading-snug">
              <span className="flex-shrink-0 text-ol-accent mt-px"><Icon name="check" size={16} stroke={2.4}/></span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
        {p.colors && p.colors.length > 0 && (
          <>
            <div className="h-px bg-ol-deep/10 my-5"/>
            <div className="text-[13px] font-semibold mb-2.5">Available in</div>
            <div className="flex gap-2">
              {p.colors.map((c, i) => (
                <span key={i} title={c} className="w-7 h-7 rounded-full border border-ol-deep/15" style={{ background: c }}/>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SpecsBody({ p }: { p: AffiliateProduct }) {
  return (
    <div className="mb-14 max-w-[720px]">
      <h3 className="font-display text-[24px] tracking-tight mt-0 mb-4">Specs</h3>
      <div className="bg-white border border-ol-deep/10 rounded-ol overflow-hidden">
        {p.specs.map(([k, v], i) => (
          <div key={k} className={`flex justify-between px-5 py-3.5 text-[14px] ${i ? "border-t border-ol-deep/[0.06]" : ""}`}>
            <span className="text-ol-muted">{k}</span>
            <span className="font-semibold">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsBody({ p }: { p: AffiliateProduct }) {
  const dist = { 5: 72, 4: 18, 3: 6, 2: 3, 1: 1 } as const;
  return (
    <div className="grid gap-10 mb-14 ol-detail-grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)" }}>
      <div className="bg-white border border-ol-deep/10 rounded-ol p-7 self-start">
        <div className="font-display font-bold text-[56px] tracking-tight leading-none">{p.rating}</div>
        <Stars value={p.rating} size={18}/>
        <div className="text-[14px] text-ol-muted mt-2">Based on {p.reviewCount.toLocaleString("en-IN")} verified reviews</div>
        <div className="mt-5 flex flex-col gap-2">
          {[5, 4, 3, 2, 1].map(s => {
            const pct = dist[s as keyof typeof dist];
            return (
              <div key={s} className="flex items-center gap-2.5 text-[12px]">
                <span className="w-3">{s}</span>
                <Icon name="star" size={11}/>
                <div className="flex-1 h-1.5 bg-ol-soft rounded-full overflow-hidden">
                  <div className="h-full bg-ol-accent" style={{ width: `${pct}%` }}/>
                </div>
                <span className="w-8 text-right text-ol-muted">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {p.reviews.map((r, i) => (
          <div key={i} className="bg-white border border-ol-deep/10 rounded-ol p-5">
            <div className="flex justify-between items-center mb-2.5">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full bg-ol-deep text-white inline-flex items-center justify-center font-bold text-[14px]">{r.name[0]}</span>
                <div>
                  <div className="font-semibold text-[14px]">{r.name}</div>
                  <div className="text-[12px] text-ol-muted">{r.date}</div>
                </div>
              </div>
              <Stars value={r.rating} size={14}/>
            </div>
            <h4 className="m-0 mt-2 mb-1.5 font-display text-[16px] tracking-tight">{r.title}</h4>
            <p className="m-0 text-[14px] leading-relaxed text-[#3A3D52]">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
