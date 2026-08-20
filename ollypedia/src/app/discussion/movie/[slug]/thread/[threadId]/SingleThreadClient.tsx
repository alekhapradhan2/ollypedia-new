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
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { SpoilerContent } from "@/components/community/SpoilerContent";
import { ReportModal } from "@/components/community/ReportModal";
import { ThreadCommentsSection } from "@/components/community/ThreadCommentsSection";
import toast from "react-hot-toast";

interface SingleThreadClientProps {
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

export default function SingleThreadClient({
  thread,
  movieSlug,
}: SingleThreadClientProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [liked, setLiked] = useState(Boolean(thread.isLiked));
  const [likeCount, setLikeCount] = useState(thread.likeCount || 0);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const author = thread.userId || {
    username: "anonymous",
    displayName: "Community Member",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=user",
  };

  const handleLike = async () => {
    if (!user) {
      toast("Please sign in to like this discussion.", { icon: "🔒" });
      openAuthModal("login");
      return;
    }

    if (likeSubmitting) return;
    setLikeSubmitting(true);

    const prevLiked = liked;
    const prevCount = likeCount;

    setLiked(!liked);
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);

    try {
      const res = await fetch(`/api/community/threads/${thread._id}/like`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        toast.error("Failed to update like.");
      } else {
        setLiked(data.isLiked);
        setLikeCount(data.likeCount);
      }
    } catch {
      setLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeSubmitting(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator
        .share({
          title: thread.title,
          text: `Check out this discussion on Ollypedia: "${thread.title}"`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-8">
      {/* Main Discussion Post Card */}
      <div className="bg-[#141414] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* Author & Header */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <Link
            href={`/discussion/user/${author.username}`}
            className="flex items-center gap-3.5 group/author"
          >
            <div className="w-11 h-11 rounded-full overflow-hidden bg-zinc-800 border border-white/10 ring-2 ring-transparent group-hover/author:ring-orange-500/40 transition-all">
              {author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatar}
                  alt={author.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-orange-400">
                  {author.displayName?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white group-hover/author:text-orange-400 transition-colors">
                  {author.displayName}
                </span>
                {author.role === "admin" && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded">
                    Admin
                  </span>
                )}
                {author.role === "moderator" && (
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
                    Mod
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500">
                @{author.username} • {formatDate(thread.createdAt)}
              </p>
            </div>
          </Link>

          {thread.hasSpoiler && (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              <AlertTriangle className="w-3.5 h-3.5" />
              Contains Spoilers
            </span>
          )}
        </div>

        {/* Thread Title */}
        <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight mb-4 leading-snug">
          {thread.title}
        </h1>

        {/* Content */}
        {thread.hasSpoiler ? (
          <SpoilerContent previewText="This discussion contains details or spoilers about the movie.">
            <div className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line mb-8">
              {thread.content}
            </div>
          </SpoilerContent>
        ) : (
          <div className="text-sm sm:text-base text-zinc-300 leading-relaxed whitespace-pre-line mb-8">
            {thread.content}
          </div>
        )}

        {/* Interactive Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs sm:text-sm transition-all ${
                liked
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-md shadow-rose-500/10"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-400 hover:text-white"
              }`}
            >
              <Heart
                className={`w-4 h-4 ${
                  liked ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
              <span>{likeCount} Likes</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs sm:text-sm font-semibold transition-all"
            >
              <Share2 className="w-4 h-4 text-zinc-400" />
              <span>Share</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!user) {
                openAuthModal("login");
              } else {
                setReportOpen(true);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-400 text-xs transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>
      </div>

      {/* YouTube-Style Thread Comments & Replies Section */}
      <ThreadCommentsSection
        threadId={thread._id}
        threadSlug={thread.slug}
        movieSlug={movieSlug}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={thread._id}
        targetType="thread"
      />
    </div>
  );
}
