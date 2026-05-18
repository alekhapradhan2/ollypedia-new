"use client";

// components/home/RandomMoviePicker.tsx

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Shuffle, ExternalLink, RefreshCw, Sparkles } from "lucide-react";

export type PoolMovie = {
  _id:         string;
  slug:        string;
  title:       string;
  posterUrl:   string;
  releaseDate: string;
  verdict:     string;
  language:    string;
  genre:       string[];
  year:        number; // pre-computed on server
};

const VERDICT_COLOR: Record<string, string> = {
  Blockbuster:  "#22c55e",
  "Super Hit":  "#4ade80",
  Hit:          "#86efac",
  Average:      "#facc15",
  Flop:         "#f87171",
  Disaster:     "#ef4444",
};

function isValidVerdict(v: string) {
  return v && !["Upcoming", "Released", ""].includes(v);
}

// Weighted random — picks from priorityPool first (current+prev year),
// falls back to olderPool only when priority pool is exhausted or empty.
function weightedPick(
  all: PoolMovie[],
  exclude: string | null,
  currentYear: number
): { movie: PoolMovie; tier: "recent" | "older" } {
  const pool = exclude ? all.filter((m) => m._id !== exclude) : all;
  if (pool.length === 0) return { movie: all[0], tier: "recent" };

  const recent = pool.filter((m) => m.year >= currentYear - 1);
  const older  = pool.filter((m) => m.year < currentYear - 1);

  // 85% chance recent, 15% older (only if both have items)
  const useRecent = recent.length > 0 && (older.length === 0 || Math.random() < 0.85);
  const source    = useRecent ? recent : older;
  const movie     = source[Math.floor(Math.random() * source.length)];
  return { movie, tier: useRecent ? "recent" : "older" };
}

export default function RandomMoviePicker({
  movies,
  currentYear,
}: {
  movies: PoolMovie[];
  currentYear: number;
}) {
  const [picked,   setPicked]   = useState<PoolMovie | null>(null);
  const [tier,     setTier]     = useState<"recent" | "older">("recent");
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const pick = useCallback(() => {
    if (spinning || movies.length === 0) return;
    setSpinning(true);
    setRevealed(false);
    setPicked(null);

    setTimeout(() => {
      const { movie, tier: t } = weightedPick(movies, picked?._id ?? null, currentYear);
      setPicked(movie);
      setTier(t);
      setSpinning(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setRevealed(true)));
    }, 650);
  }, [movies, picked, spinning, currentYear]);

  const vc  = picked ? VERDICT_COLOR[picked.verdict] || null : null;
  const url = picked ? `/movie/${picked.slug || picked._id}` : "#";

  const recentCount = movies.filter((m) => m.year >= currentYear - 1).length;

  return (
    <div className="bg-gradient-to-br from-[#111] via-[#0f0f0f] to-[#0b0b0b]
      border border-[#1f1f1f] rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between
        gap-3 px-5 sm:px-8 pt-5 pb-4 border-b border-[#1a1a1a]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span className="text-orange-500 text-xs font-bold uppercase tracking-widest">Discover</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white leading-tight">Feeling Lucky?</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            We'll pick a random Odia film — recent ones get priority.
          </p>
        </div>

        <button
          onClick={pick}
          disabled={spinning}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm
            transition-all duration-200 flex-shrink-0 self-start sm:self-center
            ${spinning
              ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-wait"
              : "bg-orange-500 hover:bg-orange-400 active:scale-95 text-black shadow-lg shadow-orange-500/20"
            }`}
        >
          <RefreshCw className={`w-4 h-4 ${spinning ? "animate-spin" : ""}`} />
          {!picked ? "Pick a Movie" : "Pick Another"}
        </button>
      </div>

      {/* Result */}
      <div className="px-5 sm:px-8 py-5 min-h-[108px] flex items-center">

        {/* Idle state */}
        {!picked && !spinning && (
          <div className="w-full text-center py-3">
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-gray-600 text-sm">
              Priority: <span className="text-orange-500/70">{recentCount} recent films</span>
              <span className="text-gray-700"> · {movies.length} total</span>
            </p>
          </div>
        )}

        {/* Spinning */}
        {spinning && (
          <div className="w-full text-center py-3">
            <div className="inline-flex gap-1.5 items-center">
              {["🎬","🎭","🎥","🎞️","🍿"].map((e, i) => (
                <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 80}ms` }}>
                  {e}
                </span>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">Shuffling the reels…</p>
          </div>
        )}

        {/* Result card */}
        {picked && !spinning && (
          <div className={`w-full transition-all duration-500
            ${revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>

            {/* Tier badge */}
            <div className="mb-3 flex items-center gap-2">
              {tier === "recent" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest
                  text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  {picked.year >= currentYear ? `${currentYear} Release` : `${picked.year} Release`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest
                  text-gray-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
                  Classic pick · {picked.year}
                </span>
              )}
            </div>

            <div className="flex gap-4 items-start">
              {/* Poster */}
              <Link href={url} className="flex-shrink-0 group/poster">
                <div className="relative w-20 h-[110px] sm:w-24 sm:h-[132px] rounded-xl overflow-hidden
                  shadow-xl ring-1 ring-white/10 group-hover/poster:ring-orange-500/40 transition-all">
                  <Image
                    src={picked.posterUrl}
                    alt={picked.title}
                    fill
                    className="object-cover group-hover/poster:scale-105 transition-transform duration-300"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link href={url} className="group/title">
                  <h3 className="text-base sm:text-lg font-black text-white
                    group-hover/title:text-orange-400 transition-colors leading-snug line-clamp-2 mb-1">
                    {picked.title}
                  </h3>
                </Link>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-3">
                  {picked.year > 0 && (
                    <span className="text-xs text-gray-500">{picked.year}</span>
                  )}
                  {picked.language && (
                    <span className="text-xs text-gray-600">· {picked.language}</span>
                  )}
                  {picked.genre?.length > 0 && (
                    <span className="text-xs text-gray-600">· {picked.genre.join(", ")}</span>
                  )}
                </div>

                {isValidVerdict(picked.verdict) && vc && (
                  <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-3"
                    style={{ background: `${vc}18`, color: vc, border: `1px solid ${vc}40` }}>
                    {picked.verdict}
                  </span>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link href={url}
                    className="inline-flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400
                      text-black text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                    <ExternalLink className="w-3 h-3" /> View Movie
                  </Link>
                  <button onClick={pick}
                    className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10
                      text-gray-300 text-xs font-bold px-3 py-1.5 rounded-lg border border-white/10
                      hover:border-white/20 transition-all">
                    <Shuffle className="w-3 h-3" /> Try another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 sm:px-8 py-2 border-t border-[#1a1a1a] flex items-center justify-between">
        <span className="text-[10px] text-gray-700">
          {recentCount} recent · {movies.length - recentCount} older
        </span>
        <span className="text-[10px] text-gray-700">Ollypedia</span>
      </div>
    </div>
  );
}