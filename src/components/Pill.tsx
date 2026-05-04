import { Icon } from "./Icon";
import type { ComponentProps } from "react";

type Tone = "default" | "accent" | "dark" | "success";

const TONES: Record<Tone, string> = {
  default: "bg-ol-soft text-ol-ink",
  accent:  "bg-ol-accent/15 text-ol-accent",
  dark:    "bg-ol-deep text-white",
  success: "bg-emerald-50 text-ol-success",
};

export function Pill({
  children, tone = "default", icon,
}: {
  children: React.ReactNode;
  tone?: Tone;
  icon?: ComponentProps<typeof Icon>["name"];
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px] font-semibold tracking-wide rounded-full ${TONES[tone]}`}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
