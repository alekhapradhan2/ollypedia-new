"use client";

import React, { useState } from "react";
import { AlertTriangle, Eye } from "lucide-react";

interface SpoilerContentProps {
  children: React.ReactNode;
  hasSpoiler?: boolean;
  previewText?: string;
}

export function SpoilerContent({
  children,
  hasSpoiler = true,
  previewText,
}: SpoilerContentProps) {
  const [revealed, setRevealed] = useState(!hasSpoiler);

  if (!hasSpoiler || revealed) {
    return <div className="animate-in fade-in duration-300">{children}</div>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 my-2 text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>Contains Movie Spoilers</span>
        </div>
        {previewText && (
          <p className="text-xs text-zinc-500 line-clamp-1 italic max-w-md">
            &ldquo;{previewText}&rdquo;
          </p>
        )}
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wide shadow-md transition-all active:scale-95"
        >
          <Eye className="w-3.5 h-3.5" />
          Reveal Spoiler
        </button>
      </div>
    </div>
  );
}
