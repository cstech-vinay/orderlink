import { Icon } from "./Icon";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Icon>["name"];

function TrustItem({ icon, label, sub }: { icon: IconName; label: string; sub: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-9 h-9 rounded-[10px] bg-ol-soft inline-flex items-center justify-center text-ol-deep">
        <Icon name={icon} size={16}/>
      </span>
      <div>
        <div className="font-bold text-[13px]">{label}</div>
        <div className="text-[12px] text-ol-muted">{sub}</div>
      </div>
    </div>
  );
}

export function TrustStrip() {
  return (
    <div className="flex gap-[18px] pt-[18px] border-t border-ol-deep/10 flex-wrap">
      <TrustItem icon="shield"  label="Hand-tested"   sub="By our editors"/>
      <TrustItem icon="tag"     label="Price-checked" sub="Across 3 sites"/>
      <TrustItem icon="sparkle" label="Curated weekly" sub="47 new this week"/>
    </div>
  );
}
