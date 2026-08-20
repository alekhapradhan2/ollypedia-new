"use client";

import React from "react";
import { useAdSense } from "@/hooks/useAdSense";

export function InFeedMovieCardAd({ className = "" }: { className?: string }) {
  const { adLoaded, adUnfilled, insRef, pathname, isMounted } = useAdSense();

  if (adUnfilled) return null;

  return (
    <div
      className={`relative flex flex-col bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-md min-h-[300px] sm:min-h-[340px] transition-all duration-500 ${className} ${
        adLoaded ? "opacity-100" : "opacity-90"
      }`}
      aria-label="Sponsored Ad"
    >
      {/* Top micro badge */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between text-[9px] uppercase tracking-widest font-bold text-zinc-500 border-b border-white/5 bg-[#111]">
        <span>Sponsored</span>
        <span className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-400">Ad</span>
      </div>

      {/* Ad content slot */}
      <div className="flex-1 flex items-center justify-center p-2 overflow-hidden w-full">
        {isMounted && (
          <ins
            key={pathname}
            ref={insRef}
            className="adsbygoogle w-full h-full block"
            style={{ display: "block", minHeight: "260px" }}
            data-ad-format="fluid"
            data-ad-layout-key="-6t+ed+2i-1n-4w"
            data-ad-client="ca-pub-5823659147566885"
            data-ad-slot="3815666049"
          ></ins>
        )}
      </div>
    </div>
  );
}

export default InFeedMovieCardAd;
