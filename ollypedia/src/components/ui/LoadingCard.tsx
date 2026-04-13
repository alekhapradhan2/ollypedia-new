"use client";
// components/ui/LoadingCard.tsx
// Universal card wrapper — identical loader to CastCardLink:
//   gold outline + blur dim + spinning ring + shimmer sweep
//
// Drop-in for ANY page. Just wrap any card:
//   <LoadingCard href="/movie/xyz">
//     <MovieCard ... />
//   </LoadingCard>

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LoadingCardProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  borderRadius?: number; // default 10, match your card's border-radius
}

export function LoadingCard({
  href,
  children,
  className,
  style,
  borderRadius = 10,
}: LoadingCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Reset on back-button (same pattern as CastCardLink)
  useEffect(() => {
    const reset = () => setLoading(false);
    window.addEventListener("popstate", reset);
    return () => window.removeEventListener("popstate", reset);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (loading) return; // prevent double-nav
    setLoading(true);
    router.push(href);
    // Safety reset after 6 s for slow connections
    setTimeout(() => setLoading(false), 6000);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        position: "relative",
        display: "block",
        textDecoration: "none",
        borderRadius,
        outline: loading ? "2px solid rgba(201,151,58,.7)" : "2px solid transparent",
        transition: "outline-color .15s",
      }}
    >
      {children}

      {loading && (
        <>
          {/* Blurred dim */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 20,
            borderRadius,
            background: "rgba(0,0,0,.45)",
            backdropFilter: "blur(2px)",
          }} />

          {/* Spinning ring — centred */}
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
              animation: "lc-spin .6s linear infinite",
            }} />
          </div>

          {/* Shimmer sweep */}
          <div style={{
            position: "absolute",
            inset: 0,
            zIndex: 19,
            borderRadius,
            overflow: "hidden",
            pointerEvents: "none",
          }}>
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, transparent 0%, rgba(201,151,58,.07) 50%, transparent 100%)",
              backgroundSize: "200% 100%",
              animation: "lc-shimmer 1.1s ease infinite",
            }} />
          </div>
        </>
      )}

      <style>{`
        @keyframes lc-spin    { to { transform: rotate(360deg); } }
        @keyframes lc-shimmer {
          0%   { background-position:  200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </a>
  );
}