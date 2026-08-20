"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  MessageSquare,
  Share2,
  Flag,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { useCommunityAuth } from "@/context/CommunityAuthContext";
import { SpoilerContent } from "./SpoilerContent";
import { ReportModal } from "./ReportModal";
import toast from "react-hot-toast";

export interface ThreadUser {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  role?: string;
  status?: string;
}

export interface ThreadData {
  _id: string;
  movieId: any;
  userId: ThreadUser;
  title: string;
  content: string;
  slug: string;
  hasSpoiler: boolean;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  isLiked?: boolean;
  createdAt: string;
  lastActivityAt?: string;
}

interface DiscussionThreadCardProps {
  thread: ThreadData;
  movieSlug: string;
  showMovieLink?: boolean;
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

export function DiscussionThreadCard({
  thread,
  movieSlug,
  showMovieLink = false,
}: DiscussionThreadCardProps) {
  const { user, openAuthModal } = useCommunityAuth();
  const [liked, setLiked] = useState(Boolean(thread.isLiked));
  const [likeCount, setLikeCount] = useState(thread.likeCount || 0);
  const [likeSubmitting, setLikeSubmitting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const author = thread.userId || {
    _id: "unknown",
    username: "anonymous",
    displayName: "Community Member",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=user",
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast("Please sign in to like this discussion.", { icon: "🔒" });
      openAuthModal("login");
      return;
    }

    if (likeSubmitting) return;
    setLikeSubmitting(true);

    const prevLiked = liked;
    const prevCount = likeCount;

    // Optimistic toggle
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

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/discussion/movie/${movieSlug}/thread/${thread.slug || thread._id}`;
    if (navigator.share) {
      navigator
        .share({
          title: thread.title,
          text: `Read discussion on Ollypedia: "${thread.title}"`,
          url,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Discussion link copied to clipboard!");
    }
  };

  const threadHref = `/discussion/movie/${movieSlug}/thread/${thread.slug || thread._id}`;

  return (
    <>
      <div className="group relative bg-[#141414] hover:bg-[#181818] border border-white/10 hover:border-orange-500/40 rounded-3xl p-5 sm:p-6 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-orange-500/5">
        {/* Author Header */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <Link
            href={`/discussion/user/${author.username}`}
            className="flex items-center gap-3 group/author"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-zinc-800 border border-white/10 ring-2 ring-transparent group-hover/author:ring-orange-500/40 transition-all">
              {author.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={author.avatar}
                  alt={author.displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-orange-400">
                  {author.displayName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white group-hover/author:text-orange-400 transition-colors">
                  {author.displayName}
                </span>
                {author.role === "admin" && (
                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.2 font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-md">
                    Admin
                  </span>
                )}
                {author.role === "moderator" && (
                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.2 font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md">
                    Mod
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                @{author.username} • {timeAgo(thread.createdAt)}
              </p>
            </div>
          </Link>

          {/* Spoiler indicator tag */}
          {thread.hasSpoiler && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              <AlertTriangle className="w-3 h-3" />
              Spoiler
            </span>
          )}
        </div>

        {/* Thread Title */}
        <Link href={threadHref} className="block mb-2">
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-2">
            {thread.title}
          </h3>
        </Link>

        {/* Thread Content snippet */}
        {thread.hasSpoiler ? (
          <SpoilerContent previewText="This discussion contains spoilers about the plot.">
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 line-clamp-3">
              {thread.content}
            </p>
          </SpoilerContent>
        ) : (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-4 line-clamp-3">
            {thread.content}
          </p>
        )}

        {/* Card Actions Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-zinc-400">
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Like button */}
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                liked
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400 font-bold"
                  : "bg-white/5 hover:bg-white/10 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  liked ? "fill-rose-500 text-rose-500" : ""
                }`}
              />
              <span>{likeCount}</span>
            </button>

            {/* Comment count link */}
            <Link
              href={threadHref}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all font-semibold"
            >
              <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
              <span>{thread.commentCount || 0} Comments</span>
            </Link>

            {/* Share button */}
            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-white transition-all"
              title="Share Discussion"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>

            {/* Report button */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!user) {
                  openAuthModal("login");
                } else {
                  setReportOpen(true);
                }
              }}
              className="p-1.5 rounded-xl hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
              title="Report content"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>

          <Link
            href={threadHref}
            className="flex items-center gap-1 text-xs font-bold text-orange-400 hover:text-orange-300"
          >
            <span>View Thread</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetId={thread._id}
        targetType="thread"
      />
    </>
  );
}
