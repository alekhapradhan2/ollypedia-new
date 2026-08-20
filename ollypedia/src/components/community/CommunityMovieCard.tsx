"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, Sparkles, Flame, Users } from "lucide-react";
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
  perfection: { label: "Perfection", emoji: "🟣", bg: "bg-purple-500/20 border-purple-500/40", text: "text-purple-300" },
  go_for_it: { label: "Go for it", emoji: "🟢", bg: "bg-emerald-500/20 border-emerald-500/40", text: "text-emerald-300" },
  timepass: { label: "Timepass", emoji: "🟡", bg: "bg-yellow-500/20 border-yellow-500/40", text: "text-yellow-300" },
  skip: { label: "Skip", emoji: "🩷", bg: "bg-rose-500/20 border-rose-500/40", text: "text-rose-300" },
};

export function CommunityMovieCard({ movie }: CommunityMovieCardProps) {
  const fullDate = movie.releaseTBA
    ? "TBA"
    : formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short");
  const genres = (movie.genre || []).slice(0, 2).join(", ");
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

  return (
    <Link
      href={`/discussion/movie/${movie.slug || movie._id}`}
      className="group relative flex flex-col bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-orange-500/50 rounded-2xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1"
    >
      {/* Poster image container */}
      <div className="relative w-full aspect-[2/3] overflow-hidden bg-zinc-900">
        <Image
          src={poster}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1 pointer-events-none z-10">
          {isUnreleased ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold border border-orange-500/30 bg-black/80 backdrop-blur-md text-orange-400 whitespace-nowrap shadow-md flex-shrink-0">
              <Users className="w-3 h-3 text-orange-400 flex-shrink-0" />
              <span>{(movie.interestedYes || 0) > 0 ? `${(movie.interestedYes || 0).toLocaleString("en-IN")} Interested` : "Interested"}</span>
            </span>
          ) : hasVotes ? (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black border backdrop-blur-md shadow-md whitespace-nowrap flex-shrink-0 ${topCat.bg} ${topCat.text}`}
            >
              <span>{topCat.emoji}</span>
              <span>{movie.community.topPercentage}%</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-white/10 bg-black/80 backdrop-blur-md text-zinc-300 whitespace-nowrap shadow-md flex-shrink-0">
              <Sparkles className="w-2.5 h-2.5 text-orange-400 flex-shrink-0" />
              <span>Meter</span>
            </span>
          )}

          {movie.verdict && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider bg-black/80 backdrop-blur-md text-orange-400 border border-orange-500/30 whitespace-nowrap flex-shrink-0">
              {movie.verdict}
            </span>
          )}
        </div>

        {/* Bottom Discussion Count Pill on Poster */}
        {totalDiscussions > 0 && (
          <div className="absolute bottom-2 left-2 pointer-events-none z-10">
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-black/80 backdrop-blur-md text-white border border-white/10 flex items-center gap-1">
              <MessageSquare className="w-2.5 h-2.5 text-orange-400" />
              <span>{totalDiscussions}</span>
            </span>
          </div>
        )}

        {/* Gradient Shadow */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#141414] to-transparent pointer-events-none" />
      </div>

      {/* Card Body */}
      <div className="p-3 sm:p-3.5 flex flex-col flex-1">
        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1 mb-1">
          {movie.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium text-zinc-400 truncate mt-auto">
          {fullDate && <span className="text-zinc-300 font-semibold">{fullDate}</span>}
          {fullDate && <span>•</span>}
          <span>{movie.language || "Odia"}</span>
          {genres && <span>•</span>}
          {genres && <span className="truncate">{genres}</span>}
        </div>
      </div>
    </Link>
  );
}

export default CommunityMovieCard;
