"use client";
// components/cast/CastCardLink.tsx
// Instant click feedback: gold outline + skeleton shimmer overlay.
// Prevents double-navigation. Resets on back-button.

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CastCardLink({
  href,
  children,
  style,
}: {
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const router   = useRouter();
  const [loading, setLoading] = useState(false);

  // Reset if user presses back button
  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    router.push(href);
    // Safety reset after 6 s (slow connections)
    setTimeout(() => setLoading(false), 6000);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      style={{
        ...style,
        position: "relative",
        display: "block",
        textDecoration: "none",
        borderRadius: 10,
        outline: loading ? "2px solid rgba(201,151,58,.7)" : "2px solid transparent",
        transition: "outline-color .15s",
      }}
    >
      {children}

      {/* ── Loading overlay ──────────────────────────────── */}
      {loading && (
        <>
          {/* Blurred dim */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            borderRadius: 10,
            background: "rgba(0,0,0,.45)",
            backdropFilter: "blur(2px)",
          }} />

          {/* Spinning ring centred */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 21,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "3px solid rgba(201,151,58,.25)",
              borderTopColor: "#c9973a",
              animation: "ccl-spin .6s linear infinite",
            }} />
          </div>

          {/* Skeleton shimmer that sweeps over the card */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 19,
            borderRadius: 10,
            overflow: "hidden",
            pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(201,151,58,.07) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "ccl-shimmer 1.1s ease infinite",
            }} />
          </div>
        </>
      )}

      <style>{`
        @keyframes ccl-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ccl-shimmer {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </a>
  );
}