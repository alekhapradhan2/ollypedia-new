// app/trailers/page.tsx
// SSR landing page for Ollywood Movie Trailers
// SEO intro is at the BOTTOM, after all 4 content sections

import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import {
  buildTrailerMeta,
  trailerCollectionJsonLd,
  trailerBreadcrumbJsonLd,
  getTrailerPageSeoIntro,
  hasTrailer,
  hasTeaser,
  hasAnyVideo,
  fmtDate,
  type TrailerMovieDoc,
} from "@/lib/trailerSeo";
import { TrailersClient } from "@/components/trailers/TrailersClient";
import { TrailerCard }    from "@/components/trailers/TrailerCard";
import { AnimatedWord, AnimatedWordSection } from "@/components/trailers/AnimatedWord";
import {
  Film, Play, Calendar, TrendingUp, Clock, Star,
  ChevronRight, Clapperboard, Zap, Eye,
} from "lucide-react";

export const revalidate = 600; // Revalidate every 10 minutes

export async function generateMetadata(): Promise<Metadata> {
  return buildTrailerMeta();
}

// ─── Data fetchers ─────────────────────────────────────────────────────────────

// Section 1 — This Month: movies releasing this month (any video OR no video)
async function fetchThisMonth(): Promise<TrailerMovieDoc[]> {
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = String(now.getMonth() + 1).padStart(2, "0");
  const start   = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const end     = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

  return Movie.find(
    { releaseDate: { $gte: start, $lte: end } },
    "-reviews -story"
  )
    .sort({ releaseDate: 1 })
    .limit(12)
    .lean() as unknown as TrailerMovieDoc[];
}

// Section 2 — Upcoming with video:
//   STRICT rules — a movie is "upcoming" ONLY if:
//   a) releaseTBA is explicitly true, OR
//   b) releaseDate is strictly in the future (> today)
//   We intentionally EXCLUDE verdict:"Upcoming" alone because many older movies
//   have stale "Upcoming" verdicts with past/garbage release dates in the DB.
//   AND movie must have trailer/teaser/motionPoster/firstLook (no plain posters).
async function fetchUpcomingWithVideo(): Promise<TrailerMovieDoc[]> {
  const today = new Date().toISOString().split("T")[0];

  return Movie.aggregate([
    {
      $match: {
        // STRICT upcoming: future date OR explicitly TBA — nothing else
        $or: [
          { releaseTBA: true },
          { releaseDate: { $gt: today } },
        ],
        // Must have at least one video
        $and: [{ "media.videos.ytId": { $exists: true, $ne: "" } }],
      },
    },
    { $project: { reviews: 0, story: 0 } },
    {
      $addFields: {
        // 1 if has a definite future date, 0 if TBA
        _hasDated: {
          $cond: [
            {
              $and: [
                { $ifNull: ["$releaseDate", false] },
                { $ne: ["$releaseDate", ""] },
                { $gt: ["$releaseDate", today] },
              ],
            },
            1,
            0,
          ],
        },
        _releaseDateObj: {
          $cond: [
            {
              $and: [
                { $ifNull: ["$releaseDate", false] },
                { $ne: ["$releaseDate", ""] },
              ],
            },
            { $toDate: "$releaseDate" },
            null,
          ],
        },
      },
    },
    // Future dated movies first (soonest first), then TBA
    { $sort: { _hasDated: -1, _releaseDateObj: 1 } },
    { $limit: 12 },
  ]) as unknown as TrailerMovieDoc[];
}

// Section 3 — Latest Released Trailers:
//   - ONLY movies that have actually released (verdict != Upcoming, valid past releaseDate)
//   - Must have a trailer video
//   - Sorted strictly by releaseDate DESC
async function fetchLatestTrailers(): Promise<TrailerMovieDoc[]> {
  const today = new Date().toISOString().split("T")[0];

  return Movie.aggregate([
    {
      $match: {
        "media.videos": { $elemMatch: { type: "Trailer", ytId: { $ne: "" } } },
        // Must have a valid, non-empty release date
        releaseDate: { $exists: true, $ne: "", $lte: today },
        // Exclude upcoming movies
        verdict: { $nin: ["Upcoming", null, ""] },
        releaseTBA: { $ne: true },
      },
    },
    { $project: { reviews: 0, story: 0 } },
    {
      $addFields: {
        _releaseDateObj: { $toDate: "$releaseDate" },
      },
    },
    // Strict descending by release date
    { $sort: { _releaseDateObj: -1 } },
    { $limit: 12 },
  ]) as unknown as TrailerMovieDoc[];
}

// Section 4 — All with video
// Sort: released movies by releaseDate DESC (most recent release first),
//       then upcoming/TBA movies (no past release date) at the end.
async function fetchAllWithVideo(page = 1, limit = 20): Promise<{ movies: TrailerMovieDoc[]; total: number }> {
  const skip  = (page - 1) * limit;
  const today = new Date().toISOString().split("T")[0];

  const videoMatch = {
    "media.videos.ytId": { $exists: true, $ne: "" },
  };

  const [movies, total] = await Promise.all([
    Movie.aggregate([
      { $match: videoMatch },
      { $project: { reviews: 0, story: 0 } },
      {
        $addFields: {
          // 1 = has a valid past release date (actually released movie)
          // 0 = upcoming or TBA (goes to bottom)
          _isReleased: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$releaseDate", false] },
                  { $ne: ["$releaseDate", ""] },
                  { $lte: ["$releaseDate", today] },
                  { $ne: ["$verdict", "Upcoming"] },
                  { $ne: ["$releaseTBA", true] },
                ],
              },
              1,
              0,
            ],
          },
          _releaseDateObj: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$releaseDate", false] },
                  { $ne: ["$releaseDate", ""] },
                ],
              },
              { $toDate: "$releaseDate" },
              null,
            ],
          },
        },
      },
      // Released movies first (newest release date), then TBA/upcoming last
      { $sort: { _isReleased: -1, _releaseDateObj: -1, _id: -1 } },
      { $skip: skip },
      { $limit: limit },
    ]),
    Movie.countDocuments(videoMatch),
  ]);

  return { movies: movies as unknown as TrailerMovieDoc[], total };
}

function monthName() {
  return new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function TrailersHero() {
  const year = new Date().getFullYear();
  const chips = [
    { icon: Play,         label: "Latest Trailers",   color: "text-red-400 bg-red-500/10 border-red-500/20" },
    { icon: Clapperboard, label: "Official Teasers",   color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { icon: Film,         label: "Motion Posters",     color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { icon: Eye,          label: "First Looks",        color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
    { icon: Calendar,     label: "Upcoming Movies",    color: "text-green-400 bg-green-500/10 border-green-500/20" },
    { icon: Star,         label: "Release Dates",      color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  ];
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #120a00 50%, #0a0a0a 100%)" }}
      aria-label="Trailers hero banner"
    >
      {/* Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-red-600/5 rounded-full blur-[80px]" />
        <div className="absolute top-10 right-10 w-[200px] h-[200px] bg-amber-500/5 rounded-full blur-[60px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-600 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400">Trailers</span>
        </nav>

        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-widest mb-4 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Clapperboard className="w-3.5 h-3.5" />
            Ollywood Trailers Hub
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white leading-tight">
            Latest{" "}
            <span className="text-transparent"
              style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Ollywood
            </span>
            <br />Movie{" "}<AnimatedWord />
          </h1>

          <p className="mt-5 text-lg text-gray-400 leading-relaxed max-w-2xl">
            Watch official trailers, teasers, motion posters &amp; first looks of every{" "}
            <strong className="text-white font-semibold">Odia movie in {year}</strong>.
            Complete cast, crew, release dates &amp; production details — only on Ollypedia.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mt-8">
          {chips.map(({ icon: Icon, label, color }) => (
            <span key={label} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${color}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-white/[0.05]">
          {[
            { icon: Play,       value: "Official", label: "HD Trailers" },
            { icon: Calendar,   value: year,        label: "New Releases" },
            { icon: TrendingUp, value: "100+",      label: "Odia Movies" },
            { icon: Zap,        value: "Free",      label: "Watch Online" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                <Icon className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{value}</p>
                <p className="text-xs text-gray-600">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section header ─────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, subtitle, count, color = "text-orange-400", animateWord = false,
}: {
  icon: React.ElementType; title: string; subtitle?: string; count?: number; color?: string; animateWord?: boolean;
}) {
  // Split title so the last word can be animated
  const words     = title.split(" ");
  const restTitle = words.slice(0, -1).join(" ");

  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
          {animateWord ? (
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.25ch", lineHeight: "inherit" }}>
              <span>{restTitle}{" "}</span>
              <AnimatedWordSection />
            </span>
          ) : (
            title
          )}
          {count !== undefined && (
            <span className="ml-2 text-sm font-semibold text-gray-600">({count})</span>
          )}
        </h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── This Month card (simplified, navigates to trailer page) ─────────────────

function ThisMonthCard({ movie }: { movie: TrailerMovieDoc }) {
  const slug      = movie.slug || movie._id;
  const poster    = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const relDate   = fmtDate(movie.releaseDate);
  const hasVid    = hasAnyVideo(movie);

  return (
    <Link href={`/trailers/${slug}`} className="group block" aria-label={`${movie.title} trailer page`}>
      <article className="relative bg-[#101010] rounded-2xl overflow-hidden border border-[#1e1e1e] group-hover:border-orange-500/50 transition-all duration-300 group-hover:shadow-2xl group-hover:shadow-orange-500/10 group-hover:-translate-y-1">
        <div className="relative overflow-hidden" style={{ aspectRatio: "2/3" }}>
          <Image src={poster} alt={movie.title} fill
            sizes="(max-width: 640px) 50vw, 16vw"
            className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0.75) 75%, rgba(0,0,0,0.97) 100%)" }} />
          {/* Badges */}
          <div className="absolute top-2 left-2 z-10 flex gap-1">
            {hasTrailer(movie) && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white uppercase">Trailer</span>}
            {hasTeaser(movie) && !hasTrailer(movie) && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-black uppercase">Teaser</span>}
            {!hasVid && <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-gray-700/80 text-gray-300 uppercase">Soon</span>}
          </div>
          {/* Play overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-all duration-300">
            {hasVid ? (
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 flex items-center justify-center">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            ) : (
              <div className="px-2.5 py-1 rounded-full bg-black/70 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] text-gray-300">Coming Soon</span>
              </div>
            )}
          </div>
          {/* Title overlay at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
            <h3 className="font-black text-white text-xs leading-tight line-clamp-2 drop-shadow-lg">{movie.title}</h3>
            {relDate !== "TBA" ? (
              <p className="text-[9px] text-gray-400 mt-0.5 flex items-center gap-0.5">
                <Calendar className="w-2 h-2" />{relDate}
              </p>
            ) : (
              <p className="text-[9px] text-orange-400 mt-0.5 font-semibold">Release TBA</p>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function TrailersPage() {
  await connectDB();

  const [thisMonth, upcoming, latestTrailers, { movies: allFirst, total: totalAll }] =
    await Promise.all([
      fetchThisMonth(),
      fetchUpcomingWithVideo(),
      fetchLatestTrailers(),
      fetchAllWithVideo(1, 20),
    ]);

  const collectionLd = trailerCollectionJsonLd([...latestTrailers, ...upcoming, ...allFirst]);
  const breadcrumbLd = trailerBreadcrumbJsonLd();
  const seoIntro     = getTrailerPageSeoIntro();
  const currentMonth = monthName();

  return (
    <>
      {/* JSON-LD */}
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
      <script type="application/ld+json" suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero */}
      <TrailersHero />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">

        {/* ── Section 1: This Month ─────────────────────────────────────────── */}
        <section aria-labelledby="this-month-heading">
          <SectionHeader
            icon={Calendar}
            title={`This Month in Ollywood`}
            subtitle={`Movies releasing in ${currentMonth}`}
            count={thisMonth.length}
            color="text-orange-400"
          />
          {thisMonth.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {thisMonth.map((m) => (
                <ThisMonthCard key={String(m._id)} movie={m} />
              ))}
            </div>
          ) : (
            <div className="py-10 text-center bg-[#111] rounded-2xl border border-[#1e1e1e]">
              <Calendar className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No movies scheduled for this month yet.</p>
              <p className="text-gray-700 text-xs mt-1">Check back soon — this updates automatically.</p>
            </div>
          )}
        </section>

        {/* ── Section 2: Upcoming Trailers ─────────────────────────────────── */}
        {upcoming.length > 0 && (
          <section aria-labelledby="upcoming-trailers-heading">
            <SectionHeader
              icon={Zap}
              title="Upcoming Movie Trailers"
              subtitle="Future releases & TBA movies with official trailers or teasers"
              count={upcoming.length}
              color="text-sky-400"
              animateWord
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {upcoming.map((m) => (
                <TrailerCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3: Latest Released Trailers ──────────────────────────── */}
        {latestTrailers.length > 0 && (
          <section aria-labelledby="latest-trailers-heading">
            <SectionHeader
              icon={TrendingUp}
              title="Latest Released Trailers"
              subtitle="Official trailers of recently released Ollywood movies, newest first"
              count={latestTrailers.length}
              color="text-red-400"
              animateWord
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
              {latestTrailers.map((m) => (
                <TrailerCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4: All Ollywood Trailers (filters + infinite scroll) ─── */}
        <section aria-labelledby="all-trailers-heading" id="all-trailers">
          <SectionHeader
            icon={Film}
            title="All Ollywood Movie Trailers"
            subtitle="Every Odia movie with a trailer, teaser, motion poster, or first look"
            count={totalAll}
            color="text-orange-400"
            animateWord
          />
          <TrailersClient initialMovies={allFirst} totalCount={totalAll} />
        </section>

        {/* ── Internal linking ─────────────────────────────────────────────── */}
        <section aria-label="Explore more on Ollypedia">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { href: "/movies",                   label: "All Odia Movies",    icon: Film },
              { href: "/movies?verdict=Upcoming",  label: "Upcoming Movies",    icon: Calendar },
              { href: "/cast",                     label: "Cast & Crew",         icon: Star },
              { href: "/songs",                    label: "Odia Songs",          icon: TrendingUp },
              { href: "/box-office",               label: "Box Office",          icon: Zap },
            ].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex flex-col items-center gap-2 p-4 bg-[#141414] border border-[#252525] rounded-xl hover:border-orange-500/30 hover:bg-orange-500/5 text-center transition-all group">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs font-semibold text-gray-400 group-hover:text-orange-400 transition-colors leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── SEO Introduction (BOTTOM) ────────────────────────────────────── */}
        <section aria-label="About Ollywood Trailers" className="border-t border-white/[0.05] pt-16">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-8 text-center">
              About Ollywood Movie Trailers
            </h2>
            <div className="prose prose-invert prose-sm md:prose-base max-w-none
              prose-headings:text-orange-400 prose-headings:font-black
              prose-p:text-gray-400 prose-p:leading-relaxed
              prose-strong:text-white prose-strong:font-semibold">
              {seoIntro.split("\n\n").map((para, i) => {
                const trimmed = para.trim();
                if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
                  return (
                    <h3 key={i} className="text-orange-400 font-black text-lg mt-8 mb-3">
                      {trimmed.replace(/\*\*/g, "")}
                    </h3>
                  );
                }
                if (trimmed.startsWith("*") && !trimmed.startsWith("**")) {
                  return (
                    <p key={i} className="text-gray-400 leading-relaxed mb-4"
                      dangerouslySetInnerHTML={{
                        __html: trimmed.replace(/\*(.+?)\*/g, "<em class='text-gray-300 not-italic font-semibold'>$1</em>")
                      }} />
                  );
                }
                return (
                  <p key={i} className="text-gray-400 leading-relaxed mb-4"
                    dangerouslySetInnerHTML={{
                      __html: trimmed.replace(/\*\*(.+?)\*\*/g, "<strong class='text-white'>$1</strong>")
                    }} />
                );
              })}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
