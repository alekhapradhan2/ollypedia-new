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
  Send,
  Heart,
  CornerDownRight,
  Flag,
  AlertTriangle,
  LogIn,
} from "lucide-react";
import { OllypediaMeter, MeterStats } from "@/components/community/OllypediaMeter";
import { VoteSelector } from "@/components/community/VoteSelector";
import { DiscussionThreadCard, ThreadData } from "@/components/community/DiscussionThreadCard";
import { CreateThreadBox } from "@/components/community/CreateThreadBox";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { SpoilerToggle } from "@/components/community/SpoilerToggle";
import { CommunityGuideButton } from "@/components/community/CommunityGuideButton";
import { MoviePageSpotlightTour } from "@/components/community/MoviePageSpotlightTour";
import { ReportModal } from "@/components/community/ReportModal";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { VoteButtons } from "@/components/ui/VoteButtons";
import toast from "react-hot-toast";

export interface MovieDiscussionClientProps {
  movie: {
    _id: string;
    title: string;
    slug: string;
    posterUrl?: string;
    thumbnailUrl?: string;
    bannerUrl?: string;
    releaseDate?: string;
    releaseTBA?: boolean;
    interestedYes?: number;
    interestedNo?: number;
    status?: string;
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

const THREAD_SORT_TABS = [
  { id: "trending", label: "Trending", icon: Flame },
  { id: "latest", label: "Latest", icon: Clock },
  { id: "popular", label: "Most Liked", icon: Sparkles },
  { id: "most_commented", label: "Most Active", icon: MessageSquare },
];

function timeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffDay > 30) return past.toLocaleDateString();
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHr > 0) return `${diffHr}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return "Just now";
}

export function MovieDiscussionClient({
  movie,
  initialMeter,
  initialThreads,
}: MovieDiscussionClientProps) {
  const { user, openAuthModal } = useCommunityAuth();

  const [meter, setMeter] = useState<MeterStats>(initialMeter);
  const [activeView, setActiveView] = useState<"comments" | "threads">("comments");

  // Threads State
  const [threads, setThreads] = useState<ThreadData[]>(initialThreads);
  const [activeThreadSort, setActiveThreadSort] = useState("trending");
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [threadsPage, setThreadsPage] = useState(1);
  const [hasMoreThreads, setHasMoreThreads] = useState(initialThreads.length >= 15);

  // Direct Movie Comments State
  const [movieComments, setMovieComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSort, setCommentSort] = useState<"top" | "newest" | "oldest">("top");
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentSpoiler, setNewCommentSpoiler] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // In-line reply state for direct comments
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);

  // Moderation report modal
  const [reportModalData, setReportModalData] = useState<{
    isOpen: boolean;
    id: string;
    type: "comment" | "thread";
    title?: string;
  }>({
    isOpen: false,
    id: "",
    type: "comment",
  });

  const movieSlug = movie.slug || movie._id;
  const poster = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;

  const dateStr = movie.releaseDate ? String(movie.releaseDate).trim() : "";
  const parsedTime = dateStr ? new Date(dateStr).getTime() : NaN;
  const isFutureDate = !isNaN(parsedTime) && parsedTime > Date.now();

  const isUnreleased =
    movie.verdict === "Upcoming" ||
    movie.status === "Upcoming" ||
    Boolean(movie.releaseTBA) ||
    dateStr.toUpperCase() === "TBA" ||
    isFutureDate;

  // Refresh Meter stats dynamically
  const fetchMeterStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/community/movies/${movieSlug}/meter`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMeter(data.meter);
        }
      }
    } catch (err) {
      console.error("Error refreshing meter:", err);
    }
  }, [movieSlug]);

  // Fetch Direct Movie Comments
  const fetchMovieComments = useCallback(async (sortKey = "top") => {
    setCommentsLoading(true);
    try {
      const res = await fetch(
        `/api/community/movies/${movieSlug}/comments?sort=${sortKey}`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.comments)) {
          setMovieComments(data.comments);
        }
      }
    } catch (err) {
      console.error("Failed to load direct comments:", err);
    } finally {
      setCommentsLoading(false);
    }
  }, [movieSlug]);

  // Load threads
  const fetchThreads = useCallback(
    async (sortKey: string, pageNum = 1, append = false) => {
      setLoadingThreads(true);
      try {
        const res = await fetch(
          `/api/community/movies/${movieSlug}/threads?sort=${sortKey}&page=${pageNum}&limit=15`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (append) {
              setThreads((prev) => [...prev, ...data.threads]);
            } else {
              setThreads(data.threads);
            }
            setHasMoreThreads(data.pagination.hasMore);
            setThreadsPage(pageNum);
          }
        }
      } catch (err) {
        console.error("Error loading threads:", err);
      } finally {
        setLoadingThreads(false);
      }
    },
    [movieSlug]
  );

  useEffect(() => {
    fetchMovieComments(commentSort);
  }, [commentSort, fetchMovieComments]);

  useEffect(() => {
    if (activeView === "threads" && activeThreadSort !== "trending") {
      fetchThreads(activeThreadSort, 1, false);
    }
  }, [activeView, activeThreadSort, fetchThreads]);

  const handleVoteSuccess = (updatedMeter: MeterStats) => {
    setMeter(updatedMeter);
  };

  const handleThreadCreated = (newThread: ThreadData) => {
    setThreads((prev) => [newThread, ...prev]);
    setActiveView("threads");
    setMeter((prev) => ({
      ...prev,
      threadsCount: (prev.threadsCount || 0) + 1,
    }));
  };

  // Submit direct comment
  const handlePostDirectComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!newCommentText.trim()) {
      toast.error("Please enter a comment.");
      return;
    }

    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/community/movies/${movieSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newCommentText.trim(),
          hasSpoiler: newCommentSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to post comment.");
        return;
      }

      toast.success("Comment posted!");
      setNewCommentText("");
      setNewCommentSpoiler(false);
      setMovieComments((prev) => [data.comment, ...prev]);
      setMeter((prev) => ({
        ...prev,
        commentsCount: (prev.commentsCount || 0) + 1,
      }));
    } catch {
      toast.error("Network error posting comment.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  // Submit direct comment reply
  const handlePostReply = async (parentCommentId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (!replyText.trim()) return;

    setReplySubmitting(true);
    try {
      const res = await fetch(`/api/community/movies/${movieSlug}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: replyText.trim(),
          parentCommentId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to reply.");
        return;
      }

      toast.success("Reply posted!");
      setReplyText("");
      setReplyingToId(null);

      // Add to UI
      setMovieComments((prev) =>
        prev.map((c) => {
          if (c._id === parentCommentId) {
            return {
              ...c,
              replyCount: (c.replyCount || 0) + 1,
              replies: [...(c.replies || []), data.comment],
            };
          }
          return c;
        })
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setReplySubmitting(false);
    }
  };

  // Like toggle for direct comments
  const handleToggleCommentLike = async (commentId: string) => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    try {
      const res = await fetch(`/api/community/comments/${commentId}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMovieComments((prev) =>
          prev.map((c) => {
            if (c._id === commentId) {
              return { ...c, isLiked: data.liked, likeCount: data.likeCount };
            }
            if (c.replies?.length) {
              return {
                ...c,
                replies: c.replies.map((r: any) =>
                  r._id === commentId
                    ? { ...r, isLiked: data.liked, likeCount: data.likeCount }
                    : r
                ),
              };
            }
            return c;
          })
        );
      }
    } catch {
      toast.error("Failed to update like.");
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">
      {/* ── Movie Hero Header with Backdrop ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#181818] via-[#141414] to-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start relative z-10">
          {/* Movie Poster */}
          <div className="relative w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/15 flex-shrink-0 bg-zinc-900 mx-auto md:mx-0">
            <Image
              src={poster}
              alt={movie.title}
              fill
              priority
              className="object-cover"
            />
          </div>

          {/* Movie Metadata & Quick Links */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap mb-2">
              <span className="px-3 py-1 bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Community &amp; Discussion
              </span>
              {year && (
                <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold rounded-full">
                  {year}
                </span>
              )}
              {movie.language && (
                <span className="px-2.5 py-0.5 bg-white/5 border border-white/10 text-zinc-300 text-xs font-semibold rounded-full">
                  {movie.language}
                </span>
              )}
              {movie.verdict && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                  {movie.verdict}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
              {movie.title}
            </h1>

            {movie.genre && movie.genre.length > 0 && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 mb-3">
                {movie.genre.map((g) => (
                  <span
                    key={g}
                    className="text-xs text-zinc-400 bg-[#1c1c1c] border border-white/5 px-2.5 py-0.5 rounded-lg font-medium"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {movie.synopsis && (
              <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 max-w-3xl leading-relaxed mb-4">
                {movie.synopsis}
              </p>
            )}

            {/* Quick Sitelinks */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2 border-t border-white/5">
              <Link
                href={`/movie/${movieSlug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all"
              >
                <Film className="w-3.5 h-3.5 text-orange-400" />
                <span>Movie Overview</span>
              </Link>

              {movie.hasBoxOffice && (
                <Link
                  href={`/box-office/${movieSlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Box Office</span>
                </Link>
              )}

              {movie.hasSongs && (
                <Link
                  href={`/songs/${movieSlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  <Music2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Songs</span>
                </Link>
              )}

              {movie.hasTrailers && (
                <Link
                  href={`/trailers/${movieSlug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition-all"
                >
                  <Tv className="w-3.5 h-3.5 text-purple-400" />
                  <span>Trailer</span>
                </Link>
              )}

              <CommunityGuideButton />
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Discussion Banner Ad ── */}
      <div className="w-full overflow-hidden mb-8">
        <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
      </div>

      {/* ── Ollypedia Meter OR Are You Interested (For unreleased films) ── */}
      {isUnreleased ? (
        <div id="tour-interested" className="bg-gradient-to-b from-[#181818] to-[#121212] border border-orange-500/20 rounded-3xl p-5 sm:p-8 mb-10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex-shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-xl font-bold text-white tracking-tight">
                    Are You Interested in {movie.title}?
                  </h2>
                  <CommunityGuideButton variant="pill" className="text-[11px] py-1 px-2.5" />
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 mt-0.5">
                  Audience meter ratings unlock once the film releases in theatres. Let us know if you&apos;re excited to watch it!
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-xl mx-auto pt-2">
            <VoteButtons
              movieId={movie._id}
              initialYes={movie.interestedYes || 0}
              initialNo={movie.interestedNo || 0}
              className="bg-[#141414] border-white/10"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          <div className="lg:col-span-6 flex flex-col justify-between">
            <OllypediaMeter stats={meter} movieTitle={movie.title} />
          </div>

          <div className="lg:col-span-6">
            <VoteSelector
              movieSlug={movieSlug}
              movieTitle={movie.title}
              currentVote={meter.userVote || null}
              onVoteSuccess={handleVoteSuccess}
            />
          </div>
        </div>
      )}

      {/* ── Unified Community Hub (Direct Comments + Threads) ── */}
      <div className="bg-[#111111] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Navigation Switcher Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-2 bg-[#181818] p-1.5 rounded-2xl border border-white/10 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveView("comments")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeView === "comments"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
                }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Direct Comments &amp; Chat ({movieComments.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView("threads")}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeView === "threads"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-md font-black"
                  : "text-zinc-400 hover:text-white"
                }`}
            >
              <Flame className="w-4 h-4" />
              <span>Discussion Topics &amp; Threads ({threads.length})</span>
            </button>
          </div>

          {activeView === "comments" && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 self-end sm:self-center">
              <span>Sort:</span>
              {(["top", "newest", "oldest"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setCommentSort(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${commentSort === s
                      ? "bg-white/15 text-orange-400"
                      : "text-zinc-500 hover:text-zinc-300"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {activeView === "threads" && (
            <div className="flex items-center gap-1.5 bg-[#181818] border border-white/10 p-1 rounded-xl overflow-x-auto w-full sm:w-auto scrollbar-none">
              {THREAD_SORT_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeThreadSort === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveThreadSort(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${active
                        ? "bg-orange-500 text-black font-black"
                        : "text-zinc-400 hover:text-white"
                      }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── VIEW 1: DIRECT MOVIE COMMENTS (Leave quick comment without thread) ── */}
        {activeView === "comments" && (
          <div className="pt-6 space-y-6">
            {/* Quick Comment Box */}
            <div id="tour-comments-box" className="bg-[#161616] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-inner">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-400" />
                <span>Leave a quick comment or review on {movie.title}</span>
              </h3>

              <form onSubmit={handlePostDirectComment} className="space-y-3">
                <textarea
                  rows={3}
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={
                    user
                      ? `What are your thoughts on ${movie.title}? Share your verdict, favorite scene, or actor performance...`
                      : "Sign in to post a comment..."
                  }
                  disabled={!user || commentSubmitting}
                  className="w-full px-4 py-3 bg-[#1e1e1e] border border-white/10 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500/50 resize-none transition-colors"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <SpoilerToggle
                    id="tour-spoiler"
                    checked={newCommentSpoiler}
                    onChange={setNewCommentSpoiler}
                    disabled={!user}
                    label="Mark as Spoiler"
                    activeLabel="Contains Spoiler (Blur Protected)"
                  />

                  {user ? (
                    <button
                      type="submit"
                      disabled={commentSubmitting || !newCommentText.trim()}
                      className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{commentSubmitting ? "Posting..." : "Post Comment"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openAuthModal("login")}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-md"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign in to Comment</span>
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Direct Comments List */}
            {commentsLoading ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                <div className="w-7 h-7 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                Loading comments...
              </div>
            ) : movieComments.length === 0 ? (
              <div className="text-center py-12 bg-[#161616] rounded-2xl border border-white/5">
                <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No comments yet</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Be the first to share your thoughts on {movie.title}!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {movieComments.map((comment) => {
                  const author = comment.userId || {
                    displayName: "Community Fan",
                    username: "fan",
                  };
                  return (
                    <div
                      key={comment._id}
                      className="bg-[#161616] border border-white/5 rounded-2xl p-4 sm:p-5 transition-all shadow-sm"
                    >
                      {/* Comment Header */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Link
                          href={`/discussion/user/${author.username}`}
                          className="flex items-center gap-2.5 group"
                        >
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 border border-orange-500/30 flex-shrink-0 flex items-center justify-center font-bold text-xs text-orange-400">
                            {author.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={author.avatar}
                                alt={author.displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              author.displayName?.charAt(0)
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors">
                              {author.displayName}
                            </span>
                            <span className="text-[11px] text-zinc-500 ml-1.5">
                              @{author.username}
                            </span>
                          </div>
                        </Link>

                        <span className="text-[11px] text-zinc-500">
                          {timeAgo(comment.createdAt)}
                        </span>
                      </div>

                      {/* Comment Body */}
                      <div className="text-xs sm:text-sm text-zinc-200 leading-relaxed my-2.5">
                        <SpoilerContent hasSpoiler={Boolean(comment.hasSpoiler)}>
                          {comment.content}
                        </SpoilerContent>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs text-zinc-400">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleCommentLike(comment._id)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${comment.isLiked
                                ? "text-rose-400 bg-rose-500/10 font-bold"
                                : "hover:text-white"
                              }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${comment.isLiked ? "fill-rose-400" : ""
                                }`}
                            />
                            <span>{comment.likeCount || 0}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setReplyingToId(
                                replyingToId === comment._id ? null : comment._id
                              )
                            }
                            className="flex items-center gap-1 hover:text-orange-400 font-semibold transition-colors"
                          >
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Reply</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!user) {
                              openAuthModal("login");
                              return;
                            }
                            setReportModalData({
                              isOpen: true,
                              id: comment._id,
                              type: "comment",
                            });
                          }}
                          className="hover:text-red-400 text-zinc-600 transition-colors p-1"
                        >
                          <Flag className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Reply Box */}
                      {replyingToId === comment._id && (
                        <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                          <input
                            type="text"
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to @${author.username}...`}
                            className="flex-1 px-3 py-1.5 bg-[#202020] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => handlePostReply(comment._id)}
                            disabled={replySubmitting || !replyText.trim()}
                            className="px-3 py-1.5 bg-orange-500 text-black font-bold text-xs rounded-xl disabled:opacity-50"
                          >
                            Reply
                          </button>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/5 pl-4 sm:pl-6 space-y-3">
                          {comment.replies.map((reply: any) => {
                            const rAuthor = reply.userId || {
                              displayName: "Fan",
                              username: "fan",
                            };
                            return (
                              <div
                                key={reply._id}
                                className="bg-[#1a1a1a] rounded-xl p-3 border border-white/5"
                              >
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="font-bold text-white">
                                    {rAuthor.displayName}{" "}
                                    <span className="text-zinc-500 font-normal">
                                      @{rAuthor.username}
                                    </span>
                                  </span>
                                  <span className="text-zinc-500">
                                    {timeAgo(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-300">
                                  {reply.content}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── VIEW 2: DEDICATED DISCUSSION THREADS ── */}
        {activeView === "threads" && (
          <div className="pt-6 space-y-6">
            {/* Create Thread Box */}
            <CreateThreadBox
              movieSlug={movieSlug}
              movieTitle={movie.title}
              onThreadCreated={handleThreadCreated}
            />

            {/* Thread List */}
            {loadingThreads ? (
              <div className="py-16 text-center text-xs text-zinc-500">
                <div className="w-7 h-7 border-2 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto mb-2" />
                Loading discussions...
              </div>
            ) : threads.length === 0 ? (
              <div className="text-center py-12 bg-[#161616] rounded-2xl border border-white/5">
                <MessageSquare className="w-10 h-10 text-zinc-600 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">No discussion topics yet</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Create a discussion topic to start an in-depth conversation!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {threads.map((thread) => (
                  <DiscussionThreadCard
                    key={thread._id}
                    thread={thread}
                    movieSlug={movieSlug}
                  />
                ))}

                {hasMoreThreads && (
                  <div className="text-center pt-4">
                    <button
                      onClick={() =>
                        fetchThreads(activeThreadSort, threadsPage + 1, true)
                      }
                      disabled={loadingThreads}
                      className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-md"
                    >
                      {loadingThreads ? "Loading more..." : "Load Older Discussions"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Discussion Banner Ad ── */}
      <div className="w-full overflow-hidden mt-8">
        <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
      </div>

      {/* Moderation Report Modal */}
      <ReportModal
        isOpen={reportModalData.isOpen}
        onClose={() =>
          setReportModalData((prev) => ({ ...prev, isOpen: false }))
        }
        targetId={reportModalData.id}
        targetType={reportModalData.type}
      />

      {/* Contextual On-Page Spotlight Tour (Dynamic for Upcoming vs Released) */}
      <MoviePageSpotlightTour isUpcoming={isUnreleased} />
    </div>
  );
}

export default MovieDiscussionClient;
