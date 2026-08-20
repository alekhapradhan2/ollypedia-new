"use client";

import React from "react";
import { Sparkles, TrendingUp, Users } from "lucide-react";
import { CommunityGuideButton } from "@/components/community/CommunityGuideButton";

export interface MeterCategoryData {
  count: number;
  percentage: number;
}

export interface MeterStats {
  totalVotes: number;
  skip: MeterCategoryData;
  timepass: MeterCategoryData;
  goForIt: MeterCategoryData;
  perfection: MeterCategoryData;
  userVote?: string | null;
  participantsCount?: number;
  threadsCount?: number;
  commentsCount?: number;
}

interface OllypediaMeterProps {
  stats: MeterStats;
  compact?: boolean;
  movieTitle?: string;
}

export function OllypediaMeter({ stats, compact = false, movieTitle }: OllypediaMeterProps) {
  const { totalVotes, skip, timepass, goForIt, perfection, userVote } = stats;

  const categories = [
    {
      key: "skip",
      label: "Skip",
      emoji: "🩷",
      color: "#f43f5e", // Rose / Pink
      glow: "rgba(244, 63, 94, 0.4)",
      bgLight: "bg-rose-500/10",
      border: "border-rose-500/30",
      text: "text-rose-400",
      data: skip || { count: 0, percentage: 0 },
    },
    {
      key: "timepass",
      label: "Timepass",
      emoji: "🟡",
      color: "#eab308", // Yellow / Amber
      glow: "rgba(234, 179, 8, 0.4)",
      bgLight: "bg-yellow-500/10",
      border: "border-yellow-500/30",
      text: "text-yellow-400",
      data: timepass || { count: 0, percentage: 0 },
    },
    {
      key: "go_for_it",
      label: "Go for it",
      emoji: "🟢",
      color: "#10b981", // Emerald / Green
      glow: "rgba(16, 185, 129, 0.4)",
      bgLight: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      data: goForIt || { count: 0, percentage: 0 },
    },
    {
      key: "perfection",
      label: "Perfection",
      emoji: "🟣",
      color: "#a855f7", // Purple / Violet
      glow: "rgba(168, 85, 247, 0.4)",
      bgLight: "bg-purple-500/10",
      border: "border-purple-500/30",
      text: "text-purple-400",
      data: perfection || { count: 0, percentage: 0 },
    },
  ];

  // Find dominant category
  let dominant = categories[2]; // default Go for it
  let maxCount = -1;
  categories.forEach((cat) => {
    if (cat.data.count > maxCount) {
      maxCount = cat.data.count;
      dominant = cat;
    }
  });

  const dominantPercentage =
    totalVotes > 0
      ? Math.round((dominant.data.count / totalVotes) * 100)
      : 0;

  // Semicircle gauge parameters
  const radius = 100;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle circumference

  // Calculate arc offsets for the 4 segments along the 180-degree semi-circle
  let accumulatedPct = 0;
  const segments = categories.map((cat) => {
    const pct = totalVotes > 0 ? cat.data.count / totalVotes : 0.25;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPct * circumference;
    accumulatedPct += pct;
    return {
      ...cat,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  if (compact) {
    return (
      <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner"
            style={{ backgroundColor: `${dominant.color}20`, border: `1px solid ${dominant.color}40`, color: dominant.color }}
          >
            {dominant.emoji}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-zinc-400">
                Ollypedia Meter
              </span>
              <span
                className="text-xs font-extrabold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${dominant.color}25`, color: dominant.color }}
              >
                {totalVotes > 0 ? `${dominantPercentage}% ${dominant.label}` : "No Votes Yet"}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {totalVotes.toLocaleString()} Total Votes
            </p>
          </div>
        </div>

        <div className="flex gap-1.5 items-center">
          {categories.map((c) => (
            <div
              key={c.key}
              title={`${c.label}: ${c.data.percentage}% (${c.data.count} votes)`}
              className="text-center"
            >
              <div
                className="w-8 h-1.5 rounded-full"
                style={{
                  backgroundColor: c.data.percentage > 0 ? c.color : "#2a2a2a",
                }}
              />
              <span className="text-[10px] text-zinc-400 font-medium block mt-1">
                {c.data.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="tour-meter" className="relative overflow-hidden bg-gradient-to-b from-[#161616] via-[#111111] to-[#0d0d0d] border border-white/10 rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl">
      {/* Background glow of leading sentiment */}
      <div
        className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: dominant.color }}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-4 mb-4 sm:mb-6 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-6 bg-gradient-to-b from-orange-400 to-amber-500 rounded-full" />
          <h2 className="text-base sm:text-lg font-black text-white tracking-wide uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-400" />
            Ollypedia Meter
          </h2>
          <CommunityGuideButton variant="icon" className="w-7 h-7 p-1 rounded-lg" />
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          <Users className="w-3.5 h-3.5 text-orange-400" />
          <span>{totalVotes.toLocaleString()} Community Votes</span>
        </div>
      </div>

      {/* Main Meter Grid: Gauge on left, Breakdowns on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Semi-Circular SVG Gauge */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-64 h-36 sm:w-72 sm:h-40 flex items-end justify-center">
            <svg
              viewBox="0 0 240 135"
              className="w-full h-full overflow-visible"
            >
              {/* Background Track */}
              <path
                d="M 20 120 A 100 100 0 0 1 220 120"
                fill="none"
                stroke="#222222"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />

              {/* Dynamic colored segments */}
              {totalVotes > 0 &&
                segments.map((seg) => (
                  <path
                    key={seg.key}
                    d="M 20 120 A 100 100 0 0 1 220 120"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    className="transition-all duration-1000 ease-out"
                    style={{
                      filter:
                        dominant.key === seg.key
                          ? `drop-shadow(0 0 8px ${seg.color})`
                          : "none",
                    }}
                  />
                ))}
            </svg>

            {/* Inner Stats Text inside Gauge */}
            <div className="absolute bottom-1 flex flex-col items-center text-center">
              <span className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-md">
                {totalVotes > 0 ? `${dominantPercentage}%` : "0%"}
              </span>
              <span
                className="text-xs sm:text-sm font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mt-0.5"
                style={{
                  color: dominant.color,
                  backgroundColor: `${dominant.color}20`,
                  border: `1px solid ${dominant.color}40`,
                }}
              >
                {totalVotes > 0 ? `${dominant.emoji} ${dominant.label}` : "No Votes Yet"}
              </span>
            </div>
          </div>

          <div className="mt-3 text-center">
            <p className="text-xs font-semibold text-zinc-400">
              {totalVotes > 0
                ? `${dominant.data.count.toLocaleString()} of ${totalVotes.toLocaleString()} viewers say "${dominant.label}"`
                : "Be the first to rate this movie!"}
            </p>
          </div>
        </div>

        {/* 4 Category Breakdown Cards */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-3 sm:gap-3.5">
          {categories.map((cat) => {
            const isUserVote = userVote === cat.key;
            return (
              <div
                key={cat.key}
                className={`relative overflow-hidden p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 ${
                  isUserVote
                    ? "bg-white/10 border-orange-500/60 ring-2 ring-orange-500/20 shadow-lg"
                    : "bg-[#161616]/80 hover:bg-[#1c1c1c] border-white/5 hover:border-white/15"
                }`}
              >
                {/* Progress bar background fill */}
                <div
                  className="absolute left-0 bottom-0 top-0 opacity-15 transition-all duration-700"
                  style={{
                    width: `${cat.data.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />

                <div className="relative z-10 flex items-center justify-between gap-1 mb-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base flex-shrink-0">{cat.emoji}</span>
                    <span className="text-xs font-bold text-white tracking-tight truncate">
                      {cat.label}
                    </span>
                  </div>
                  {isUserVote && (
                    <span className="flex-shrink-0 whitespace-nowrap text-[9px] uppercase font-black tracking-wider px-1.5 py-0.5 bg-gradient-to-r from-orange-500 to-amber-500 text-black rounded-md shadow-sm flex items-center gap-0.5">
                      <span>✓</span>
                      <span>You</span>
                    </span>
                  )}
                </div>

                <div className="relative z-10 flex items-baseline justify-between mt-2">
                  <span
                    className="text-xl sm:text-2xl font-black tracking-tight"
                    style={{ color: cat.color }}
                  >
                    {cat.data.percentage}%
                  </span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    {cat.data.count.toLocaleString()} votes
                  </span>
                </div>

                {/* Progress Bar line */}
                <div className="relative z-10 w-full h-1.5 bg-black/40 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${cat.data.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
