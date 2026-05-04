import type { CategoryIcon } from "@/data/categories";

export function CategoryGlyph({ kind, size = 28 }: { kind: CategoryIcon; size?: number }) {
  const c = "currentColor";
  const s = { width: size, height: size };
  switch (kind) {
    case "tech":    return <svg {...s} viewBox="0 0 32 32" fill="none"><rect x="5" y="7" width="22" height="14" rx="2" stroke={c} strokeWidth="1.7"/><path d="M3 24h26M11 21v3M21 21v3" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "cloth":   return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M10 5l-5 4 3 4 2-1v14h12V12l2 1 3-4-5-4-3 2c-1 1-3 1-4 0l-3-2z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
    case "glossy":  return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M14 4h4v5h-4z" stroke={c} strokeWidth="1.7"/><rect x="10" y="9" width="12" height="19" rx="2" stroke={c} strokeWidth="1.7"/><path d="M13 14h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "home":    return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M4 14 16 4l12 10v13a1 1 0 0 1-1 1h-7v-9h-8v9H5a1 1 0 0 1-1-1V14z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
    case "kid":     return <svg {...s} viewBox="0 0 32 32" fill="none"><circle cx="16" cy="14" r="9" stroke={c} strokeWidth="1.7"/><circle cx="13" cy="13" r="1" fill={c}/><circle cx="19" cy="13" r="1" fill={c}/><path d="M12 17c1.5 1.5 6.5 1.5 8 0" stroke={c} strokeWidth="1.7" strokeLinecap="round"/><path d="M16 23v5M12 27h8" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "study":   return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M6 6h16a3 3 0 0 1 3 3v17H9a3 3 0 0 1-3-3V6z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/><path d="M6 23a3 3 0 0 1 3-3h16" stroke={c} strokeWidth="1.7"/><path d="M11 11h9M11 15h6" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "kitchen": return <svg {...s} viewBox="0 0 32 32" fill="none"><path d="M4 14h22v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-8z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/><path d="M26 16h4v5h-4M9 14V8a3 3 0 0 1 3-3M16 14V8M23 14V8" stroke={c} strokeWidth="1.7" strokeLinecap="round"/></svg>;
    case "gift":    return <svg {...s} viewBox="0 0 32 32" fill="none"><rect x="4" y="12" width="24" height="16" rx="2" stroke={c} strokeWidth="1.7"/><path d="M2 8h28v4H2zM16 8v20M16 8s-4-6-7-3 2 5 7 3zM16 8s4-6 7-3-2 5-7 3z" stroke={c} strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  }
}
