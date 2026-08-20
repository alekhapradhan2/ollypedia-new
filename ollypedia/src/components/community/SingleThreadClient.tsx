"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Share2,
  Flag,
  AlertTriangle,
  MessageSquare,
  Eye,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { ReportModal } from "@/components/community/ReportModal";
import { ThreadCommentsSection } from "@/components/community/ThreadCommentsSection";
import toast from "react-hot-toast";

export interface SingleThreadClientProps {
  thread: any;
  movieSlug: string;
}

function formatDate(dateString: string): string {
  const d = new Date(dateString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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

export function SingleThreadClient({
  thread,
  movieSlug,
}: SingleThreadClientProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [liked, setLiked] = useState(Boolean(thread.isLiked));
  const [likeCount, setLikeCount] = useState(thread.likeCount || 0);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const author = thread.userId || {
    displayName: "Community Fan",
    username: "anonymous",
  };

  const handleToggleLike = async () => {
    if (!user) {
      openAuthModal("login");
      return;
    }

    if (likeSubmitting) return;
    setLikeSubmitting(true);

    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!prevLiked);
    setLikeCount((c: number) => (prevLiked ? Math.max(0, c - 1) : c + 1));

    try {
      const res = await fetch(`/api/community/threads/${thread._id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        toast.error(data.message || "Failed to like thread.");
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      toast.error("Network error.");
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: thread.title,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Discussion link copied to clipboard!", {
        icon: "🔗",
      });
    }
  };

  return (
    <>
      {/* ── Main Discussion Topic Card ── */}
      <div className="bg-[#121212] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Author Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-white/10 relative z-10">
          <Link
            href={`/discussion/user/${author.username}`}
            className="flex items-center gap-3.5 group"
          >
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden bg-[#1f1f1f] border border-orange-500/30 flex-shrink-0 flex items-center justify-center shadow-md group-hover:border-orange-500 transition-colors">
              {author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatar}
                  alt={author.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-sm text-orange-400 bg-orange-500/10">
                  {author.displayName.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-white group-hover:text-orange-400 transition-colors">
                  {author.displayName}
                </span>
                {author.role === "admin" ? (
                  <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-black rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                    <span>Admin</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-white/5 text-zinc-400 border border-white/10 rounded-md text-[10px] font-semibold">
                    Fan
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">
                @{author.username}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-xl border border-white/5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span title={formatDate(thread.createdAt)}>{timeAgo(thread.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-5 relative z-10">
          {thread.title}
        </h1>

        {/* Content with Spoiler protection */}
        <div className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line mb-8 relative z-10 bg-[#161616]/50 p-4 sm:p-6 rounded-2xl border border-white/5">
          <SpoilerContent hasSpoiler={Boolean(thread.hasSpoiler)}>
            {thread.content}
          </SpoilerContent>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-5 border-t border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            {/* Like Button */}
            <button
              type="button"
              onClick={handleToggleLike}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer select-none ${
                liked
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 ring-1 ring-rose-500/30"
                  : "bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10"
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${liked ? "fill-rose-400 text-rose-400 scale-110" : ""}`}
              />
              <span>{likeCount} Likes</span>
            </button>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 text-orange-400" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-zinc-400 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              <span>{thread.viewCount || 1} views</span>
            </span>

            {/* Report */}
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal("login");
                  return;
                }
                setReportOpen(true);
              }}
              className="p-2 text-zinc-500 hover:text-red-400 rounded-xl hover:bg-white/5 transition-colors"
              title="Report discussion thread"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Thread Comments Section ── */}
      <ThreadCommentsSection
        threadId={thread._id}
        movieId={thread.movieId?._id || thread.movieId}
        initialCommentCount={thread.commentCount || 0}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="thread"
        targetId={thread._id}
        targetTitle={thread.title}
      />
    </>
  );
}

export default SingleThreadClient;
