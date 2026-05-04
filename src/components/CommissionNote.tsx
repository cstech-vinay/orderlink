import { Icon } from "./Icon";

export function CommissionNote() {
  return (
    <div className="bg-orange-50 border border-dashed border-ol-accent/30 rounded-xl px-3.5 py-3 text-[12px] text-[#5A3B2C] flex gap-2.5 items-start mb-4 leading-snug">
      <Icon name="shield" size={14}/>
      <span>
        OrderLink may earn a small commission when you buy via our links — at no extra cost to you. It helps us keep curating.
      </span>
    </div>
  );
}
