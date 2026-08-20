import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { SITE_URL, SITE_NAME, buildMeta } from "@/lib/seo";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { SingleThreadClient } from "@/components/community/SingleThreadClient";
import { ChevronRight, MessageSquare, ArrowLeft, Film, Flame, Shield, Sparkles, Heart, Clock } from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";

export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: { slug: string; threadId: string };
}): Promise<Metadata> {
  await connectDB();
  const { slug, threadId } = params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(threadId);
  const query = isObjectId ? { _id: threadId } : { slug: threadId };

  const thread = await DiscussionThread.findOne(query)
    .populate("movieId", "title slug posterUrl")
    .lean() as any;

  if (!thread) {
    return { title: "Discussion Thread | Ollypedia Community" };
  }

  const movieTitle = thread.movieId?.title || "Movie";
  const title = `${thread.title} - ${movieTitle} Community Discussion`;
  const description =
    thread.content.slice(0, 160) ||
    `Read the community thread "${thread.title}" about ${movieTitle} on Ollypedia Odia Cinema Community.`;
  const image = thread.movieId?.posterUrl;

  return buildMeta({
    title,
    description,
    image,
    url: `/discussion/movie/${slug}/thread/${thread.slug || thread._id}`,
    keywords: [
      `${movieTitle} community`,
      `${movieTitle} discussion`,
      thread.title,
      "Ollypedia community",
      "Odia movie fan discussion",
      "Ollywood community thread",
    ],
  });
}

export default async function SingleThreadPage({
  params,
}: {
  params: { slug: string; threadId: string };
}) {
  await connectDB();
  const { slug, threadId } = params;

  const isObjectId = /^[0-9a-fA-F]{24}$/.test(threadId);
  const query = isObjectId ? { _id: threadId } : { slug: threadId };

  const thread = await DiscussionThread.findOne(query)
    .populate("userId", "username displayName avatar role status joinedAt")
    .populate(
      "movieId",
      "title slug posterUrl thumbnailUrl releaseDate genre language verdict description runtime"
    )
    .lean() as any;

  if (!thread || thread.status === "deleted" || thread.status === "hidden") {
    notFound();
  }

  const movie = thread.movieId;
  const author = thread.userId;

  // Fetch other trending discussions for this movie
  const otherThreads = await DiscussionThread.find({
    movieId: movie._id,
    _id: { $ne: thread._id },
    status: { $nin: ["deleted", "hidden"] },
  })
    .sort({ likeCount: -1, createdAt: -1 })
    .limit(4)
    .select("title slug likeCount commentCount createdAt")
    .lean() as any[];

  const poster = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;

  // Schema.org DiscussionForumPosting
  const threadCanonical = `${SITE_URL}/discussion/movie/${movie.slug || slug}/thread/${thread.slug || thread._id}`;
  const threadSchema = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: thread.title,
    articleBody: thread.content,
    url: threadCanonical,
    datePublished: new Date(thread.createdAt).toISOString(),
    author: {
      "@type": "Person",
      name: author.displayName || author.username,
      url: `${SITE_URL}/discussion/user/${author.username}`,
    },
    about: {
      "@type": "Movie",
      name: movie.title,
      url: `${SITE_URL}/movie/${movie.slug || movie._id}`,
    },
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/LikeAction",
        userInteractionCount: thread.likeCount || 0,
      },
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/CommentAction",
        userInteractionCount: thread.commentCount || 0,
      },
    ],
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(threadSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ── Top Navigation Bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-zinc-400 overflow-x-auto scrollbar-none pb-1"
          >
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            <Link href="/discussion" className="hover:text-white transition-colors">
              Community
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            <Link
              href={`/discussion/movie/${movie.slug || slug}`}
              className="hover:text-white transition-colors truncate max-w-[150px]"
            >
              {movie.title}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0" />
            <span className="text-orange-400 font-bold truncate max-w-[200px]">
              {thread.title}
            </span>
          </nav>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href={`/discussion/movie/${movie.slug || slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-orange-400" />
              <span>All {movie.title} Topics</span>
            </Link>

            <Link
              href={`/movie/${movie.slug || movie._id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-xs font-bold text-orange-400 transition-all shadow-sm"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movie Page</span>
            </Link>
          </div>
        </div>

        {/* ── Top Horizontal Banner Ad ── */}
        <div className="w-full overflow-hidden mb-6">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
        </div>

        {/* ── Main 2-Column Split: Content Feed (Left) & Movie Sidebar (Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Main Discussion & Comments (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <SingleThreadClient
              thread={JSON.parse(JSON.stringify(thread))}
              movieSlug={movie.slug || slug}
            />
          </div>

          {/* Right Sidebar: Movie Info & Community Context (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Movie Spotlight Card */}
            <div className="bg-[#141414] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-start gap-4">
                <div className="relative w-20 h-28 rounded-2xl overflow-hidden bg-zinc-900 border border-white/10 flex-shrink-0 shadow-md">
                  <Image
                    src={poster}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-black tracking-widest text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20">
                    Odia Film
                  </span>
                  <h3 className="text-base font-black text-white truncate mt-1">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mt-1">
                    {year && <span>{year}</span>}
                    {movie.genre && movie.genre.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{movie.genre.slice(0, 2).join(", ")}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-3.5">
                    <Link
                      href={`/discussion/movie/${movie.slug || slug}`}
                      className="flex-1 text-center py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-extrabold text-xs uppercase tracking-wider shadow-md hover:opacity-95 transition-all"
                    >
                      Rate &amp; Discuss
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Other Trending Topics on this Movie */}
            {otherThreads.length > 0 && (
              <div className="bg-[#141414] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-sm font-bold text-white tracking-tight">
                    More Topics on {movie.title}
                  </h4>
                </div>

                <div className="space-y-3">
                  {otherThreads.map((t) => (
                    <Link
                      key={t._id}
                      href={`/discussion/movie/${movie.slug || slug}/thread/${t.slug || t._id}`}
                      className="block p-3 rounded-2xl bg-[#191919] hover:bg-[#222222] border border-white/5 hover:border-orange-500/30 transition-all group"
                    >
                      <h5 className="text-xs font-bold text-zinc-200 group-hover:text-orange-400 line-clamp-2 transition-colors">
                        {t.title}
                      </h5>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-2">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-zinc-400" />
                          <span>{t.commentCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          <span>{t.likeCount || 0}</span>
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Community Guidelines Widget */}
            <div className="bg-[#141414] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Community Rules
                </h4>
              </div>
              <ul className="text-xs text-zinc-400 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">•</span>
                  <span>Be respectful of other Odia cinema viewers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">•</span>
                  <span>Always mark major movie twists as spoilers.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">•</span>
                  <span>No spam, piracy links, or abusive language.</span>
                </li>
              </ul>
            </div>

            {/* Sidebar Banner Ad */}
            <div className="w-full overflow-hidden">
              <DisplayAd slot="8191172163" format="rectangle" className="rounded-2xl border border-[#222]" />
            </div>
          </div>
        </div>

        {/* ── Bottom Horizontal Banner Ad ── */}
        <div className="w-full overflow-hidden mt-8">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
        </div>
      </div>
    </>
  );
}
