"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { ReelSlide, type ReelHandle } from "./ReelSlide";
import type { AffiliateProduct } from "@/data/affiliate-products";

type Slide = { type: "img"; src: string } | { type: "reel" };

export function ProductGallery({ product }: { product: AffiliateProduct }) {
  const slides: Slide[] = [
    ...product.images.map(src => ({ type: "img" as const, src })),
    ...(product.reel ? [{ type: "reel" as const }] : []),
  ];
  const total = slides.length;
  const [idx, setIdx] = useState(0);
  const reelRef = useRef<ReelHandle | null>(null);
  const current = slides[idx] ?? slides[0];
  const isReel = current.type === "reel";

  /** Navigate to slide i, pausing the reel before unmount if we're leaving it. */
  const goToSlide = (i: number) => {
    // Pause synchronously before setState so the video element is still mounted.
    if (isReel && slides[i]?.type !== "reel") {
      reelRef.current?.pause();
    }
    setIdx(i);
  };

  return (
    <div className="ol-gallery flex gap-3.5 max-md:flex-col-reverse">
      {/* Thumbs */}
      <div className="ol-thumbs flex flex-col gap-2.5 flex-shrink-0 max-md:flex-row max-md:overflow-x-auto">
        {slides.map((s, i) => {
          const isActive = i === idx;
          if (s.type === "img") {
            return (
              <button
                key={`img-${i}`}
                type="button"
                data-testid="thumb"
                data-active={isActive}
                onClick={() => goToSlide(i)}
                className={`w-[70px] h-[70px] rounded-[10px] overflow-hidden p-0 border-2 cursor-pointer bg-ol-soft flex-shrink-0 ${isActive ? "border-ol-accent" : "border-transparent"}`}
              >
                <Image src={s.src} alt="" width={70} height={70} className="w-full h-full object-cover"/>
              </button>
            );
          }
          // reel thumb — data-testid="thumb" so it counts in the thumb strip;
          // a child span carries data-testid="reel-thumb" for reel-specific queries.
          return (
            <button
              key="reel-thumb"
              type="button"
              data-testid="thumb"
              data-active={isActive}
              onClick={() => goToSlide(i)}
              className={`relative w-[70px] h-[70px] rounded-[10px] overflow-hidden p-0 border-2 cursor-pointer bg-black flex-shrink-0 ${isActive ? "border-ol-accent" : "border-transparent"}`}
              aria-label="Play reel"
            >
              <span data-testid="reel-thumb" className="contents"/>
              <Image src={product.images[0]} alt="" width={70} height={70} className="w-full h-full object-cover opacity-70"/>
              <span className="absolute inset-0 flex items-center justify-center text-white" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </span>
              <span className="absolute top-1 left-1 text-[8px] font-extrabold tracking-wider text-white px-1.5 py-0.5 rounded uppercase"
                    style={{ background: "linear-gradient(135deg, #F58529, #DD2A7B, #515BD4)" }}>
                Reel
              </span>
            </button>
          );
        })}
      </div>

      {/* Main pane */}
      <div
        className={`flex-1 relative rounded-ol overflow-hidden ${isReel ? "bg-black" : "bg-ol-soft"}`}
        style={{ aspectRatio: isReel ? "9 / 14" : "4 / 5", transition: "aspect-ratio 0.3s" }}
      >
        {!isReel ? (
          <Image src={(current as { type: "img"; src: string }).src} alt="" fill sizes="(max-width: 880px) 100vw, 50vw" className="object-cover"/>
        ) : (
          product.reel && (
            <ReelSlide
              ref={reelRef}
              reel={product.reel}
              poster={product.images[0]}
              productTitle={product.title}
            />
          )
        )}

        {product.badge && !isReel && (
          <span className="absolute top-4 left-4 bg-ol-deep text-white text-[12px] font-bold px-3 py-1.5 rounded-full">
            {product.badge}
          </span>
        )}

        <IconButton
          aria-label="Previous slide"
          onClick={() => goToSlide((idx + total - 1) % total)}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 z-10"
        >
          <Icon name="arrow-left" size={16}/>
        </IconButton>
        <IconButton
          aria-label="Next slide"
          onClick={() => goToSlide((idx + 1) % total)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10"
        >
          <Icon name="arrow-right" size={16}/>
        </IconButton>

        <div className="absolute left-1/2 -translate-x-1/2 flex gap-1.5 z-10"
             style={{ bottom: isReel ? 76 : 14 }}>
          {slides.map((_, i) => (
            <span key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === idx ? 18 : 6,
                background: i === idx ? "#fff" : "rgba(255,255,255,0.5)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
