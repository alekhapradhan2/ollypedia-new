"use client";

// components/home/DidYouKnow.tsx

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Lightbulb, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

export type TriviaCard = {
  fact:   string;
  source: string;
  href:   string;
  emoji:  string;
};

export default function DidYouKnow({ cards }: { cards: TriviaCard[] }) {
  const [idx,     setIdx]     = useState(0);
  const [visible, setVisible] = useState(true);
  const [paused,  setPaused]  = useState(false);

  const goTo = useCallback((next: number) => {
    setVisible(false);
    setTimeout(() => {
      setIdx((next + cards.length) % cards.length);
      setVisible(true);
    }, 250);
  }, [cards.length]);

  const prev = () => { setPaused(true); goTo(idx - 1); };
  const next = () => { setPaused(true); goTo(idx + 1); };

  // Auto-cycle every 6 s unless user has clicked a nav button
  useEffect(() => {
    if (paused || cards.length <= 1) return;
    const t = setInterval(() => goTo(idx + 1), 6000);
    return () => clearInterval(t);
  }, [idx, paused, cards.length, goTo]);

  if (cards.length === 0) return null;

  const card = cards[idx];

  return (
    <div className="bg-gradient-to-br from-indigo-900/10 via-[#0f0f0f] to-[#0b0b0b]
      border border-indigo-500/15 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 sm:px-8 pt-5 pb-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-indigo-400" />
          <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">Did You Know?</span>
        </div>
        {/* Dot indicators */}
        {cards.length > 1 && (
          <div className="flex items-center gap-1">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setPaused(true); goTo(i); }}
                className={`rounded-full transition-all duration-300
                  ${i === idx
                    ? "w-4 h-1.5 bg-indigo-400"
                    : "w-1.5 h-1.5 bg-white/15 hover:bg-white/30"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="px-5 sm:px-8 py-6 min-h-[120px] flex flex-col justify-between">
        <div
          className={`transition-all duration-250
            ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          {/* Emoji + fact */}
          <div className="flex gap-3 items-start mb-4">
            <span className="text-2xl flex-shrink-0 mt-0.5">{card.emoji}</span>
            <p className="text-sm sm:text-base text-gray-200 leading-relaxed font-medium">
              {card.fact}
            </p>
          </div>

          {/* Source link */}
          <Link
            href={card.href}
            className="inline-flex items-center gap-1.5 text-[11px] text-indigo-400/70
              hover:text-indigo-400 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            {card.source}
          </Link>
        </div>
      </div>

      {/* Footer nav */}
      {cards.length > 1 && (
        <div className="px-5 sm:px-8 py-3 border-t border-[#1a1a1a] flex items-center justify-between">
          <span className="text-[10px] text-gray-700">
            {idx + 1} / {cards.length} facts
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={prev}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center
                border border-white/10 hover:border-white/20 transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-gray-400" />
            </button>
            <button
              onClick={next}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center
                border border-white/10 hover:border-white/20 transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}