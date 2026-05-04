import type { ButtonHTMLAttributes } from "react";

type Variant = "card" | "overlay";

const VARIANTS: Record<Variant, string> = {
  card:
    "w-[38px] h-[38px] rounded-[10px] bg-ol-deep/5 hover:bg-ol-deep/10 border border-ol-deep/10 text-ol-ink transition-colors",
  overlay:
    "w-[32px] h-[32px] rounded-full bg-white/90 hover:bg-white hover:scale-110 backdrop-blur-sm border border-ol-deep/5 text-ol-ink transition-all",
};

export function IconButton({
  variant = "card", className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center cursor-pointer ${VARIANTS[variant]} ${className}`}
    />
  );
}
