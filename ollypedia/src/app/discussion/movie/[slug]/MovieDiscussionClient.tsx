"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  MessageSquare,
  Vote,
  Users,
  Flame,
  Clock,
  ArrowRight,
  Film,
  Music2,
  Clapperboard,
  Tv,
  TrendingUp,
  Share2,
} from "lucide-react";
import { OllypediaMeter, MeterStats } from "@/components/community/OllypediaMeter";
import { VoteSelector } from "@/components/community/VoteSelector";
import { DiscussionThreadCard, ThreadData } from "@/components/community/DiscussionThreadCard";
import { CreateThreadBox } from "@/components/community/CreateThreadBox";
import { useCommunityAuth } from "@/context/CommunityAuthContext";

interface MovieDiscussionClientProps {
  movie: {
    _id: string;
    title: string;
    slug: string;
    posterUrl?: string;
    thumbnailUrl?: string;
    bannerUrl?: string;
    releaseDate?: string;
    language?: string;
    genre?: string[];
    synopsis?: string;
    verdict?: string;
    runtime?: string;
    hasSongs?: boolean;
    hasTrailers?: boolean;
    hasOtt?: boolean;
    hasBoxOffice?: boolean;
  };
  initialMeter: MeterStats;
  initialThreads: ThreadData[];
}

const SORT_TABS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "latest", label: "Latest", icon: Clock },
  { id: "popular", label: "Most Liked", icon: Sparkles },
  { id: "most_commented", label: "Most Active", icon: MessageSquare },
];

export default function MovieDiscussionClient({
  movie,
  initialMeter,
  initialThreads,
}: MovieDiscussionClientProps) {
  const { user } = useCommunityAuth();
  const [meter, setMeter] = useState<MeterStats>(initialMeter);
  const [threads, setThreads] = useState<ThreadData[]>(initialThreads);
  const [activeSort, setActiveSort] = useState("trending");
  const [loadingThreads, setLoadingThreads] = useState(false);

  const fetchMeterAndUserVote = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/movies/${movie.slug || movie._id}/meter`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.meter) {
          setMeter(data.meter);
        }
      }
    } catch (err) {
      console.error("Error fetching live meter:", err);
    }
  }, [movie.slug, movie._id]);

  useEffect(() => {
    fetchMeterAndUserVote();
  }, [fetchMeterAndUserVote, user]);

  const fetchSortedThreads = useCallback(async (sortType: string) => {
    setLoadingThreads(true);
    try {
      const res = await fetch(
        `/api/community/movies/${movie.slug || movie._id}/threads?sort=${sortType}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.threads) {
          setThreads(data.threads);
        }
      }
    } catch (err) {
      console.error("Error fetching sorted threads:", err);
    } finally {
      setLoadingThreads(false);
    }
  }, [movie.slug, movie._id]);

  const handleSortChange = (sortId: string) => {
    setActiveSort(sortId);
    fetchSortedThreads(sortId);
  };

  const handleVoteUpdated = (newMeter: any) => {
    setMeter(newMeter);
  };

  const handleThreadCreated = (newThread: ThreadData) => {
    setThreads((prev) => [newThread, ...prev]);
    setMeter((prev) => ({
      ...prev,
      threadsCount: (prev.threadsCount || 0) + 1,
    }));
  };

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : "";
  const genres = (movie.genre || []).join(", ");
  const poster = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Movie Context Banner & Sitelinks Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#181818] via-[#141414] to-[#0f0f0f] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Poster */}
          <Link
            href={`/movie/${movie.slug || movie._id}`}
            className="relative w-24 sm:w-28 aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-900 border border-white/15 flex-shrink-0 shadow-lg group"
          >
            <Image
              src={poster}
              alt={movie.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-zinc-400 mb-1.5">
              <span className="text-orange-400 font-bold uppercase tracking-wider">
                Live Discussion Room
              </span>
              {year && <span>• {year}</span>}
              <span>• {movie.language || "Odia"}</span>
              {genres && <span>• {genres}</span>}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {movie.title}
            </h1>

            {movie.synopsis && (
              <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-3xl line-clamp-2 mt-2">
                {movie.synopsis}
              </p>
            )}

            {/* Sitelinks Strip */}
            <div className="flex items-center gap-2 flex-wrap mt-4 pt-4 border-t border-white/5">
              <Link
                href={`/movie/${movie.slug || movie._id}`}
                className="px-3 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Film className="w-3.5 h-3.5" />
                <span>View Full Movie Details</span>
              </Link>

              {movie.hasTrailers && (
                <Link
                  href={`/trailers/${movie.slug || movie._id}`}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Clapperboard className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Trailers</span>
                </Link>
              )}

              {movie.hasSongs && (
                <Link
                  href={`/songs/${movie.slug || movie._id}`}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Music2 className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Songs</span>
                </Link>
              )}

              {movie.hasBoxOffice && (
                <Link
                  href={`/box-office/${movie.slug || movie._id}`}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Box Office</span>
                </Link>
              )}

              {movie.hasOtt && (
                <Link
                  href={`/ott/${movie.slug || movie._id}`}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-all flex items-center gap-1.5"
                >
                  <Tv className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Where to Watch</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── TOP SECTION: OLLYPEDIA METER & VOTE SELECTOR ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 items-start">
        {/* Ollypedia Meter Display */}
        <div className="lg:col-span-7">
          <OllypediaMeter stats={meter} movieTitle={movie.title} />
        </div>

        {/* Interactive Vote Selector */}
        <div className="lg:col-span-5">
          <VoteSelector
            movieSlug={movie.slug || movie._id}
            movieTitle={movie.title}
            currentVote={meter.userVote}
            onVoteUpdated={handleVoteUpdated}
          />
        </div>
      </div>

      {/* ── COMMUNITY METRICS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#141414] border border-white/10 rounded-2xl p-4 sm:p-5 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-white">
              {meter.totalVotes.toLocaleString()}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
              Total Meter Votes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-white">
              {meter.threadsCount || 0}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
              Discussions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-white">
              {meter.commentsCount || 0}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
              Comments & Replies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg sm:text-xl font-black text-white">
              {(meter.participantsCount || 0) + (meter.threadsCount || 0)}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
              Active Fans
            </p>
          </div>
        </div>
      </div>

      {/* ── CREATE THREAD BOX ── */}
      <div className="mb-10">
        <CreateThreadBox
          movieId={movie._id}
          movieSlug={movie.slug || movie._id}
          movieTitle={movie.title}
          onThreadCreated={handleThreadCreated}
        />
      </div>

      {/* ── DISCUSSION THREADS LIST ── */}
      <div className="space-y-6">
        {/* Discussion Section Header & Sort Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-orange-400" />
              Movie Discussions ({threads.length})
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Read community opinions, ask questions, and share thoughts on {movie.title}.
            </p>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 bg-[#141414] p-1 rounded-2xl border border-white/10 overflow-x-auto scrollbar-none">
            {SORT_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSortChange(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeSort === tab.id
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Thread Cards */}
        {loadingThreads ? (
          <div className="space-y-4 py-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 bg-zinc-800/40 rounded-3xl animate-pulse"
              />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-16 bg-[#141414] rounded-3xl border border-dashed border-white/10">
            <MessageSquare className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">No discussions yet</h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 mb-5">
              Be the first to start a discussion about {movie.title}!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {threads.map((thread) => (
              <DiscussionThreadCard
                key={thread._id}
                thread={thread}
                movieSlug={movie.slug || movie._id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
