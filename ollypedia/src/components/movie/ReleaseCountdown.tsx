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
    <div className="flex items-center gap-3 mt-3 px-4 py-3 rounded-xl border border-sky-500/30 bg-sky-500/8 w-fit">
      <span className="text-lg">🎬</span>
      <div>
        <p className="text-[9px] text-sky-400/70 uppercase tracking-widest leading-none mb-1">
          {title ? `${title} releases in` : "Releasing in"}
        </p>
        <div className="flex items-baseline gap-2">
          {days > 0 && (
            <span className="text-sky-300 font-black text-base leading-none">
              {days}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">d</span>
            </span>
          )}
          <span className="text-sky-300 font-black text-base leading-none">
            {hours}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">h</span>
          </span>
          <span className="text-sky-300 font-black text-base leading-none">
            {minutes}<span className="text-sky-400/60 text-[10px] font-normal ml-0.5">m</span>
          </span>
        </div>
      </div>
    </div>
  );
}
