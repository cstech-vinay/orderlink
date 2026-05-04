import type { MerchantId } from "@/data/affiliate-products";

const MERCHANTS: Record<MerchantId, { txt: string; bg: string }> = {
  amazon: { txt: "amazon", bg: "#FF9900" },
  myntra: { txt: "myntra", bg: "#FF3F6C" },
  nykaa:  { txt: "nykaa",  bg: "#FC2779" },
};

export function MerchantLogo({ id, height = 18 }: { id: MerchantId; height?: number }) {
  const m = MERCHANTS[id];
  return (
    <span
      className="inline-flex items-center font-display font-extrabold tracking-tight text-white rounded-md"
      style={{
        height,
        padding: "0 8px",
        background: m.bg,
        fontSize: height * 0.6,
      }}
    >
      {m.txt}
    </span>
  );
}
