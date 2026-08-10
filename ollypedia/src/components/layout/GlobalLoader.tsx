"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// ── Inner component: contains useSearchParams() ──────────────────────────────
// MUST be wrapped in <Suspense> by its parent to prevent
// BAILOUT_TO_CLIENT_SIDE_RENDERING during Next.js App Router SSR streaming.
// Any component that calls useSearchParams() without its own Suspense boundary
// causes the entire page to fall back to client-side rendering.
function GlobalLoaderInner({ onNavigate }: { onNavigate: () => void }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams(); // ← Suspense boundary required here

  useEffect(() => {
    onNavigate(); // navigation complete → hide loader
  }, [pathname, searchParams, onNavigate]);

  return null;
}

// ── Exported component ────────────────────────────────────────────────────────
export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);

  const hideLoader = () => setIsLoading(false);

  // Show loader on any internal link click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target || target.target === "_blank") return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const href = target.getAttribute("href");
      if (!href) return;

      try {
        const url = new URL(target.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash
        ) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          !url.hash
        ) return;

        setIsLoading(true);
      } catch {
        // Silently ignore URL parsing errors
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return (
    <>
      {/* GlobalLoaderInner detects navigation complete via useSearchParams.
          Wrapped in Suspense to prevent page-level CSR bailout. */}
      <Suspense fallback={null}>
        <GlobalLoaderInner onNavigate={hideLoader} />
      </Suspense>

      {isLoading && (
        <div className="fixed inset-0 z-[999999] bg-[#050505]/80 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="w-16 h-16 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-[spin_1s_ease-in-out_infinite]" />
              <div className="absolute w-8 h-8 border-4 border-orange-500/10 border-b-orange-400 rounded-full animate-[spin_1.5s_linear_infinite_reverse]" />
            </div>
            <p className="text-orange-400 font-medium tracking-widest uppercase text-sm animate-pulse">
              Loading...
            </p>
          </div>
        </div>
      )}
    </>
  );
}
