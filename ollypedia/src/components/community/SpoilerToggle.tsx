"use client";

import React, { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

interface SpoilerToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  activeLabel?: string;
  size?: "sm" | "md";
  id?: string;
}

export function SpoilerToggle({
  checked,
  onChange,
  disabled = false,
  label = "Mark as Movie Spoiler",
  activeLabel = "Contains Spoiler (Blur Protected)",
  size = "md",
  id,
}: SpoilerToggleProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="inline-flex items-center gap-1.5" id={id}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`group relative inline-flex items-center gap-2.5 rounded-xl border font-semibold select-none cursor-pointer transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
          size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3.5 py-1.5 text-xs"
        } ${
          checked
            ? "bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/10 ring-1 ring-amber-500/30"
            : "bg-[#1c1c1c] hover:bg-[#242424] border-white/10 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        {/* Animated Mini Toggle Switch */}
        <div
          className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out ${
            checked ? "bg-amber-500" : "bg-zinc-700"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[0.5px] ${
              checked ? "translate-x-3 bg-black" : "translate-x-0.5"
            }`}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <AlertTriangle
            className={`w-3.5 h-3.5 transition-colors ${
              checked ? "text-amber-400 fill-amber-400/20" : "text-zinc-500"
            }`}
          />
          <span className="tracking-tight">
            {checked ? activeLabel : label}
          </span>
        </div>
      </button>

      {/* Info Icon with Tooltip */}
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTooltip((prev) => !prev);
          }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label="Spoiler information"
          className="p-1 rounded-full text-zinc-500 hover:text-orange-400 hover:bg-white/5 transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {showTooltip && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-[#202020] border border-white/15 text-[11px] text-zinc-300 rounded-xl shadow-2xl z-50 leading-snug animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="flex items-center gap-1 font-bold text-amber-400 mb-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Spoiler Protection</span>
            </div>
            When enabled, your review or comment is blurred by default. Viewers must click to reveal it, protecting film twists.
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[#202020]" />
          </div>
        )}
      </div>
    </div>
  );
}

export default SpoilerToggle;
