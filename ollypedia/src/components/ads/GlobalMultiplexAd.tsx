"use client";

import { useAdSense } from "@/hooks/useAdSense";

export function GlobalMultiplexAd() {
  const { adLoaded, adUnfilled, insRef, pathname, isMounted } = useAdSense();

  return (
    <div className={`w-full max-w-[1200px] mx-auto px-4 sm:px-6 my-8 transition-all duration-700 ${adUnfilled ? "ad-unfilled" : ""}`}>
      <div className={`adsense-container w-full min-h-[100px] block rounded-xl border border-[#222] p-2 transition-all duration-700 ${adLoaded ? "bg-[#111111]" : "bg-transparent"}`} aria-hidden="true">
        {isMounted && (
          <ins key={pathname}
               ref={insRef}
               className="adsbygoogle w-full"
               style={{ display: "block" }}
               data-ad-client="ca-pub-5823659147566885"
               data-ad-slot="8191172163"
               data-ad-format="auto"
               data-full-width-responsive="true"></ins>
        )}
      </div>
    </div>
  );
}
