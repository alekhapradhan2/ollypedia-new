"use client";

import React from "react";
import { HelpCircle, Sparkles, Info } from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

interface CommunityGuideButtonProps {
  variant?: "pill" | "icon" | "button";
  className?: string;
}

export function CommunityGuideButton({
  variant = "pill",
  className = "",
}: CommunityGuideButtonProps) {
  const { openTour } = useCommunityAuth();

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={openTour}
        title="How Ollypedia Meter & Discussion Works"
        aria-label="How it works"
        className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-all hover:scale-105 active:scale-95 ${className}`}
      >
        <Info className="w-4 h-4 text-orange-400" />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={openTour}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all shadow-sm active:scale-95 ${className}`}
      >
        <HelpCircle className="w-4 h-4" />
        <span>How Meter Works</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openTour}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition-all hover:border-orange-500/40 shadow-sm active:scale-95 ${className}`}
    >
      <Info className="w-3.5 h-3.5 text-orange-400" />
      <span>How it Works</span>
    </button>
  );
}

export default CommunityGuideButton;
