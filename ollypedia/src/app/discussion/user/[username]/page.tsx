import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME, buildMeta } from "@/lib/seo";
import { connectDB } from "@/lib/db";
import CommunityUser from "@/models/community/CommunityUser";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import MovieVote from "@/models/community/MovieVote";
import {
  MessageSquare,
  Sparkles,
  Heart,
  Calendar,
  Vote,
  Film,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";
import "@/models/Movie";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  await connectDB();
  const username = params.username.toLowerCase().trim();
  const user = await CommunityUser.findOne({
    username,
    status: { $ne: "deleted" },
  }).select("displayName username bio");

  if (!user) {
    return { title: "User Profile | Ollypedia Community" };
  }

  const title = `${user.displayName} (@${user.username}) - Community Profile`;
  const description =
    user.bio ||
    `View ${user.displayName}'s discussions, movie reviews, and activity on Ollypedia.`;

  return buildMeta({
    title,
    description,
    url: `/discussion/user/${user.username}`,
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

export default async function PublicUserProfilePage({
  params,
}: {
  params: { username: string };
}) {
  await connectDB();
  const username = params.username.toLowerCase().trim();

  const user = await CommunityUser.findOne({
    username,
    status: { $ne: "deleted" },
  }).lean() as any;

  if (!user) {
    notFound();
  }

  const [discussions, comments, votes] = await Promise.all([
    DiscussionThread.find({ userId: user._id, status: "active" })
      .populate("movieId", "title slug posterUrl thumbnailUrl")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    DiscussionComment.find({ userId: user._id, status: "active" })
      .populate("movieId", "title slug posterUrl thumbnailUrl")
      .populate("threadId", "title slug")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    MovieVote.find({ userId: user._id })
      .populate("movieId", "title slug posterUrl thumbnailUrl releaseDate")
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),
  ]);

  // Build unique movies participated in
  const movieMap = new Map<string, any>();
  discussions.forEach((d: any) => {
    if (d.movieId?._id) movieMap.set(d.movieId._id.toString(), d.movieId);
  });
  comments.forEach((c: any) => {
    if (c.movieId?._id) movieMap.set(c.movieId._id.toString(), c.movieId);
  });
  votes.forEach((v: any) => {
    if (v.movieId?._id) movieMap.set(v.movieId._id.toString(), v.movieId);
  });
  const participatedMovies = Array.from(movieMap.values());

  const joinDate = user.joinedAt
    ? new Date(user.joinedAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      {/* ── User Header Profile Card ── */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#181818] via-[#141414] to-[#0e0e0e] border border-white/10 rounded-3xl p-6 sm:p-10 mb-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-zinc-800 border-2 border-orange-500/40 shadow-xl flex-shrink-0">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt={user.displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-black text-orange-400">
                {user.displayName.charAt(0)}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                {user.displayName}
              </h1>
              {user.role === "admin" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Admin
                </span>
              )}
              {user.role === "moderator" && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  Moderator
                </span>
              )}
            </div>

            <p className="text-sm text-zinc-400 font-medium">@{user.username}</p>

            {user.bio && (
              <p className="text-sm text-zinc-300 mt-3 max-w-2xl leading-relaxed">
                {user.bio}
              </p>
            )}

            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-zinc-500 mt-4">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Joined {joinDate}
              </span>
            </div>
          </div>
        </div>

        {/* User Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-8 border-t border-white/5">
          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-2xl sm:text-3xl font-black text-white">
              {user.discussionCount || discussions.length}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold mt-0.5">
              Discussions
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-2xl sm:text-3xl font-black text-orange-400">
              {user.commentCount || comments.length}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold mt-0.5">
              Comments
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {user.likesReceived || 0}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold mt-0.5">
              Likes Received
            </p>
          </div>

          <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-4 text-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400">
              {user.voteCount || votes.length}
            </span>
            <p className="text-[11px] text-zinc-400 uppercase font-semibold mt-0.5">
              Meter Votes
            </p>
          </div>
        </div>
      </div>

      {/* ── Movies Participated In ── */}
      {participatedMovies.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-orange-400" />
            Movies Participated In ({participatedMovies.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4">
            {participatedMovies.map((m: any) => (
              <Link
                key={m._id}
                href={`/discussion/movie/${m.slug || m._id}`}
                className="group relative bg-[#141414] hover:bg-[#1a1a1a] border border-white/10 hover:border-orange-500/40 rounded-2xl overflow-hidden transition-all shadow-md"
              >
                <div className="relative aspect-[2/3] w-full bg-zinc-900 overflow-hidden">
                  <Image
                    src={m.posterUrl || m.thumbnailUrl || "/placeholder-movie.jpg"}
                    alt={m.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-2.5 text-center">
                  <p className="text-xs font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1">
                    {m.title}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Discussions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-orange-400" />
            Recent Discussions
          </h2>
          {discussions.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No discussions started yet.</p>
          ) : (
            <div className="space-y-3">
              {discussions.map((d: any) => (
                <Link
                  key={d._id}
                  href={`/discussion/movie/${d.movieId?.slug || "movie"}/thread/${d.slug || d._id}`}
                  className="block p-4 rounded-2xl bg-[#141414] hover:bg-[#181818] border border-white/5 hover:border-orange-500/30 transition-all group"
                >
                  <p className="text-xs font-semibold text-orange-400 mb-1">
                    {d.movieId?.title}
                  </p>
                  <h3 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors line-clamp-1 mb-1">
                    {d.title}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{timeAgo(d.createdAt)}</span>
                    <span>•</span>
                    <span>{d.likeCount || 0} Likes</span>
                    <span>•</span>
                    <span>{d.commentCount || 0} Comments</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Recent Comments ── */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            Recent Comments
          </h2>
          {comments.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No comments written yet.</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <Link
                  key={c._id}
                  href={`/discussion/movie/${c.movieId?.slug || "movie"}/thread/${c.threadId?.slug || c.threadId?._id || "thread"}`}
                  className="block p-4 rounded-2xl bg-[#141414] hover:bg-[#181818] border border-white/5 hover:border-orange-500/30 transition-all group"
                >
                  <p className="text-xs font-semibold text-zinc-400 mb-1">
                    On <strong className="text-orange-400">{c.movieId?.title}</strong>: &ldquo;{c.threadId?.title}&rdquo;
                  </p>
                  <p className="text-xs text-zinc-300 line-clamp-2 italic mb-2">
                    &ldquo;{c.content}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>{timeAgo(c.createdAt)}</span>
                    <span>•</span>
                    <span>{c.likeCount || 0} Likes</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom User Profile Banner Ad */}
      <div className="w-full overflow-hidden mt-8">
        <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
      </div>
    </div>
  );
}
