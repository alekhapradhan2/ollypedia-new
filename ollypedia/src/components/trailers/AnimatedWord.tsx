"use client";

import { useEffect, useState } from "react";

const WORDS = ["Trailers", "Teasers", "Glimpses", "First Looks"];

// 3-phase animation: exit (slide up + fade) → instant swap → enter (slide up from below + fade)
// Only ONE word is ever in the DOM → zero overlap possible.
type Phase = "visible" | "exiting" | "entering";

function useWordCycle(intervalMs = 2800) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("visible");

  useEffect(() => {
    const id = setInterval(() => {
      // Phase 1: slide current word up & fade out
      setPhase("exiting");

      // Phase 2: after exit finishes → swap text, place new word below (no transition)
      const t1 = setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setPhase("entering"); // instant: opacity 0, translateY(+10px), no transition

        // Phase 3: one double-RAF to let browser commit "entering" styles, then animate in
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPhase("visible");
          });
        });
      }, 350);

      return () => clearTimeout(t1);
    }, intervalMs);

    return () => clearInterval(id);
  }, [intervalMs]);

  return { index, phase };
}

// ─── Hero version ─────────────────────────────────────────────────────────────
// Gradient orange text, same size as the surrounding h1.
export function AnimatedWord() {
  const { index, phase } = useWordCycle();

  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        transition: phase === "entering" ? "none" : "opacity 300ms ease, transform 300ms ease",
        opacity:   phase === "exiting" ? 0 : phase === "entering" ? 0 : 1,
        transform: phase === "exiting" ? "translateY(-10px)" : phase === "entering" ? "translateY(10px)" : "translateY(0)",
        background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
      }}
    >
      {WORDS[index]}
    </span>
  );
}

// ─── Section header version ───────────────────────────────────────────────────
// Plain white text, inherits font size from the parent h2.
export function AnimatedWordSection() {
  const { index, phase } = useWordCycle(2800);

  return (
    <span
      style={{
        display: "inline-block",
        whiteSpace: "nowrap",
        transition: phase === "entering" ? "none" : "opacity 300ms ease, transform 300ms ease",
        opacity:   phase === "exiting" ? 0 : phase === "entering" ? 0 : 1,
        transform: phase === "exiting" ? "translateY(-10px)" : phase === "entering" ? "translateY(10px)" : "translateY(0)",
      }}
    >
      {WORDS[index]}
    </span>
  );
}
