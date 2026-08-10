"use client";

import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ── Inner component: contains useSearchParams() ──────────────────────────────
// Wrapped in <Suspense> below to prevent BAILOUT_TO_CLIENT_SIDE_RENDERING.
function ScrollToTopInner() {
  const pathname     = usePathname();
  const searchParams = useSearchParams(); // ← Suspense boundary required

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const timer = setTimeout(() => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}

// ── Exported component ────────────────────────────────────────────────────────
export function ScrollToTop() {
  return (
    <Suspense fallback={null}>
      <ScrollToTopInner />
    </Suspense>
  );
}
