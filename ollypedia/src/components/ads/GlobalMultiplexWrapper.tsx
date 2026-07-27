"use client";

import { usePathname } from "next/navigation";
import { GlobalMultiplexAd } from "./GlobalMultiplexAd";

export function GlobalMultiplexWrapper() {
  const pathname = usePathname();

  // Do not render ads on non-content pages (AdSense Policy Compliance)
  const blacklistedRoutes = ["/privacy", "/contact", "/terms-and-conditions", "/disclaimer"];
  const isBlacklisted = blacklistedRoutes.some(route => pathname?.startsWith(route));

  if (isBlacklisted) {
    return null;
  }

  return <GlobalMultiplexAd />;
}
