"use client";

import { useAdSense } from "@/hooks/useAdSense";

export function GlobalMultiplexAd() {
  const { adLoaded, adUnfilled, insRef, pathname, isMounted } = useAdSense();

  // If AdSense explicitly says it couldn't fill the ad, hide the content visually to remove gap layout issues without causing CLS
  return (
    <div className={`w-full max-w-[1200px] min-h-[300px] mx-auto px-5 transition-all duration-700 my-10 ${adUnfilled ? "ad-unfilled" : ""}`}>
      {/* Title space is always reserved to prevent CLS. Opacity fades in when loaded. */}
      <div 
        className={`transition-opacity duration-700 ease-in-out mb-4 ${
          adLoaded ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="text-[0.75rem] text-white/40 uppercase tracking-[1px] block">
          Recommended for you
        </span>
      </div>
      
      {/* AdSense tag remains in DOM flow so AdSense can calculate available width. */}
      <div>
        {isMounted && (
          <ins key={pathname}
               ref={insRef}
               className="adsbygoogle w-full"
               style={{ display: "block" }}
               data-ad-format="autorelaxed"
               data-ad-client="ca-pub-5823659147566885"
               data-ad-slot="3548072735"></ins>
        )}
      </div>
    </div>
  );
}
