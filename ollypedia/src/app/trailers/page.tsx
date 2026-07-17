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
import { TrailerCard } from "@/components/trailers/TrailerCard";
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
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const start = `${year}-${month}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const end = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;

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
  const skip = (page - 1) * limit;
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

  const stats = [
    { value: "500+", label: "Trailers" },
    { value: "100+", label: "Movies" },
    { value: year, label: "Latest" },
    { value: "Free", label: "Watch" },
  ];


  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #050505 0%, #0f0500 40%, #080010 100%)" }}
      aria-label="Trailers hero banner"
    >
      {/* ── Cinematic background layers ── */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Large center glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[900px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />
        {/* Left accent glow */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.07) 0%, transparent 70%)" }} />
        {/* Right accent glow */}
        <div className="absolute -right-20 bottom-0 w-[500px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />


        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-600 mb-10" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-400">Trailers</span>
        </nav>

        {/* ── Two-column layout ── */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ── LEFT: Text content ── */}
          <div className="space-y-8">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
              style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
              {/* Pulsing dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <Clapperboard className="w-3.5 h-3.5" />
              Ollywood Trailers Hub
            </div>

            {/* Heading */}
            <div>
              <h1 className="font-black text-white leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                <span className="block text-gray-300 font-extrabold" style={{ fontSize: "0.55em", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3em", color: "rgba(249,115,22,0.7)" }}>
                  Ollywood Cinema
                </span>
                Watch{" "}
                <span style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}>
                  Movie
                </span>
                <br />
                <AnimatedWord />
              </h1>
            </div>

            {/* Description */}
            <p className="text-gray-400 leading-relaxed max-w-lg" style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}>
              Official trailers, teasers, motion posters &amp; first looks of every{" "}
              <strong className="text-white font-semibold">Odia movie in {year}</strong>.
              Cast, crew, release dates &amp; more — only on Ollypedia.
            </p>

            {/* Stats row */}
            <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
              {stats.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-black text-white">{value}</div>
                  <div className="text-xs text-gray-600 font-medium mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Visual panel ── */}
          <div className="relative hidden lg:flex items-center justify-center">

            {/* Outer ring glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-80 h-80 rounded-full border border-orange-500/10 animate-pulse" />
              <div className="absolute w-64 h-64 rounded-full border border-orange-500/15" />
            </div>

            {/* Center clapperboard icon */}
            <div className="relative z-10 flex flex-col items-center gap-6">

              {/* Main visual: big clapperboard */}
              <div className="relative">
                <div className="w-40 h-40 rounded-3xl flex items-center justify-center shadow-2xl"
                  style={{
                    background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.15) 100%)",
                    border: "1px solid rgba(249,115,22,0.25)",
                    boxShadow: "0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}>
                  <Clapperboard className="w-20 h-20 text-orange-400" strokeWidth={1.2} />
                </div>
                {/* Play badge */}
                <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                  style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Floating cards around the center */}
              {/* Top-left card */}
              <div className="absolute -top-16 -left-24 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                style={{
                  animationDuration: "3s",
                  background: "rgba(15,15,15,0.95)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                <Play className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                New Trailer
              </div>

              {/* Top-right card */}
              <div className="absolute -top-8 -right-28 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  animationDuration: "4s",
                  background: "rgba(15,15,15,0.95)",
                  border: "1px solid rgba(168,85,247,0.3)",
                  color: "#a855f7",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                <Eye className="w-3.5 h-3.5" />
                First Look
              </div>

              {/* Bottom-left card */}
              <div className="absolute -bottom-10 -left-28 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2"
                style={{
                  background: "rgba(15,15,15,0.95)",
                  border: "1px solid rgba(249,115,22,0.3)",
                  color: "#f97316",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                <Clapperboard className="w-3.5 h-3.5" />
                Official Teaser
              </div>

              {/* Bottom-right card */}
              <div className="absolute -bottom-16 -right-24 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                style={{
                  animationDuration: "3.5s",
                  background: "rgba(15,15,15,0.95)",
                  border: "1px solid rgba(59,130,246,0.3)",
                  color: "#3b82f6",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                <Film className="w-3.5 h-3.5" />
                Glimpse
              </div>

            </div>

          </div>



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
  const words = title.split(" ");
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
  const slug = movie.slug || movie._id;
  const poster = movie.posterUrl || movie.thumbnailUrl || "/placeholder-movie.jpg";
  const relDate = fmtDate(movie.releaseDate);
  const hasVid = hasAnyVideo(movie);

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
  const seoIntro = getTrailerPageSeoIntro();
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
              { href: "/movies", label: "All Odia Movies", icon: Film },
              { href: "/movies?verdict=Upcoming", label: "Upcoming Movies", icon: Calendar },
              { href: "/cast", label: "Cast & Crew", icon: Star },
              { href: "/songs", label: "Odia Songs", icon: TrendingUp },
              { href: "/box-office", label: "Box Office", icon: Zap },
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
