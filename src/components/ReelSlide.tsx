"use client";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "./Icon";
import type { Reel } from "@/data/affiliate-products";

export type ReelHandle = {
  pause: () => void;
};

type Props = {
  reel: Reel;
  poster?: string;
  productTitle: string;
};

export const ReelSlide = forwardRef<ReelHandle, Props>(function ReelSlide(
  { reel, poster, productTitle }, ref
) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useImperativeHandle(ref, () => ({
    pause: () => {
      const v = videoRef.current;
      if (v && !v.paused) v.pause();
      setPlaying(false);
    },
  }), []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const caption = reel.caption ?? `Hands-on with the ${productTitle.split(" ").slice(0, 5).join(" ")} ✨`;
  const audioLabel = reel.audioLabel ?? "Original audio · 1:24";
  const likes = reel.likes ?? "12.4K";
  const comments = reel.comments ?? "482";

  return (
    <div onClick={togglePlay} className="relative w-full h-full cursor-pointer">
      <video
        ref={videoRef}
        src={reel.src}
        poster={reel.poster ?? poster}
        muted={muted}
        playsInline
        loop
        preload="metadata"
        className="w-full h-full object-cover block"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 22%, transparent 55%, rgba(0,0,0,0.75) 100%)" }}
      />

      {/* IG header */}
      <div className="absolute top-3.5 left-3.5 right-14 flex items-center gap-2.5 text-white pointer-events-none">
        <span className="w-[30px] h-[30px] rounded-full inline-flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#FEDA77,#F58529,#DD2A7B,#8134AF,#515BD4)" }}>
          <span className="w-[26px] h-[26px] rounded-full bg-black inline-flex items-center justify-center text-[11px] font-bold">OL</span>
        </span>
        <div className="min-w-0" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
          <div className="text-[13px] font-bold">orderlink</div>
          <div className="text-[10px] opacity-85">{audioLabel}</div>
        </div>
      </div>

      {/* Caption */}
      <div className="absolute left-3.5 right-14 bottom-4 text-white pointer-events-none" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
        <div className="text-[12px] leading-snug opacity-95">{caption}</div>
      </div>

      {/* Side actions */}
      <div className="absolute right-2.5 bottom-4 flex flex-col gap-3.5 text-white">
        {[
          { icon: "heart" as const,  label: likes },
          { icon: "comment" as const, label: comments },
          { icon: "share" as const,   label: "Share" },
        ].map(a => (
          <div key={a.label} className="flex flex-col items-center gap-0.5 text-[10px] font-semibold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>
            <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md inline-flex items-center justify-center">
              {a.icon === "heart"   && <Icon name="heart" size={15}/>}
              {a.icon === "comment" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              )}
              {a.icon === "share" && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                </svg>
              )}
            </span>
            <span>{a.label}</span>
          </div>
        ))}
      </div>

      {/* Mute */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-3.5 right-3.5 w-[30px] h-[30px] rounded-full bg-black/55 text-white backdrop-blur-md inline-flex items-center justify-center"
      >
        {muted ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/>
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 5 6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/>
          </svg>
        )}
      </button>

      {/* Big play */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="w-[68px] h-[68px] rounded-full bg-white/95 inline-flex items-center justify-center shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-ol-deep)" stroke="none">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </span>
        </div>
      )}
    </div>
  );
});
