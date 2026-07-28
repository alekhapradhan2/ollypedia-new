"use client";

import { useAdSense } from "@/hooks/useAdSense";

export function InFeedAd({ className = "" }: { className?: string }) {
  const { adLoaded, adUnfilled, insRef, pathname, isMounted } = useAdSense();

  return (
    <div className={`w-full h-full min-h-[250px] overflow-hidden block rounded-xl transition-all duration-700 ${className} ${adLoaded ? "bg-[#111111] border border-[#222]" : "bg-transparent"} ${adUnfilled ? "ad-unfilled" : ""}`}>
      {isMounted && (
        <ins key={pathname}
             ref={insRef}
             className="adsbygoogle w-full"
             style={{ display: "block", minWidth: "250px" }}
             data-ad-format="fluid"
             data-ad-layout-key="-6t+ed+2i-1n-4w"
             data-ad-client="ca-pub-5823659147566885"
             data-ad-slot="3815666049"></ins>
      )}
    </div>
  );
}
