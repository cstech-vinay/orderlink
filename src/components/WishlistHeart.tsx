"use client";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { isWishlisted, toggleWishlist } from "@/lib/wishlist";

export function WishlistHeart({ productId, className = "" }: { productId: string; className?: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isWishlisted(productId));
    const onChange = () => setActive(isWishlisted(productId));
    window.addEventListener("ol-wishlist-change", onChange);
    return () => window.removeEventListener("ol-wishlist-change", onChange);
  }, [productId]);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(productId);
        }
      }}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/90 hover:bg-white hover:scale-110 backdrop-blur-sm border border-ol-deep/5 cursor-pointer transition-all ${active ? "text-ol-accent" : "text-ol-ink"} ${className}`}
    >
      <Icon name="heart" size={14} />
    </span>
  );
}
