"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Info, X, Users, ChevronRight, Sparkles } from "lucide-react";

export function CommunityInfoModal() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside or escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="About Ollypedia Community"
        aria-expanded={isOpen}
        className="w-5 h-5 rounded-full bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 flex items-center justify-center transition-all cursor-pointer text-gray-400 hover:text-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        <Info className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 sm:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal / Tooltip card */}
          <div className="fixed sm:absolute inset-x-4 top-1/2 -translate-y-1/2 sm:translate-y-0 sm:inset-auto sm:left-0 sm:top-full sm:mt-2 z-50 sm:w-80 max-w-sm mx-auto sm:mx-0">
            <div className="bg-[#181818] border border-orange-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-white leading-tight">Ollypedia Community</p>
                    <p className="text-[10px] text-orange-400 font-semibold">Fan Voting &amp; Discussion Hub</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Description */}
              <p className="text-[11px] sm:text-xs text-zinc-300 leading-relaxed mb-3">
                The official hub for Odia cinema fans. Vote on movies using the{" "}
                <strong className="text-orange-400 font-bold">Ollypedia Meter</strong>, join live discussion rooms, share audience reviews, and connect with thousands of Ollywood enthusiasts.
              </p>

              {/* Meter options breakdown */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-2.5 mb-3">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-orange-400" />
                  Ollypedia Meter Ratings
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { emoji: "🩷", label: "Skip", desc: "Not recommended" },
                    { emoji: "🟡", label: "Timepass", desc: "One-time watch" },
                    { emoji: "🟢", label: "Go for it", desc: "Good movie" },
                    { emoji: "🟣", label: "Perfection", desc: "Must watch masterpiece" },
                  ].map(({ emoji, label, desc }) => (
                    <div key={label} className="flex flex-col bg-white/5 border border-white/5 rounded-lg px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">{emoji}</span>
                        <span className="text-[11px] text-white font-bold">{label}</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA button */}
              <Link
                href="/discussion"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-2 bg-orange-500 hover:bg-orange-400 text-black font-black rounded-xl text-xs transition-colors shadow-lg shadow-orange-500/20"
              >
                <span>Explore Discussion Rooms</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default CommunityInfoModal;
