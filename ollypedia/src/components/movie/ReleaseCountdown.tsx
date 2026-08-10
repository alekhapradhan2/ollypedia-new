"use client";
// components/movie/ReleaseCountdown.tsx
// Drop-in countdown for Upcoming movies. Works purely client-side.
// Usage: <ReleaseCountdown releaseDate={movie.releaseDate} title={movie.title} />

import { useEffect, useState } from "react";

interface Props {
  releaseDate: string; // ISO date string e.g. "2025-08-15"
  title?: string;
}

function calcTimeLeft(releaseDate: string) {
  const diff = new Date(releaseDate).getTime() - Date.now();
  if (diff <= 0) return null; // already released
  const days    = Math.floor(diff / 86_400_000);
  const hours   = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000)  / 60_000);
  return { days, hours, minutes };
}

export function ReleaseCountdown({ releaseDate, title }: Props) {
  const [timeLeft, setTimeLeft] = useState<ReturnType<typeof calcTimeLeft>>(null);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeLeft(calcTimeLeft(releaseDate));
    const id = setInterval(() => setTimeLeft(calcTimeLeft(releaseDate)), 60_000);
    return () => clearInterval(id);
  }, [releaseDate]);

  // Don't render anything server-side (avoids hydration mismatch)
  if (!mounted) return null;
  // Already released — show nothing (parent shows verdict badge instead)
  if (!timeLeft) return null;

  const { days, hours, minutes } = timeLeft;

  return (
    <div className="flex items-center justify-between sm:justify-start gap-3 mt-3 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl border border-sky-500/25 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-transparent w-full sm:w-fit shadow-sm shadow-sky-950/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base sm:text-lg flex-shrink-0">🎬</span>
        <p className="text-[10px] sm:text-[11px] text-sky-300/80 font-semibold uppercase tracking-wider truncate">
          {title ? `${title} releases in` : "Releasing in"}
        </p>
      </div>
      <div className="flex items-baseline gap-1.5 sm:gap-2 flex-shrink-0 bg-sky-950/50 border border-sky-500/20 rounded-lg px-2.5 py-1">
        {days > 0 && (
          <span className="text-sky-300 font-black text-sm sm:text-base leading-none">
            {days}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">d</span>
          </span>
        )}
        <span className="text-sky-300 font-black text-sm sm:text-base leading-none">
          {hours}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">h</span>
        </span>
        <span className="text-sky-300 font-black text-sm sm:text-base leading-none">
          {minutes}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">m</span>
        </span>
      </div>
    </div>
  );
}
