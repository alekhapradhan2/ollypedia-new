"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function useAdSense() {
  const pathname = usePathname();
  const [adLoaded, setAdLoaded] = useState(false);
  const [adUnfilled, setAdUnfilled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const insRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setAdLoaded(false);
    setAdUnfilled(false);
    
    // Use a DOM attribute to track whether this specific element has been pushed to AdSense.
    // This perfectly prevents race conditions where React Strict Mode or Fast Refresh 
    // runs useEffect twice but the DOM node is the same.
    if (insRef.current && !insRef.current.hasAttribute("data-pushed")) {
      try {
        insRef.current.setAttribute("data-pushed", "true");
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense initialization error", e);
      }
    }
  }, [pathname]);

  useEffect(() => {
    const el = insRef.current;
    if (!el) return;

    const checkStatus = () => {
      const status = el.getAttribute('data-ad-status');
      if (status === 'filled') {
        setAdLoaded(true);
      } else if (status === 'unfilled') {
        setAdUnfilled(true);
      }
    };

    checkStatus();

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-ad-status') {
          checkStatus();
        }
      }
    });

    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });

    return () => observer.disconnect();
  }, [pathname]);

  return { adLoaded, adUnfilled, insRef, pathname, isMounted };
}
