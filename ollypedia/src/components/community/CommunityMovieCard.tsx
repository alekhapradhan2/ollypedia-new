"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Sparkles, Users } from "lucide-react";
import { formatReleaseDate } from "@/lib/dateUtils";

export interface CommunityMovieData {
  _id: string;
  title: string;
  slug: string;
  posterUrl?: string;
  thumbnailUrl?: string;
  releaseDate?: string;
  releaseDatePrecision?: string;
  releaseTBA?: boolean;
  interestedYes?: number;
  interestedNo?: number;
  status?: string;
  language?: string;
  genre?: string[];
  verdict?: string;
  community: {
    totalVotes: number;
    breakdown?: {
      skip: number;
      timepass: number;
      go_for_it: number;
      perfection: number;
    };
    topCategory: string;
    topPercentage: number;
    threadsCount: number;
    commentsCount: number;
    lastActivity?: string | null;
  };
}

interface CommunityMovieCardProps {
  movie: CommunityMovieData;
}

const CATEGORY_BADGES: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  perfection: { label: "Perfection", emoji: "🟣", bg: "bg-purple-500/25 border-purple-500/50", text: "text-purple-300" },
  go_for_it: { label: "Go for it", emoji: "🟢", bg: "bg-emerald-500/25 border-emerald-500/50", text: "text-emerald-300" },
  timepass: { label: "Timepass", emoji: "🟡", bg: "bg-yellow-500/25 border-yellow-500/50", text: "text-yellow-300" },
  skip: { label: "Skip", emoji: "🩷", bg: "bg-rose-500/25 border-rose-500/50", text: "text-rose-300" },
};

function getStatusBadge(verdict?: string, isUnreleased?: boolean) {
  if (isUnreleased || !verdict || verdict.toLowerCase() === "upcoming") {
    return {
      label: "UPCOMING",
      className: "bg-orange-500 text-black font-black shadow-md shadow-orange-500/30",
    };
  }
  const v = verdict.toLowerCase();
  if (v.includes("hit") || v.includes("blockbuster")) {
    return {
      label: verdict.toUpperCase(),
      className: "bg-emerald-500 text-black font-black shadow-md shadow-emerald-500/30",
    };
  }
  if (v.includes("flop")) {
    return {
      label: verdict.toUpperCase(),
      className: "bg-rose-500 text-white font-black shadow-md shadow-rose-500/30",
    };
  }
  if (v.includes("average")) {
    return {
      label: verdict.toUpperCase(),
      className: "bg-yellow-500 text-black font-black shadow-md shadow-yellow-500/30",
    };
  }
  return {
    label: verdict.toUpperCase() === "RELEASED" ? "RELEASED" : verdict.toUpperCase(),
    className: "bg-black/80 backdrop-blur-md text-orange-400 border border-orange-500/40 font-black shadow-md",
  };
}

export function CommunityMovieCard({ movie }: CommunityMovieCardProps) {
  const fullDate = movie.releaseTBA
    ? "TBA"
    : formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short");
  
  // Format genre string (up to 2 genres)
  const genres = Array.isArray(movie.genre) && movie.genre.length > 0
    ? movie.genre.slice(0, 2).join(", ")
    : "";

  const poster =
    movie.posterUrl ||
    movie.thumbnailUrl ||
    "/placeholder-movie.jpg";

  const dateStr = movie.releaseDate ? String(movie.releaseDate).trim() : "";
  const parsedTime = dateStr ? new Date(dateStr).getTime() : NaN;
  const isFutureDate = !isNaN(parsedTime) && parsedTime > Date.now();

  const isUnreleased =
    movie.verdict === "Upcoming" ||
    movie.status === "Upcoming" ||
    Boolean(movie.releaseTBA) ||
    dateStr.toUpperCase() === "TBA" ||
    isFutureDate;

  const hasVotes = movie.community.totalVotes > 0;
  const topCat = CATEGORY_BADGES[movie.community.topCategory] || CATEGORY_BADGES.go_for_it;
  const totalDiscussions = (movie.community.threadsCount || 0) + (movie.community.commentsCount || 0);
  const statusBadge = getStatusBadge(movie.verdict, isUnreleased);

  // Fallback for second item in card footer (Genre first, or language if genre is empty)
  const secondaryMeta = genres || (movie.language && movie.language !== "Odia" ? movie.language : "") || "Odia";

  return (
    <Link
      href={`/discussion/movie/${movie.slug || movie._id}`}
      className="group relative flex flex-col bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-orange-500/50 rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
    >
      {/* Poster image container */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900">
        <Image
          src={poster}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 33vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 right-1.5 sm:right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          {/* Status Badge (Upcoming / Released / Verdict) */}
          <span
            className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] tracking-wider whitespace-nowrap flex-shrink-0 ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>

          {/* Right Badge: Interested Count or Meter Rating */}
          {isUnreleased ? (
            (movie.interestedYes || 0) > 0 ? (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold border border-orange-500/30 bg-black/85 backdrop-blur-md text-orange-400 whitespace-nowrap shadow-md flex-shrink-0">
                <Users className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-orange-400 flex-shrink-0" />
                <span>{(movie.interestedYes || 0).toLocaleString("en-IN")}</span>
                <span className="hidden sm:inline">Interested</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold border border-white/10 bg-black/85 backdrop-blur-md text-zinc-400 whitespace-nowrap shadow-md flex-shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
                <span className="hidden sm:inline">Buzz</span>
              </span>
            )
          ) : hasVotes ? (
            <span
              className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-black border backdrop-blur-md shadow-md whitespace-nowrap flex-shrink-0 ${topCat.bg} ${topCat.text}`}
            >
              <span className="text-[9px] sm:text-[10px]">{topCat.emoji}</span>
              <span>{movie.community.topPercentage}%</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[8.5px] sm:text-[10px] font-bold border border-white/10 bg-black/85 backdrop-blur-md text-zinc-300 whitespace-nowrap shadow-md flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
              <span>Meter</span>
            </span>
          )}
        </div>

        {/* Bottom Discussion Count Pill on Poster */}
        {totalDiscussions > 0 && (
          <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 pointer-events-none z-10">
            <span className="px-1.5 sm:px-2 py-0.5 rounded-md sm:rounded-lg text-[8.5px] sm:text-[10px] font-bold bg-black/85 backdrop-blur-md text-white border border-white/10 flex items-center gap-1 shadow-md">
              <MessageSquare className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
              <span>{totalDiscussions}</span>
            </span>
          </div>
        )}

        {/* Gradient Shadow */}
        <div className="absolute inset-x-0 bottom-0 h-14 sm:h-16 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
      </div>

      {/* Card Body */}
      <div className="p-2 sm:p-3 flex flex-col flex-1 min-w-0">
        <h3 className="text-[11px] sm:text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1 mb-0.5 sm:mb-1">
          {movie.title}
        </h3>

        {/* Release Date • Genre */}
        <div className="flex items-center gap-1.5 text-[9px] sm:text-[11px] text-zinc-400 mt-auto min-w-0">
          {fullDate && (
            <span className="text-zinc-300 font-semibold flex-shrink-0">
              {fullDate}
            </span>
          )}
          {fullDate && secondaryMeta && (
            <span className="text-zinc-600 flex-shrink-0">•</span>
          )}
          <span className="text-zinc-400 font-medium truncate">
            {secondaryMeta}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default CommunityMovieCard;
