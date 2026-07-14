"use client";

import { useEffect } from "react";

interface AdSenseUnitProps {
  adSlot: string;
  adClient?: string;
  className?: string;
}

export function AdSenseUnit({
  adSlot,
  adClient = "ca-pub-5823659147566885", // Default from user's AdSense code
  className = "",
}: AdSenseUnitProps) {
  useEffect(() => {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("AdSense error", err);
    }
  }, []);

  return (
    <div className={`w-full h-full ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
