"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { MerchantLogo } from "./MerchantLogo";
import { formatRupees } from "@/lib/format";
import type { AffiliateProduct, Merchant } from "@/data/affiliate-products";

const COUNTDOWN_SECONDS = 4;

export function RedirectInterstitial({
  product, merchant,
}: { product: AffiliateProduct; merchant: Merchant }) {
  const isPlaceholder = /PLACEHOLDER/i.test(merchant.affiliateUrl);
  const [count, setCount] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (isPlaceholder) return;
    const id = setInterval(() => {
      setCount(c => {
        const next = c - 1;
        if (next <= 0) {
          clearInterval(id);
          window.location.assign(merchant.affiliateUrl);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchant.affiliateUrl, isPlaceholder]);

  return (
    <div className="fixed inset-0 z-[200] bg-ol-deep/60 backdrop-blur-md flex items-center justify-center p-5 animate-ol-fade">
      <div className="bg-white rounded-[22px] px-9 py-10 max-w-[460px] w-full text-center relative shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)]">
        <Link href={`/p/${product.slug}`} aria-label="Back to product"
          className="absolute top-3.5 right-3.5 inline-flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10 text-ol-ink">
          <Icon name="close" size={16}/>
        </Link>

        <div className="w-20 h-20 rounded-full mx-auto mb-5 bg-ol-soft flex items-center justify-center relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.images[0]} alt="" width={56} height={56} className="rounded-full object-cover"/>
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] text-ol-accent flex items-center justify-center">
            <Icon name="arrow-right" size={14} stroke={2.4}/>
          </span>
        </div>

        <h2 className="font-display font-bold text-[28px] tracking-tight m-0 mb-2" style={{ textWrap: "balance" }}>
          {isPlaceholder ? "Link not yet available" : "Off you go!"}
        </h2>
        <p className="text-[15px] text-ol-muted m-0 mb-6 leading-snug">
          {isPlaceholder ? (
            <>This affiliate link hasn&apos;t been set up yet. We&apos;ll get it sorted soon.</>
          ) : (
            <>We&apos;re sending you to <MerchantLogo id={merchant.id} height={18}/> to complete your purchase. You&apos;ll land on the exact product page.</>
          )}
        </p>

        {!isPlaceholder && (
          <>
            <div className="bg-ol-soft rounded-[14px] p-4 mb-6 flex justify-between items-center gap-3 flex-wrap text-left">
              <div>
                <div className="text-[12px] text-ol-muted mb-0.5">Confirmed price</div>
                <div className="font-display font-bold text-[24px] tracking-tight">{formatRupees(merchant.price)}</div>
              </div>
              <div className="text-right text-[12px] text-ol-muted">
                <div><Icon name="truck" size={11}/> {merchant.eta}</div>
                <div className="mt-0.5">{merchant.stock}</div>
              </div>
            </div>

            <a
              href={merchant.affiliateUrl}
              className="block w-full text-center bg-ol-accent hover:bg-ol-accent/90 text-white font-semibold text-[14px] py-3.5 rounded-full"
            >
              {count > 0 ? <>Redirecting in {count}s&hellip;</> : <>Take me there</>}
            </a>
          </>
        )}

        <Link href={`/p/${product.slug}`}
          className="block bg-transparent border-0 text-ol-muted text-[13px] mt-3.5 underline">
          Stay on OrderLink
        </Link>

        <div className="mt-5 text-[11px] text-ol-muted leading-snug">
          OrderLink earns a small commission on qualifying purchases. <br/>The price you pay does not change.
        </div>
      </div>
    </div>
  );
}
