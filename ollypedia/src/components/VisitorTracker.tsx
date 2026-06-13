"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function VisitorTracker() {
  const pathname = usePathname();
  const logged   = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (logged.current.has(pathname)) return;
    logged.current.add(pathname);

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page:     pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      }),
    }).catch(() => {});
  }, [pathname]);

  return null;
}