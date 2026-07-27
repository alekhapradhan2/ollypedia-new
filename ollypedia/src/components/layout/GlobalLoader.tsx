"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function GlobalLoader() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Reset loader when navigation completes
  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest anchor tag
      const target = (e.target as HTMLElement).closest("a");
      
      // Ignore if no anchor, or if it opens in a new tab
      if (!target || target.target === "_blank") return;
      
      // Ignore if holding modifier keys (which opens in a new tab)
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      
      const href = target.getAttribute("href");
      if (!href) return;

      try {
        const url = new URL(target.href);
        // Ignore external links
        if (url.origin !== window.location.origin) return;
        // Ignore hash links on the same page
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
        // Ignore same page clicks (e.g. clicking the current active link)
        if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) return;
        
        // Show loader instantly!
        setIsLoading(true);
      } catch (err) {
        // Silently ignore URL parsing errors
      }
    };

    // Use capture phase to ensure we catch it before any e.stopPropagation()
    document.addEventListener("click", handleClick, true);
    
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  if (!isLoading) return null;

  return (
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
  );
}
