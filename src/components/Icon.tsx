type IconName =
  | "search" | "menu" | "heart" | "arrow-right" | "arrow-left"
  | "star" | "check" | "truck" | "shield" | "external"
  | "sparkle" | "filter" | "close" | "chevron-right" | "tag"
  | "play";

type IconProps = {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
};

export function Icon({ name, size = 20, stroke = 1.6, className }: IconProps) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24",
    fill: "none", stroke: "currentColor",
    strokeWidth: stroke, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
    className,
  };
  switch (name) {
    case "search":        return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "menu":          return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case "heart":         return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
    case "arrow-right":   return <svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case "arrow-left":    return <svg {...props}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "star":          return <svg {...props} fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
    case "check":         return <svg {...props}><path d="M20 6 9 17l-5-5"/></svg>;
    case "truck":         return <svg {...props}><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>;
    case "shield":        return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "external":      return <svg {...props}><path d="M15 3h6v6M10 14 21 3M21 14v7H3V3h7"/></svg>;
    case "sparkle":       return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case "filter":        return <svg {...props}><path d="M3 4h18M6 12h12M10 20h4"/></svg>;
    case "close":         return <svg {...props}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "chevron-right": return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "tag":           return <svg {...props}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/></svg>;
    case "play":          return <svg {...props} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
  }
}
