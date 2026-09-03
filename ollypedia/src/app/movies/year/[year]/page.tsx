// app/movies/year/[year]/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import { buildMeta, SITE_URL } from "@/lib/seo";
import {
  Film, Calendar, ChevronRight, Clapperboard,
  TrendingUp, Star, Flame, Clock, Zap, User, ExternalLink,
  BookOpen, HelpCircle, Globe, Award, Sparkles,
} from "lucide-react";
import { YearDropdown } from "./YearDropdown";
import { formatReleaseDate, mongoDateExpr } from "@/lib/dateUtils";

export const revalidate = 86400; // 24 hours — historical year archives rarely change

// ─── Valid years ───────────────────────────────────────────────────────────────
// Starting from 1980 — pre-1980 years have extremely few/zero entries in the DB
// and produce near-empty pages that Google refuses to index (Crawled – not indexed).
// generateStaticParams only pre-builds these; years outside this range with actual
// movie data are still served dynamically via dynamicParams = true.
const _OLDEST_YEAR = 1980;
const _NOW_YEAR = new Date().getFullYear();
const VALID_YEARS: number[] = Array.from(
  { length: _NOW_YEAR - _OLDEST_YEAR + 1 },
  (_, i) => _NOW_YEAR - i,
);

// ─── Generate static params ────────────────────────────────────────────────────
export async function generateStaticParams() {
  return VALID_YEARS.map((year) => ({ year: String(year) }));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { year: string };
  searchParams: { page?: string };
}): Promise<Metadata> {
  const year = Number(params.year);
  const page = parseInt(searchParams?.page || "1", 10);

  // ★ Pages 2+ are blocked by robots.txt (Disallow: /*?page=).
  // Return noindex to avoid "submitted URL blocked by robots.txt" errors.
  if (page > 1) {
    return {
      robots: { index: false, follow: true },
      title: `Odia Movies ${year} – Page ${page}`,
    };
  }

  return buildMeta({
    title: `Odia Movies ${year} A to Z – Complete Ollywood Films List`,
    description: `${year} Odia Movies A to Z full list – Browse all Ollywood films released in ${year} with movie names, directors, release dates, box office collection, cast, songs, and reviews. Complete ${year} Odia movie list.`,
    keywords: [
      // A-to-Z / list variants
      `Odia movies ${year} A to Z`,
      `A to Z Odia movies`,
      `${year} Odia movies list`,
      `${year} Odia films list`,
      `Odia movies list ${year}`,
      `Ollywood movies ${year} list`,
      `all Odia movies ${year}`,
      `complete list of Odia movies ${year}`,
      `Odia movies ${year} full list`,
      // Core year keywords
      `Odia movies ${year}`,
      `Ollywood ${year}`,
      `Odia films ${year}`,
      `Odia cinema ${year}`,
      `new Odia movies ${year}`,
      // Box office
      `Ollywood box office ${year}`,
      `Odia movie box office collection ${year}`,
      `${year} Ollywood blockbuster`,
      `${year} Odia hit movies`,
      // Cast & crew
      `Ollywood director ${year}`,
      `Odia movie release date ${year}`,
      `${year} Odia movie cast`,
      // Upcoming
      `upcoming Odia movies ${year}`,
      `new Ollywood movies ${year}`,
      `${year} Odia movies TBA`,
      // Generic Ollywood
      `Ollywood films`,
      `Odia film industry`,
      `Odia cinema`,
    ],
    url: `/movies/year/${year}`,
  });
}

// ─── JSON-LD structured data ────────────────────────────────────────────────────
function MovieListJsonLd({ movies, year }: { movies: any[]; year: number }) {
  const itemList = movies.slice(0, 50).map((m, i) => ({
    "@type": "ListItem",
    position: i + 1,
    item: {
      "@type": "Movie",
      name: m.title,
      url: `${SITE_URL}/movie/${m.slug}`,
      datePublished: m.releaseDate,
      director: m.director
        ? { "@type": "Person", name: m.director }
        : undefined,
    },
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Odia Movies ${year}`,
    description: `Complete list of Ollywood (Odia) films released in ${year}`,
    url: `${SITE_URL}/movies/year/${year}`,
    numberOfItems: movies.length,
    itemListElement: itemList,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── WebPage JSON-LD (enhances Google sitelinks / knowledge panel) ─────────────
function WebPageJsonLd({ year, total }: { year: number; total: number }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Odia Movies ${year} – Complete A to Z Ollywood Films List`,
    description: `Full list of ${total} Odia movies released in ${year}. Browse all Ollywood films with director, release date, box office verdict, cast and songs.`,
    url: `${SITE_URL}/movies/year/${year}`,
    inLanguage: "en-IN",
    isPartOf: { "@type": "WebSite", name: "Ollypedia", url: SITE_URL },
    about: {
      "@type": "Thing",
      name: "Ollywood",
      description: "Odia-language film industry based in Odisha, India",
    },
    dateModified: new Date().toISOString(),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── BreadcrumbList JSON-LD ────────────────────────────────────────────────────
function BreadcrumbJsonLd({ year }: { year: number }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Movies", item: `${SITE_URL}/movies` },
      { "@type": "ListItem", position: 3, name: `Odia Movies ${year}`, item: `${SITE_URL}/movies/year/${year}` },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Data fetch ────────────────────────────────────────────────────────────────
async function getMoviesByYear(year: number) {
  await connectDB();

  const startDateStr = `${year}-01-01`;
  const endDateStr   = `${year}-12-31`;
  const currentYear  = new Date().getFullYear();

  const yearDateMatches = [
    { releaseDate: { $regex: `^${year}` } },
    { releaseDate: { $gte: startDateStr, $lte: endDateStr } },
  ];

  const matchStage =
    year === currentYear
      ? {
          $or: [
            ...yearDateMatches,
            { releaseTBA: true },
            {
              $and: [
                { $or: [{ releaseDate: "" }, { releaseDate: null }, { releaseDate: { $exists: false } }] },
                { $or: [{ verdict: "Upcoming" }, { status: "Upcoming" }] },
              ],
            },
          ],
        }
      : {
          $or: yearDateMatches,
        };

  const movies = await Movie.aggregate([
    { $match: matchStage },
    { $project: { reviews: 0 } },
    {
      $addFields: {
        // Guard against empty/null releaseDate (TBA movies) — sort them to the bottom
        _releaseDateObj: mongoDateExpr("$releaseDate", "9999-12-31"),
        // Resolve director: use top-level field first, then fall back to
        // the first cast/crew entry whose role contains "director" (case-insensitive)
        director: {
          $cond: {
            if: { $and: [{ $ifNull: ["$director", false] }, { $ne: ["$director", ""] }] },
            then: "$director",
            else: {
              $let: {
                vars: {
                  directorEntry: {
                    $first: {
                      $filter: {
                        input: { $ifNull: ["$cast", []] },
                        as: "member",
                        cond: {
                          $regexMatch: {
                            input: { $ifNull: ["$$member.role", ""] },
                            regex: "director",
                            options: "i",
                          },
                        },
                      },
                    },
                  },
                },
                in: { $ifNull: ["$$directorEntry.name", null] },
              },
            },
          },
        },
      },
    },
    { $sort: { _releaseDateObj: -1, _id: -1 } },
  ]);

  return movies;
}

// ─── Fetch top cast members who appear most in that year's movies ──────────────
async function getTopCastByYear(movies: any[], limit = 12) {
  // Count how many movies each castId appears in
  const countMap: Record<string, number> = {};
  for (const movie of movies) {
    for (const entry of movie.cast || []) {
      const id = String(entry.castId);
      if (id && id.length === 24) countMap[id] = (countMap[id] || 0) + 1;
    }
  }
  // Sort by frequency, take top N
  const topIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id);

  if (!topIds.length) return [];

  const castMembers = await Cast.find(
    { _id: { $in: topIds } },
    "_id name type roles photo"
  ).lean();

  // Preserve frequency order
  const ordered = topIds
    .map(id => castMembers.find((c: any) => String(c._id) === id))
    .filter(Boolean) as any[];

  return ordered;
}
const VERDICT_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  Blockbuster: { color: "text-orange-400 bg-orange-500/15 border-orange-500/30", icon: Flame },
  Superhit:    { color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", icon: Star  },
  Hit:         { color: "text-green-400  bg-green-500/15  border-green-500/30",  icon: TrendingUp },
  Average:     { color: "text-blue-400   bg-blue-500/15   border-blue-500/30",   icon: Zap   },
  Flop:        { color: "text-red-400    bg-red-500/15    border-red-500/30",    icon: Clock },
  Upcoming:    { color: "text-sky-400    bg-sky-500/15    border-sky-500/30",    icon: Calendar },
};



// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function MoviesByYearPage({
  params,
}: {
  params: { year: string };
}) {
  const year = Number(params.year);

  if (isNaN(year) || year < 1900 || year > 2100) {
    notFound();
  }

  const movies = await getMoviesByYear(year);
  const total  = movies.length;

  // ★ SEO FIX: If a year has no movies in the DB, return 404.
  // This prevents Google from crawling thin/empty pages which trigger
  // "Crawled – currently not indexed" in Search Console.
  // Google prefers a clean 404 over an empty results page.
  if (total === 0) {
    notFound();
  }
  const topCast = await getTopCastByYear(movies);

  const verdictCounts: Record<string, number> = {};
  for (const m of movies) {
    const v = m.verdict || "Upcoming";
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  }

  const currentYear = new Date().getFullYear();
  const prevYear    = year - 1 >= 1936 ? year - 1 : null;
  const nextYear    = year + 1 <= currentYear + 5 ? year + 1 : null;

  return (
    <>
      {/* ── JSON-LD Structured Data ── */}
      <BreadcrumbJsonLd year={year} />
      <WebPageJsonLd year={year} total={total} />
      {total > 0 && <MovieListJsonLd movies={movies} year={year} />}

      <div className="min-h-screen bg-[#0a0a0a]">

        {/* ══ HERO BANNER ══ */}
        <section className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #050505 0%, #0f0500 40%, #080010 100%)" }}>
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[900px] h-[600px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.07) 0%, transparent 70%)" }} />
            <div className="absolute -right-20 bottom-0 w-[500px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />
            
            <div className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: "linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }} />
          </div>

          <div className="relative w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-10 md:py-14">
            
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-10">
              <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/movies" className="hover:text-orange-400 transition-colors">Movies</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-400">Movies of {year}</span>
            </nav>

            {/* ── Two-column layout ── */}
            <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* ── LEFT: Text content ── */}
              <div className="space-y-8">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <Calendar className="w-3.5 h-3.5" />
                  Year {year} Collection
                </div>

                {/* Heading */}
                <div>
                  <h1 className="font-black text-white leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                    <span className="block text-gray-300 font-extrabold" style={{ fontSize: "0.55em", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3em", color: "rgba(249,115,22,0.7)" }}>
                      Ollywood Films
                    </span>
                    Odia Movies{" "}
                    <span style={{
                      background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}>
                      {year}
                    </span>
                  </h1>
                </div>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed max-w-lg" style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}>
                  {year === currentYear
                    ? `Complete A to Z list of all Odia (Ollywood) movies released in ${year}. Every ${year} Odia film listed with movie name, director, and release date — updated regularly as new films hit theatres.`
                    : `Complete A to Z list of all Odia (Ollywood) movies released in ${year}. Find every Ollywood film from ${year} with director names, release dates, box office verdict, cast details, and reviews.`}
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{total}</div>
                    <div className="text-xs text-gray-600 font-medium mt-0.5">Films Released</div>
                  </div>
                  {verdictCounts["Blockbuster"] > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-white">{verdictCounts["Blockbuster"]}</div>
                      <div className="text-xs text-orange-500 font-medium mt-0.5">Blockbusters</div>
                    </div>
                  )}
                  {verdictCounts["Superhit"] > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-white">{verdictCounts["Superhit"]}</div>
                      <div className="text-xs text-yellow-500 font-medium mt-0.5">Superhits</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{year}</div>
                    <div className="text-xs text-gray-600 font-medium mt-0.5">Collection Year</div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Visual panel ── */}
              <div className="absolute right-0 sm:-right-4 top-0 lg:relative lg:right-auto lg:top-auto flex items-center justify-center min-h-[300px] lg:min-h-[400px] scale-[0.55] sm:scale-75 lg:scale-100 origin-top-right lg:origin-center pointer-events-none lg:pointer-events-auto opacity-20 sm:opacity-40 lg:opacity-100 z-0 lg:z-10">
                
                {/* Outer ring glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full border border-orange-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                  <div className="absolute w-64 h-64 rounded-full border border-orange-500/15" />
                </div>

                {/* Center Icon */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                  
                  {/* Main visual */}
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full flex items-center justify-center shadow-2xl animate-[spin_20s_linear_infinite]"
                      style={{
                        background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.15) 100%)",
                        border: "1px solid rgba(249,115,22,0.25)",
                        boxShadow: "0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}>
                      <Film className="w-20 h-20 text-orange-400" strokeWidth={1.2} />
                    </div>
                    {/* Play badge */}
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                      <Calendar className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Floating cards around the center */}
                  <div className="absolute -top-16 -left-20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "3s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <Calendar className="w-3 h-3" /> {year} Releases
                  </div>

                  <div className="absolute top-1/2 -right-24 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "2.5s", animationDelay: "1s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <TrendingUp className="w-3 h-3" /> Box Office Hits
                  </div>

                  <div className="absolute -bottom-10 left-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "3.5s", animationDelay: "0.5s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <Star className="w-3 h-3" /> {total} Movies
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>



        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-10 space-y-10">

          {/* ══════════════════════════════════════════════════════════
              VERDICT BREAKDOWN STATS
          ══════════════════════════════════════════════════ */}
          {total > 0 && Object.keys(verdictCounts).length > 0 && (
            <section aria-label="Box office verdict breakdown">
              <div className="flex flex-wrap gap-2">
                {Object.entries(verdictCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([verdict, count]) => {
                    const cfg = VERDICT_CONFIG[verdict];
                    if (!cfg) return null;
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={verdict}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${cfg.color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {verdict} <span className="opacity-60 ml-0.5">({count})</span>
                      </div>
                    );
                  })}
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════
              MOVIES TABLE
          ══════════════════════════════════════════════════════ */}
          <section aria-labelledby="movies-table-heading">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clapperboard className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <h2 id="movies-table-heading" className="font-display text-lg font-bold text-white">
                    {total > 0
                      ? `${total} Odia Films Released in ${year}`
                      : `No Movies Found for ${year}`}
                  </h2>
                  {total > 0 && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Sorted by release date — newest first. Click a movie name to view full details.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest hidden sm:inline-block">Select Year:</span>
                <YearDropdown currentYear={year} validYears={VALID_YEARS} />
              </div>
            </div>

            {total === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-[#141414] border border-[#222] rounded-2xl flex items-center justify-center mb-4">
                  <Film className="w-7 h-7 text-gray-600" />
                </div>
                <p className="text-gray-300 font-semibold text-lg mb-1">No movies found for {year}</p>
                <p className="text-gray-600 text-sm mb-5">
                  We may not have data for this year yet. Check back later or browse another year.
                </p>
                <Link
                  href="/movies"
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Browse All Movies
                </Link>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#1f1f1f] overflow-hidden bg-[#0d0d0d]">
                {/* min-w keeps all 5 cols visible; on very small screens a subtle scroll appears */}
                <div className="w-full overflow-x-auto -webkit-overflow-scrolling-touch">
                  <table
                    className="w-full min-w-[480px] text-sm"
                    role="table"
                    aria-label={`Odia movies list ${year}`}
                  >
                    <thead>
                      <tr className="border-b border-[#1f1f1f] bg-[#111]">
                        <th scope="col" className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 w-7">
                          #
                        </th>
                        <th scope="col" className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          Movie Name
                        </th>
                        <th scope="col" className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 flex-shrink-0" />
                            Director
                          </span>
                        </th>
                        <th scope="col" className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500 whitespace-nowrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            Release
                          </span>
                        </th>
                        <th scope="col" className="text-left px-2 sm:px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                          Verdict
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {movies.map((movie: any, index: number) => {
                        const verdictCfg = movie.verdict ? VERDICT_CONFIG[movie.verdict] : null;
                        const VerdictIcon = verdictCfg?.icon;
                        return (
                          <tr
                            key={String(movie._id)}
                            className="border-b border-[#161616] last:border-0 hover:bg-[#111] transition-colors group"
                          >
                            {/* # */}
                            <td className="px-2 sm:px-4 py-3 text-gray-600 text-[11px] tabular-nums align-top">
                              {index + 1}
                            </td>

                            {/* Movie name & Poster */}
                            <td className="px-2 sm:px-4 py-3 align-middle">
                              <Link
                                href={`/movie/${movie.slug}`}
                                className="flex items-center gap-3 group/link"
                                title={`${movie.title} – Odia Movie ${year}`}
                              >
                                <div className="w-10 sm:w-12 h-14 sm:h-16 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 flex-shrink-0 relative shadow-sm">
                                  {movie.posterUrl || movie.thumbnailUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={movie.posterUrl || movie.thumbnailUrl}
                                      alt={movie.title}
                                      className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-bold">
                                      🎬
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-white text-sm sm:text-base group-hover/link:text-orange-400 transition-colors leading-snug line-clamp-2">
                                    {movie.title}
                                  </span>
                                  {movie.originalTitle && movie.originalTitle !== movie.title && (
                                    <span className="text-[11px] text-zinc-500 line-clamp-1 block mt-0.5">
                                      {movie.originalTitle}
                                    </span>
                                  )}
                                </div>
                              </Link>
                            </td>

                            {/* Director */}
                            <td className="px-2 sm:px-4 py-3 text-gray-400 text-xs align-top leading-snug">
                              {movie.director ?? <span className="text-gray-700">—</span>}
                            </td>

                            {/* Release date */}
                            <td className="px-2 sm:px-4 py-3 text-gray-400 text-[11px] tabular-nums whitespace-nowrap align-top">
                              <time dateTime={movie.releaseDate || ""}>
                                {movie.releaseTBA ? "TBA" : formatReleaseDate(movie.releaseDate, movie.releaseDatePrecision, "short") || "TBA"}
                              </time>
                            </td>

                            {/* Verdict */}
                            <td className="px-2 sm:px-4 py-3 align-top">
                              {verdictCfg && VerdictIcon ? (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold whitespace-nowrap ${verdictCfg.color}`}>
                                  <VerdictIcon className="w-2.5 h-2.5 flex-shrink-0" />
                                  {movie.verdict}
                                </span>
                              ) : (
                                <span className="text-gray-700 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Table footer */}
                <div className="px-4 py-3 bg-[#111] border-t border-[#1a1a1a] flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    Showing <span className="text-gray-400 font-semibold">{total}</span> Odia films from {year}
                  </p>
                  <Link
                    href="/movies"
                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors flex items-center gap-1"
                  >
                    View all years <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════════════════
              YEAR NAVIGATION — prev / next (directly after table)
          ══════════════════════════════════════════════════════ */}
          <nav
            aria-label="Navigate between years"
            className="flex items-center justify-between py-2"
          >
            <div>
              {prevYear && (
                <Link
                  href={`/movies/year/${prevYear}`}
                  aria-label={`Odia movies of ${prevYear}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111] border border-[#222] text-sm font-semibold text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-all group"
                >
                  <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                  {prevYear} Films
                </Link>
              )}
            </div>

            <Link
              href="/movies"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-sm font-semibold text-orange-400 hover:bg-orange-500/20 transition-all"
            >
              <Film className="w-3.5 h-3.5" />
              All Movies
            </Link>

            <div>
              {nextYear && (
                <Link
                  href={`/movies/year/${nextYear}`}
                  aria-label={`Odia movies of ${nextYear}`}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111] border border-[#222] text-sm font-semibold text-gray-400 hover:text-orange-400 hover:border-orange-500/30 transition-all group"
                >
                  {nextYear} Films
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
            </div>
          </nav>

          {total > 0 && (
            <>
              {/* ══════════════════════════════════════════════════════════
                  SECTION 1 — OVERVIEW EDITORIAL
              ══════════════════════════════════════════════════════ */}
              <section
                aria-labelledby="seo-overview-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8 space-y-4"
              >
                <h2
                  id="seo-overview-heading"
                  className="font-display text-lg font-bold text-white flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Odia Movies {year} – Complete Ollywood Overview
                </h2>
                <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                  <p>
                    The year <strong className="text-gray-200">{year}</strong> is a landmark chapter
                    in <strong className="text-gray-200">Odia cinema</strong>, also known as{" "}
                    <strong className="text-gray-200">Ollywood</strong>. A total of{" "}
                    <strong className="text-gray-200">{total} Odia films</strong> were produced and
                    released in {year}, spanning a wide range of genres including action, romance,
                    family drama, comedy, mythology, thriller, and social issue-based narratives.
                    These films were shot predominantly in the Odia language and released across
                    Odisha and among Odia-speaking audiences globally.
                  </p>
                  <p>
                    Odia cinema has its roots dating back to 1936 with the release of{" "}
                    <em>Sita Bibaha</em>, the first Odia-language film. Over the decades, Ollywood
                    has grown into a thriving regional film industry, producing commercially
                    successful and critically acclaimed films each year. The {year} slate reflects
                    that continued growth, with films targeting multiplex audiences as well as
                    traditional single-screen theatres across Odisha.
                  </p>
                  {(verdictCounts["Blockbuster"] || verdictCounts["Superhit"] || verdictCounts["Hit"]) && (
                    <p>
                      In terms of box office performance, the {year} Ollywood season saw{" "}
                      {[
                        verdictCounts["Blockbuster"] && (
                          <strong key="bb" className="text-orange-400">
                            {verdictCounts["Blockbuster"]} Blockbuster{verdictCounts["Blockbuster"] > 1 ? "s" : ""}
                          </strong>
                        ),
                        verdictCounts["Superhit"] && (
                          <strong key="sh" className="text-yellow-400">
                            {verdictCounts["Superhit"]} Superhit{verdictCounts["Superhit"] > 1 ? "s" : ""}
                          </strong>
                        ),
                        verdictCounts["Hit"] && (
                          <strong key="h" className="text-green-400">
                            {verdictCounts["Hit"]} Hit{verdictCounts["Hit"] > 1 ? "s" : ""}
                          </strong>
                        ),
                      ]
                        .filter(Boolean)
                        .reduce<React.ReactNode[]>((acc, el, i, arr) => {
                          acc.push(el);
                          if (i < arr.length - 1) acc.push(i === arr.length - 2 ? " and " : ", ");
                          return acc;
                        }, [])}{" "}
                      — demonstrating the strong appetite of Odia audiences for quality regional
                      content. These successes helped boost confidence among producers and
                      distributors to invest further in the Ollywood ecosystem.
                    </p>
                  )}
                  {verdictCounts["Upcoming"] > 0 && (
                    <p>
                      Additionally, <strong className="text-sky-400">{verdictCounts["Upcoming"]} upcoming Odia films</strong>{" "}
                      are currently in production or post-production, with release dates yet to be
                      officially announced. These films are expected to release in theatres soon —
                      stay tuned to Ollypedia for the latest updates on cast, crew, trailers, and
                      release date announcements.
                    </p>
                  )}
                  <p>
                    Each movie listed in the table above has a dedicated page on Ollypedia featuring
                    the complete cast and crew, synopsis, songs, trailer, box office collection, and
                    audience reviews. Click any movie name to explore the full details.
                  </p>
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  KEYWORD TAGS — visible to Google, subtle on-page
              ══════════════════════════════════════════════════════ */}
              <section aria-label={`Search tags for Odia movies ${year}`} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl px-5 py-4">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mb-3">Related Searches</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    `Odia Movies ${year}`,
                    `${year} Odia Movies A to Z`,
                    `Ollywood ${year}`,
                    `${year} Odia Films List`,
                    `New Odia Movies ${year}`,
                    `Upcoming Odia Movies ${year}`,
                    `${year} Ollywood Blockbuster`,
                    `${year} Odia Hit Movies`,
                    `Odia Movies ${year} Full List`,
                    `${year} Ollywood Box Office`,
                    `${year} Odia Movie Cast`,
                    `${year} Odia Movie Release Date`,
                    `Best Odia Movies ${year}`,
                    `Latest Odia Movies ${year}`,
                    `All Odia Movies ${year}`,
                    `Watch Odia Movies ${year} Legally`,
                    `${year} Official Odia Movie Releases`,
                    `Odia Cinema ${year}`,
                    `Ollywood Films ${year}`,
                    `${year} Odia Romantic Movies`,
                    `${year} Odia Action Movies`,
                    `${year} Odia Comedy Movies`,
                    `${year} Odia Family Movies`,
                    `Odia Movie Director ${year}`,
                    `Odia Film Industry ${year}`,
                    `Babushaan Mohanty Movies ${year}`,
                    `Sabyasachi Mishra Movies ${year}`,
                    `Elina Samantray Movies ${year}`,
                    `Ollywood Blockbuster ${year}`,
                    `Aao NXT Odia Movies ${year}`,
                    `Kanccha Lannka Odia Movies ${year}`,
                    `Tarang Plus Odia Movies ${year}`,
                    `Odia Films ${year} IMDb`,
                    `${year} Odia Mythological Movies`,
                    `${year} Odia Thriller Movies`,
                    `Sarthak Music ${year}`,
                    `${year} Ollywood Superhit`,
                    `Odia Movie Trailer ${year}`,
                    `${year} Odia Film Songs`,
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-[11px] rounded-full border border-[#1f1f1f] bg-[#111] text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 2 — BOX OFFICE VERDICT BREAKDOWN
              ══════════════════════════════════════════════════════ */}
              {Object.keys(verdictCounts).length > 0 && (
                <section
                  aria-labelledby="verdict-breakdown-heading"
                  className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
                >
                  <h2
                    id="verdict-breakdown-heading"
                    className="font-display text-lg font-bold text-white flex items-center gap-2 mb-4"
                  >
                    <Award className="w-4 h-4 text-orange-500 flex-shrink-0" />
                    {year} Ollywood Box Office Verdict Breakdown
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
                    {Object.entries(verdictCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([verdict, count]) => {
                        const cfg = VERDICT_CONFIG[verdict];
                        if (!cfg) return null;
                        const Icon = cfg.icon;
                        return (
                          <div
                            key={verdict}
                            className={`flex flex-col items-center justify-center gap-1 py-4 px-3 rounded-xl border text-center ${cfg.color}`}
                          >
                            <Icon className="w-5 h-5 mb-1" />
                            <span className="text-lg font-black">{count}</span>
                            <span className="text-[11px] font-semibold opacity-80">{verdict}</span>
                          </div>
                        );
                      })}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    Out of <strong className="text-gray-300">{total} Odia movies in {year}</strong>,
                    the box office verdicts above reflect audience turnout and theatrical collection
                    across Odisha. Blockbuster and Superhit films typically run for 4–8 weeks in
                    theatres, while Average and Flop films have shorter runs. Upcoming films have
                    not yet been released and their verdict will be updated post-release.
                  </p>
                </section>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 3 — ABOUT OLLYWOOD
              ══════════════════════════════════════════════════════ */}
              <section
                aria-labelledby="about-ollywood-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8 space-y-3"
              >
                <h2
                  id="about-ollywood-heading"
                  className="font-display text-lg font-bold text-white flex items-center gap-2"
                >
                  <Globe className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  About Ollywood – Odia Film Industry
                </h2>
                <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                  <p>
                    <strong className="text-gray-200">Ollywood</strong> is the colloquial name for
                    the <strong className="text-gray-200">Odia-language film industry</strong> based
                    in <strong className="text-gray-200">Bhubaneswar and Cuttack</strong>, Odisha,
                    India. The industry produces over 30–50 films annually and has a dedicated
                    audience base of over 45 million Odia speakers in Odisha as well as Odia
                    diaspora communities across India and abroad.
                  </p>
                  <p>
                    Ollywood films are primarily exhibited in single-screen and multiplex theatres
                    across Odisha, with major centres in Bhubaneswar, Cuttack, Berhampur,
                    Sambalpur, Rourkela, and Balasore. Popular Ollywood stars include actors such
                    as Babushaan Mohanty, Sabyasachi Mishra, Anubhav Mohanty, Elina Samantray,
                    Sivani Sangita, and Archita Sahu, among many others.
                  </p>
                  <p>
                    Major Odia film production houses active in {year} include Ollywood studios and
                    independent producers who collaborate with dedicated Odia OTT platforms —{" "}
                    <strong className="text-gray-200">Aao NXT</strong>,{" "}
                    <strong className="text-gray-200">Kanccha Lannka</strong>, and{" "}
                    <strong className="text-gray-200">Tarang Plus</strong> — for digital releases
                    following their theatrical run.
                  </p>
                  <p>
                    <strong className="text-gray-200">Ollypedia</strong> is the most comprehensive
                    online encyclopedia for Odia cinema, covering every film from{" "}
                    {Math.min(...VALID_YEARS)} to {Math.max(...VALID_YEARS)} with detailed
                    information on cast, crew, songs, trailers, box office performance, and audience
                    reviews — all in one place.
                  </p>
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 4 — FAQ (triggers Google FAQ rich results)
              ══════════════════════════════════════════════════════ */}
              <section
                aria-labelledby="faq-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="faq-heading"
                  className="font-display text-lg font-bold text-white flex items-center gap-2 mb-5"
                >
                  <HelpCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Frequently Asked Questions – Odia Movies {year}
                </h2>

                {/* FAQ JSON-LD for Google rich results */}
                <script
                  type="application/ld+json"
                  dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                      "@context": "https://schema.org",
                      "@type": "FAQPage",
                      mainEntity: [
                        {
                          "@type": "Question",
                          name: `What is the A to Z list of Odia movies in ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `The complete A to Z list of ${year} Odia movies includes all ${total} Ollywood films released in ${year}, listed with movie name, director, release date, and box office verdict. The full list is available on Ollypedia.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `How many Odia movies were released in ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `A total of ${total} Odia (Ollywood) movies were released in ${year}. These films span a range of genres including action, romance, drama, comedy, mythology, and thriller.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Which is the best Odia movie of ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `The best Odia movies of ${year} include films that earned Blockbuster and Superhit verdicts at the box office. Visit Ollypedia's ${year} Odia movies list to see all films ranked by performance.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `What are the new Odia movies releasing in ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `New Odia movies releasing in ${year} are updated regularly on Ollypedia. Several upcoming Ollywood films have TBA release dates. Visit the ${year} Odia movies page on Ollypedia for the latest announcements.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Which is the biggest Odia blockbuster of ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `Ollypedia tracks box office verdicts for all ${year} Odia films. Visit individual movie pages on Ollypedia to check which films earned the Blockbuster verdict in ${year}.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Where can I watch Odia movies of ${year} online?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `${year} Odia movies are available to stream on Odia OTT platforms including Aao NXT (aaonxt.com), Kanccha Lannka (kancchalannka.com), and Tarang Plus (tarangplus.in) following their theatrical release. Check individual movie pages on Ollypedia for streaming availability.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Which upcoming Odia movies are releasing in ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `Several Odia films are upcoming in ${year} with TBA (To Be Announced) release dates. Visit Ollypedia's ${year} Odia movies page for the latest list of upcoming Ollywood films with their announced cast and directors.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `What is Ollywood?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `Ollywood is the informal name for the Odia-language film industry based in Odisha, India. It produces films primarily in the Odia language for audiences in Odisha and the global Odia diaspora.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Which OTT platform has the most ${year} Odia movies?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `The dedicated Odia OTT platforms for ${year} Ollywood movies are Aao NXT (aaonxt.com), Kanccha Lannka (kancchalannka.com), and Tarang Plus (tarangplus.in). These platforms specialise in Odia content and carry the most complete catalogues of ${year} Odia films.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `Who are the top Ollywood actors of ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `Leading Ollywood actors in ${year} include Babushaan Mohanty, Sabyasachi Mishra, Anubhav Mohanty, and Sidhant Mohapatra. Top actresses include Elina Samantray, Sivani Sangita, Archita Sahu, and Riya Dey.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `What genres are popular in ${year} Odia cinema?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `The most popular genres in ${year} Odia cinema are action, romance, family drama, and comedy. Mythological, thriller, and social-issue films are also widely produced in Ollywood.`,
                          },
                        },
                        {
                          "@type": "Question",
                          name: `How many Odia films were Blockbusters in ${year}?`,
                          acceptedAnswer: {
                            "@type": "Answer",
                            text: `Ollypedia tracks the box office verdict for every ${year} Odia film. Visit the ${year} Odia movies page on Ollypedia to see the exact count of Blockbuster, Superhit, Hit, Average, and Flop verdicts for that year.`,
                          },
                        },
                      ],
                    }),
                  }}
                />

                <div className="space-y-4">
                  {[
                    {
                      q: `What is the A to Z list of Odia movies in ${year}?`,
                      a: `The complete A to Z list of ${year} Odia movies is available in the table above. All ${total} Ollywood films released in ${year} are listed alphabetically by title, along with their director, release date, and box office verdict.`,
                    },
                    {
                      q: `How many Odia movies were released in ${year}?`,
                      a: `A total of ${total} Odia (Ollywood) movies were released in ${year}, spanning genres like action, romance, family drama, comedy, mythology, and thriller. The full list with release dates and directors is available in the table above.`,
                    },
                    {
                      q: `Which is the best Odia movie of ${year}?`,
                      a: `The best Odia movies of ${year} are determined by box office performance and audience ratings. Ollypedia tracks verdicts like Blockbuster, Superhit, and Hit for all ${year} Odia films. Click any movie in the list above to see its full ratings, reviews, and verdict.`,
                    },
                    {
                      q: `Which is the biggest Odia blockbuster of ${year}?`,
                      a: `Ollypedia tracks box office verdicts for all ${year} Odia films. Click on any movie name in the table above to see its full box office collection, verdict, and audience response.`,
                    },
                    {
                      q: `What are the new Odia movies releasing in ${year}?`,
                      a: `New Odia movies releasing in ${year} are listed at the top of the table above, with upcoming films marked "TBA" for release date. Ollypedia updates the ${year} Odia movies list regularly as new films are announced and released.`,
                    },
                    {
                      q: `Where can I watch Odia movies of ${year} online?`,
                      a: `Most ${year} Odia movies are available to stream on dedicated Odia OTT platforms — Aao NXT (aaonxt.com), Kanccha Lannka (kancchalannka.com), and Tarang Plus (tarangplus.in) — after their theatrical run. Individual movie pages on Ollypedia include direct streaming links where available.`,
                    },
                    {
                      q: `Which upcoming Odia movies are releasing in ${year}?`,
                      a: `Several Odia films have TBA (To Be Announced) release dates in ${year}. These are shown at the top of the table above marked as "Upcoming". Ollypedia updates this list regularly as official release dates are announced.`,
                    },
                    {
                      q: `What is Ollywood?`,
                      a: `Ollywood is the name for the Odia-language film industry based in Bhubaneswar and Cuttack, Odisha. It produces 30–50 films annually for Odia-speaking audiences across India and the global diaspora.`,
                    },
                    {
                      q: `Which OTT platform has the most ${year} Odia movies?`,
                      a: `The dedicated Odia OTT platforms for ${year} Ollywood movies are Aao NXT (aaonxt.com), Kanccha Lannka (kancchalannka.com), and Tarang Plus (tarangplus.in). These platforms specialise in Odia content and carry the most complete catalogues of ${year} Odia films. Visit individual movie pages on Ollypedia for direct streaming links.`,
                    },
                    {
                      q: `Who are the top Ollywood actors of ${year}?`,
                      a: `Leading Ollywood actors in ${year} include Babushaan Mohanty, Sabyasachi Mishra, Anubhav Mohanty, and Sidhant Mohapatra, among others. Top actresses include Elina Samantray, Sivani Sangita, Archita Sahu, and Riya Dey. See all cast details on individual movie pages on Ollypedia.`,
                    },
                    {
                      q: `What genres are popular in ${year} Odia cinema?`,
                      a: `The most popular genres in ${year} Odia cinema include action, romance, family drama, and comedy. Mythological, thriller, and social-issue films also have strong followings. The full ${year} Odia movies list on Ollypedia is filterable by genre.`,
                    },
                    {
                      q: `How many Odia films were Blockbusters in ${year}?`,
                      a: `Ollypedia tracks the box office verdict — Blockbuster, Superhit, Hit, Average, or Flop — for every ${year} Odia film. See the verdict breakdown section above for the exact number of ${year} Ollywood Blockbusters and Superhits.`,
                    },
                  ].map(({ q, a }, i) => (
                    <details
                      key={i}
                      className="group border border-[#1f1f1f] rounded-xl overflow-hidden"
                    >
                      <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer list-none bg-[#111] hover:bg-[#161616] transition-colors">
                        <span className="text-sm font-semibold text-gray-200">{q}</span>
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0 transition-transform group-open:rotate-90" />
                      </summary>
                      <div className="px-4 py-3 text-sm text-gray-400 leading-relaxed border-t border-[#1a1a1a] bg-[#0d0d0d]">
                        {a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 5 — EXPLORE BY YEAR (internal links)
              ══════════════════════════════════════════════════════ */}
              <section
                aria-labelledby="browse-years-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="browse-years-heading"
                  className="font-display text-base font-bold text-white flex items-center gap-2 mb-4"
                >
                  <Sparkles className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Explore Odia Movies by Year
                </h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Ollypedia covers the complete history of Ollywood films from{" "}
                  {Math.min(...VALID_YEARS)} to {Math.max(...VALID_YEARS)}. Browse any year below to
                  see the full list of Odia movies with directors, release dates, and box office verdicts.
                </p>
                <div className="flex flex-wrap gap-2">
                  {VALID_YEARS.filter((yr) => yr !== year).map((yr) => (
                    <Link
                      key={yr}
                      href={`/movies/year/${yr}`}
                      title={`Odia movies released in ${yr}`}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#222] bg-[#111] text-gray-400 hover:border-orange-500/40 hover:text-orange-400 transition-all"
                    >
                      Odia Movies {yr}
                    </Link>
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 6 — BROWSE BY GENRE (internal link hub)
              ══════════════════════════════════════════════════ */}
              <section
                aria-labelledby="browse-genre-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="browse-genre-heading"
                  className="font-display text-base font-bold text-white flex items-center gap-2 mb-4"
                >
                  <Film className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Browse {year} Odia Movies by Genre
                </h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Ollywood produces films across every genre. Filter {year} Odia movies by genre to find the exact type of film you are looking for.
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: `${year} Odia Action Movies`,    href: `/movies/action`    },
                    { label: `${year} Odia Romance Movies`,   href: `/movies/romance`   },
                    { label: `${year} Odia Comedy Movies`,    href: `/movies/comedy`    },
                    { label: `${year} Odia Drama Movies`,     href: `/movies/drama`     },
                    { label: `${year} Odia Family Movies`,    href: `/movies/family`    },
                    { label: `${year} Odia Thriller Movies`,  href: `/movies/thriller`  },
                    { label: `${year} Odia Mythological Films`, href: `/movies/mythological` },
                    { label: `${year} Odia Horror Movies`,   href: `/movies/horror`    },
                    { label: `${year} Odia Social Films`,    href: `/movies/social`    },
                    { label: `${year} Odia Devotional Films`, href: `/movies/devotional` },
                  ].map(({ label, href }) => (
                    <Link
                      key={label}
                      href={href}
                      title={label}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#222] bg-[#111] text-gray-400 hover:border-orange-500/40 hover:text-orange-400 transition-all"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 7 — POPULAR OLLYWOOD ACTORS & ACTRESSES
              ══════════════════════════════════════════════════ */}
              {topCast.length > 0 && (
              <section
                aria-labelledby="popular-stars-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="popular-stars-heading"
                  className="font-display text-base font-bold text-white flex items-center gap-2 mb-2"
                >
                  <Star className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Popular Ollywood Stars in {year}
                </h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  Leading cast members who appeared in the most {year} Ollywood films. Click a name to see their full profile and filmography on Ollypedia.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {topCast.map((member: any) => {
                    const role = member.roles?.[0] || member.type || "Artist";
                    return (
                      <Link
                        key={String(member._id)}
                        href={`/cast/${String(member._id)}`}
                        title={`${member.name} – Ollywood ${role}`}
                        className="flex flex-col px-3 py-2.5 rounded-xl border border-[#1f1f1f] bg-[#111] hover:border-orange-500/30 hover:bg-[#161616] transition-all group"
                      >
                        <span className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors leading-snug">
                          {member.name}
                        </span>
                        <span className="text-[10px] text-gray-600 mt-0.5">{role}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
              )}

              {/* ══════════════════════════════════════════════════════════
                  SECTION 8 — OTT STREAMING PLATFORMS
              ══════════════════════════════════════════════════ */}
              <section
                aria-labelledby="ott-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="ott-heading"
                  className="font-display text-base font-bold text-white flex items-center gap-2 mb-2"
                >
                  <Globe className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  Watch {year} Odia Movies Online – OTT Platforms
                </h2>
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                  After their theatrical run, most {year} Odia movies are available to stream on popular OTT platforms. Here is where you can watch Ollywood films online:
                </p>
                <div className="space-y-2 text-sm text-gray-400 leading-relaxed">
                  {[
                    {
                      platform: "Aao NXT",
                      url: "https://aaonxt.com/",
                      desc: `Aao NXT is a dedicated Odia OTT platform streaming ${year} Ollywood movies, web series, and exclusive Odia content. The go-to destination for Odia digital entertainment.`,
                    },
                    {
                      platform: "Kanccha Lannka",
                      url: "https://www.kancchalannka.com/",
                      desc: `Kanccha Lannka is a popular Odia streaming platform featuring ${year} Ollywood releases, classic Odia films, and original Odia content not available elsewhere.`,
                    },
                    {
                      platform: "Tarang Plus",
                      url: "https://tarangplus.in/",
                      desc: `Tarang Plus is the official OTT platform of Tarang TV, offering ${year} Odia movies, Odia serials, and live TV. One of the most trusted names in Odia digital streaming.`,
                    },
                  ].map(({ platform, url, desc }) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`Watch Odia movies on ${platform}`}
                      className="flex gap-3 p-3 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-orange-500/30 hover:bg-[#161616] transition-all group"
                    >
                      <ExternalLink className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5 group-hover:text-orange-400" />
                      <div>
                        <span className="text-gray-200 font-semibold group-hover:text-orange-400 transition-colors">{platform} ↗</span>
                        <p className="text-gray-500 text-xs mt-0.5">{desc}</p>
                      </div>
                    </a>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Availability varies by title. Visit individual movie pages on Ollypedia for direct streaming links where available.
                </p>
              </section>

              {/* ══════════════════════════════════════════════════════════
                  SECTION 9 — YEAR COMPARISON (boosts dwell time & links)
              ══════════════════════════════════════════════════ */}
              <section
                aria-labelledby="year-compare-heading"
                className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8"
              >
                <h2
                  id="year-compare-heading"
                  className="font-display text-base font-bold text-white flex items-center gap-2 mb-2"
                >
                  <TrendingUp className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  How Does {year} Compare to Other Ollywood Years?
                </h2>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  The Odia film industry has grown steadily year on year. In {year}, Ollywood released{" "}
                  <strong className="text-gray-200">{total} films</strong> — spanning action, romance,
                  drama, comedy, and more. Compare with recent years:
                </p>
                <div className="flex flex-wrap gap-2">
                  {VALID_YEARS.filter((yr) => yr !== year).slice(0, 8).map((yr) => (
                    <Link
                      key={yr}
                      href={`/movies/year/${yr}`}
                      title={`Compare ${year} vs ${yr} Odia movies`}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-[#222] bg-[#111] text-gray-400 hover:border-orange-500/40 hover:text-orange-400 transition-all"
                    >
                      {yr} Odia Movies
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </>
  );
}