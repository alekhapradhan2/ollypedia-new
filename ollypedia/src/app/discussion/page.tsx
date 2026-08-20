import React from "react";
import type { Metadata } from "next";
import { SITE_URL, SITE_NAME, buildMeta } from "@/lib/seo";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import MovieVote from "@/models/community/MovieVote";
import DiscussionThread from "@/models/community/DiscussionThread";
import DiscussionComment from "@/models/community/DiscussionComment";
import { CommunityMovieCard, CommunityMovieData } from "@/components/community/CommunityMovieCard";
import { DiscussionLandingClient } from "@/components/community/DiscussionLandingClient";
import { CommunityGuideButton } from "@/components/community/CommunityGuideButton";
import { Sparkles, MessageSquare, TrendingUp, Calendar, Clock, Flame, Film, ChevronRight } from "lucide-react";
import Link from "next/link";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { getReleaseYear } from "@/lib/dateUtils";

export const revalidate = 60; // ISR cache for 60 seconds

export async function generateMetadata(): Promise<Metadata> {
  return buildMeta({
    title: "Odia Cinema Community & Movie Discussion | Live Meter & Reviews",
    description:
      "Join the official Ollypedia Odia Cinema Community. Vote on live Odia movies with the Ollypedia Meter, connect with Ollywood fans, participate in movie discussions, and share audience reviews.",
    url: "/discussion",
    keywords: [
      "Odia movie community",
      "Ollywood community",
      "Odia cinema forum",
      "Ollypedia Meter",
      "Odia movie discussion",
      "Odia film reviews",
      "live movie rating Odia",
      "Ollywood fans discussion",
      "Odisha cinema community",
      "movie discussion room",
    ],
  });
}

function mapToCommunityMovie(
  m: any,
  voteStatsMap: Record<string, any>,
  threadStatsMap: Record<string, any>,
  commentStatsMap: Record<string, number>
): CommunityMovieData {
  const mid = m._id.toString();
  const votes = voteStatsMap[mid] || {
    total: 0,
    breakdown: { skip: 0, timepass: 0, go_for_it: 0, perfection: 0 },
  };
  const threads = threadStatsMap[mid] || { count: 0, lastActivity: null };
  const commentsCount = commentStatsMap[mid] || 0;

  let topCategory = "go_for_it";
  let topCount = 0;
  for (const [cat, cnt] of Object.entries(votes.breakdown)) {
    if ((cnt as number) > topCount) {
      topCount = cnt as number;
      topCategory = cat;
    }
  }

  const topPercentage =
    votes.total > 0 ? Math.round((topCount / votes.total) * 100) : 0;

  return {
    _id: mid,
    title: m.title,
    slug: m.slug || mid,
    posterUrl: m.posterUrl,
    thumbnailUrl: m.thumbnailUrl,
    releaseDate: m.releaseDate,
    releaseDatePrecision: m.releaseDatePrecision,
    releaseTBA: m.releaseTBA,
    language: m.language,
    genre: m.genre,
    verdict: m.verdict,
    community: {
      totalVotes: votes.total,
      breakdown: votes.breakdown,
      topCategory,
      topPercentage,
      threadsCount: threads.count,
      commentsCount,
      lastActivity: threads.lastActivity?.toISOString() || null,
    },
  };
}

export default async function DiscussionLandingPage() {
  await connectDB();

  const now = new Date();
  const nowIso = now.toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Fetch segregated collections
  const [
    upcomingRaw,
    latestRaw,
    thisMonthRaw,
    allInitialRaw,
  ] = await Promise.all([
    // 1. Upcoming Movies (Comprehensive search for unreleased & future dated films)
    Movie.find({
      $or: [
        { verdict: "Upcoming" },
        { status: "Upcoming" },
        { releaseDate: { $gt: nowIso } },
        { releaseTBA: true },
      ],
    })
      .select("title slug posterUrl thumbnailUrl releaseDate releaseDatePrecision releaseTBA language genre verdict")
      .sort({ releaseDate: 1, createdAt: -1 })
      .limit(18)
      .lean(),

    // 2. Latest Released Movies (sorted by releaseDate desc)
    Movie.find({
      $and: [
        { verdict: { $ne: "Upcoming" } },
        { status: { $ne: "Upcoming" } },
        { releaseDate: { $lte: nowIso } },
      ],
    })
      .select("title slug posterUrl thumbnailUrl releaseDate releaseDatePrecision releaseTBA language genre verdict")
      .sort({ releaseDate: -1, createdAt: -1 })
      .limit(12)
      .lean(),

    // 3. Releasing This Month
    Movie.find({
      $or: [
        { releaseDate: { $gte: startOfMonth, $lte: endOfMonth } },
        { releaseDateText: { $regex: new Intl.DateTimeFormat("en", { month: "long" }).format(now), $options: "i" } },
      ],
    })
      .select("title slug posterUrl thumbnailUrl releaseDate releaseDatePrecision releaseTBA language genre verdict")
      .sort({ releaseDate: 1 })
      .limit(12)
      .lean(),

    // 4. Initial All Movies for Infinite Scroll (Sorted by releaseDate desc)
    Movie.find()
      .select("title slug posterUrl thumbnailUrl releaseDate releaseDatePrecision releaseTBA language genre verdict")
      .sort({ releaseDate: -1, createdAt: -1 })
      .limit(24)
      .lean(),
  ]);

  // Collect all unique movie IDs for aggregation
  const allMovieIds = Array.from(
    new Set([
      ...upcomingRaw.map((m: any) => m._id),
      ...latestRaw.map((m: any) => m._id),
      ...thisMonthRaw.map((m: any) => m._id),
      ...allInitialRaw.map((m: any) => m._id),
    ])
  );

  // Aggregate Community Votes, Threads, and Comments
  const [voteAgg, threadAgg, commentAgg] = await Promise.all([
    MovieVote.aggregate([
      { $match: { movieId: { $in: allMovieIds } } },
      {
        $group: {
          _id: { movieId: "$movieId", voteType: "$voteType" },
          count: { $sum: 1 },
        },
      },
    ]),
    DiscussionThread.aggregate([
      { $match: { movieId: { $in: allMovieIds }, status: "active" } },
      {
        $group: {
          _id: "$movieId",
          count: { $sum: 1 },
          lastActivity: { $max: "$lastActivityAt" },
        },
      },
    ]),
    DiscussionComment.aggregate([
      { $match: { movieId: { $in: allMovieIds }, status: "active" } },
      {
        $group: {
          _id: "$movieId",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const voteStatsMap: Record<
    string,
    {
      total: number;
      breakdown: { skip: number; timepass: number; go_for_it: number; perfection: number };
    }
  > = {};
  voteAgg.forEach((v: any) => {
    const mid = v._id.movieId.toString();
    if (!voteStatsMap[mid]) {
      voteStatsMap[mid] = {
        total: 0,
        breakdown: { skip: 0, timepass: 0, go_for_it: 0, perfection: 0 },
      };
    }
    const voteType = v._id.voteType as "skip" | "timepass" | "go_for_it" | "perfection";
    if (voteStatsMap[mid].breakdown[voteType] !== undefined) {
      voteStatsMap[mid].breakdown[voteType] = v.count;
    }
    voteStatsMap[mid].total += v.count;
  });

  const threadStatsMap: Record<string, { count: number; lastActivity: Date | null }> = {};
  threadAgg.forEach((t: any) => {
    threadStatsMap[t._id.toString()] = {
      count: t.count,
      lastActivity: t.lastActivity,
    };
  });

  const commentStatsMap: Record<string, number> = {};
  commentAgg.forEach((c: any) => {
    commentStatsMap[c._id.toString()] = c.count;
  });

  function getDateTier(m: any): number {
    const s = String(m.releaseDate || "").trim();
    const prec = m.releaseDatePrecision;

    if (
      m.releaseTBA ||
      !s ||
      s.toUpperCase() === "TBA"
    ) {
      return 4; // Tier 4: TBA (Last)
    }

    // Tier 1: True Full date with Year-Month-Day (e.g. "2026-09-18")
    if (/^\d{4}-\d{2}-\d{2}/.test(s) && prec !== "year" && prec !== "month") {
      return 1;
    }

    // Tier 2: Month & Year (e.g. "2026-09" or prec === "month")
    if (/^\d{4}-\d{2}$/.test(s) || prec === "month") {
      return 2;
    }

    // Tier 3: Year only (e.g. "2026" or prec === "year")
    if (/^\d{4}$/.test(s) || prec === "year") {
      return 3;
    }

    return 4;
  }

  function sortUpcoming(list: any[]) {
    return [...list].sort((a, b) => {
      const tierA = getDateTier(a);
      const tierB = getDateTier(b);

      if (tierA !== tierB) {
        return tierA - tierB;
      }

      if (tierA === 4) {
        return 0;
      }

      const timeA = new Date(a.releaseDate).getTime();
      const timeB = new Date(b.releaseDate).getTime();
      if (!isNaN(timeA) && !isNaN(timeB)) {
        return timeA - timeB;
      }
      return String(a.releaseDate).localeCompare(String(b.releaseDate));
    });
  }

  function sortAllDiscussionMovies(list: any[]) {
    return [...list].sort((a, b) => {
      const numYearA = parseInt(getReleaseYear(a.releaseDate) || "0", 10);
      const numYearB = parseInt(getReleaseYear(b.releaseDate) || "0", 10);

      // 1. Year descending (2026 -> 2025 -> 2024)
      if (numYearA !== numYearB) {
        return numYearB - numYearA;
      }

      // 2. In same year: Year-only movies show FIRST
      const isYearOnlyA = Boolean(
        a.releaseDatePrecision === "year" ||
        (a.releaseDate && /^\d{4}$/.test(String(a.releaseDate).trim()))
      );
      const isYearOnlyB = Boolean(
        b.releaseDatePrecision === "year" ||
        (b.releaseDate && /^\d{4}$/.test(String(b.releaseDate).trim()))
      );

      if (isYearOnlyA && !isYearOnlyB) return -1;
      if (!isYearOnlyA && isYearOnlyB) return 1;

      // 3. Fallback: newest date / createdAt
      const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
        return dateB - dateA;
      }

      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });
  }

  const upcomingMovies = sortUpcoming(upcomingRaw).map((m: any) =>
    mapToCommunityMovie(m, voteStatsMap, threadStatsMap, commentStatsMap)
  );

  const latestMovies = latestRaw.map((m: any) =>
    mapToCommunityMovie(m, voteStatsMap, threadStatsMap, commentStatsMap)
  );

  const thisMonthMovies = thisMonthRaw.map((m: any) =>
    mapToCommunityMovie(m, voteStatsMap, threadStatsMap, commentStatsMap)
  );

  const initialCommunityMovies = sortAllDiscussionMovies(allInitialRaw).map((m: any) =>
    mapToCommunityMovie(m, voteStatsMap, threadStatsMap, commentStatsMap)
  );

  // Schema.org DiscussionForum JSON-LD
  const forumSchema = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    name: "Ollypedia Odia Cinema Live Discussion & Ollypedia Meter",
    headline: "Odia Film Community, Meter Ratings & Audience Reviews",
    url: `${SITE_URL}/discussion`,
    description:
      "Public community discussion forum and live voting meter for Odia movies.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(forumSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12">
        {/* ── Clean Hero Banner ── */}
        <div className="relative overflow-hidden bg-gradient-to-b from-orange-500/15 via-[#141414] to-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs sm:text-sm font-bold shadow-inner">
              <Sparkles className="w-3.5 h-3.5" />
              <span>The Voice of Odia Cinema Fans</span>
            </div>
            <CommunityGuideButton />
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Live Movie Discussion &amp;{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-500">
              Ollypedia Meter
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-2xl mx-auto mt-3 leading-relaxed">
            Rate Odia movies with <strong>Skip 🩷</strong>,{" "}
            <strong>Timepass 🟡</strong>, <strong>Go for it 🟢</strong>, or{" "}
            <strong>Perfection 🟣</strong>. Share your reviews and participate in live discussion rooms.
          </p>
        </div>

        {/* ── Top Community Banner Ad ── */}
        <div className="w-full overflow-hidden">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
        </div>

        {/* ── SECTION 1: UPCOMING MOVIES (NOW AT THE TOP) ── */}
        {upcomingMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Upcoming Odia Movies
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Anticipated films with early fan buzz and meter voting
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {upcomingMovies.map((movie) => (
                <CommunityMovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 2: LATEST RELEASES ── */}
        {latestMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Latest Releases
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Recently released films actively trending in discussion rooms
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {latestMovies.map((movie) => (
                <CommunityMovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {/* ── SECTION 3: RELEASING THIS MONTH (Only if there are movies releasing this month) ── */}
        {thisMonthMovies.length > 0 && (
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Releasing This Month
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Odia films hitting theatres &amp; streaming this month
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {thisMonthMovies.map((movie) => (
                <CommunityMovieCard key={movie._id} movie={movie} />
              ))}
            </div>
          </section>
        )}

        {/* ── Mid Community Banner Ad ── */}
        <div className="w-full overflow-hidden">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-2xl border border-[#222]" />
        </div>

        {/* ── SECTION 4: ALL MOVIES & LIVE EXPLORER (With Infinite Scroll & In-Feed Card Ads) ── */}
        <section className="pt-4 border-t border-white/10">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                All Discussion Rooms
              </h2>
              <p className="text-xs text-zinc-400">
                Browse, search, and filter every Odia movie room with live infinite loading
              </p>
            </div>
          </div>

          <DiscussionLandingClient initialMovies={initialCommunityMovies} />
        </section>
      </div>
    </>
  );
}
