"use client";
import Image from "next/image";
import { useState } from "react";

type Img = { src: string; alt: string; width: number; height: number };

export function ProductGallery({ images }: { images: Img[] }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-cream-deep rounded-lg flex items-center justify-center font-display italic text-ink-soft/40 text-6xl">
        &#9734;
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square bg-cream-deep rounded-lg overflow-hidden">
        <Image
          src={images[active].src}
          alt={images[active].alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                idx === active ? "border-coral" : "border-transparent hover:border-[color:var(--rule-strong)]"
              }`}
              onClick={() => setActive(idx)}
              aria-label={`View image ${idx + 1}`}
              aria-pressed={idx === active}
            >
              <Image src={img.src} alt={img.alt} fill sizes="120px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
