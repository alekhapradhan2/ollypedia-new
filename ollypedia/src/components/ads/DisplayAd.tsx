"use client";

import { useAdSense } from "@/hooks/useAdSense";

export function DisplayAd({ 
  slot, 
  format = "auto", 
  className = "" 
}: { 
  slot: string; 
  format?: string; 
  className?: string; 
}) {
  const { adLoaded, adUnfilled, insRef, pathname } = useAdSense();

  return (
    <div className={`adsense-container w-full min-h-[250px] overflow-hidden flex items-center justify-center transition-all duration-700 ${className} ${adLoaded ? "bg-[#111111]" : "bg-transparent"} ${adUnfilled ? "ad-unfilled" : ""}`} aria-hidden="true">
      <ins key={pathname}
           ref={insRef}
           className="adsbygoogle w-full"
           style={{ display: "block" }}
           data-ad-client="ca-pub-5823659147566885"
           data-ad-slot={slot}
           data-ad-format={format}
           data-full-width-responsive="true"></ins>
    </div>
  );
}
