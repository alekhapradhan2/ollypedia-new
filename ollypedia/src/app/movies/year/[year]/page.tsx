// app/movies/year/[year]/page.tsx
import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import { buildMeta } from "@/lib/seo";
import {
  Film, Calendar, ChevronRight, Clapperboard,
  TrendingUp, Star, Flame, Clock, Zap, User, ExternalLink,
} from "lucide-react";

export const revalidate = 600;

// ─── Valid years ───────────────────────────────────────────────────────────────
const _OLDEST_YEAR = 2014;
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
}: {
  params: { year: string };
}): Promise<Metadata> {
  const year = Number(params.year);
  return buildMeta({
    title: `Odia Movies ${year} – Complete Ollywood Films List | Ollypedia`,
    description: `Browse the complete list of Odia (Ollywood) movies released in ${year}. Find movie names, directors, release dates, box office collection, cast, songs, and reviews for all ${year} Odia films.`,
    keywords: [
      `Odia movies ${year}`,
      `Ollywood ${year}`,
      `Odia films ${year}`,
      `Odia cinema ${year}`,
      `new Odia movies ${year}`,
      `Ollywood box office ${year}`,
      `Odia film list ${year}`,
      `Ollywood director ${year}`,
      `Odia movie release date ${year}`,
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
      url: `https://ollypedia.com/movie/${m.slug}`,
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
    url: `https://ollypedia.com/movies/year/${year}`,
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

// ─── BreadcrumbList JSON-LD ────────────────────────────────────────────────────
function BreadcrumbJsonLd({ year }: { year: number }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://ollypedia.com" },
      { "@type": "ListItem", position: 2, name: "Movies", item: "https://ollypedia.com/movies" },
      { "@type": "ListItem", position: 3, name: `Odia Movies ${year}`, item: `https://ollypedia.com/movies/year/${year}` },
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

  const startDate = new Date(`${year}-01-01`);
  const endDate   = new Date(`${year}-12-31T23:59:59`);

  const movies = await Movie.aggregate([
    {
      $match: {
        releaseDate: {
          $gte: startDate.toISOString().split("T")[0],
          $lte: endDate.toISOString().split("T")[0],
        },
      },
    },
    { $project: { reviews: 0 } },
    {
      $addFields: {
        _releaseDateObj: { $toDate: "$releaseDate" },
      },
    },
    { $sort: { _releaseDateObj: -1, _id: -1 } },
  ]);

  return movies;
}

// ─── Verdict badge config ──────────────────────────────────────────────────────
const VERDICT_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  Blockbuster: { color: "text-orange-400 bg-orange-500/15 border-orange-500/30", icon: Flame },
  Superhit:    { color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30", icon: Star  },
  Hit:         { color: "text-green-400  bg-green-500/15  border-green-500/30",  icon: TrendingUp },
  Average:     { color: "text-blue-400   bg-blue-500/15   border-blue-500/30",   icon: Zap   },
  Flop:        { color: "text-red-400    bg-red-500/15    border-red-500/30",    icon: Clock },
  Upcoming:    { color: "text-sky-400    bg-sky-500/15    border-sky-500/30",    icon: Calendar },
};

// ─── Format release date ────────────────────────────────────────────────────────
function formatReleaseDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default async function MoviesByYearPage({
  params,
}: {
  params: { year: string };
}) {
  const year = Number(params.year);

  if (isNaN(year) || !VALID_YEARS.includes(year)) {
    notFound();
  }

  const movies = await getMoviesByYear(year);
  const total  = movies.length;

  const verdictCounts: Record<string, number> = {};
  for (const m of movies) {
    const v = m.verdict || "Upcoming";
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  }

  const currentYear = new Date().getFullYear();
  const prevYear    = VALID_YEARS[VALID_YEARS.indexOf(year) + 1];
  const nextYear    = VALID_YEARS[VALID_YEARS.indexOf(year) - 1];

  return (
    <>
      {/* ── JSON-LD Structured Data ── */}
      <BreadcrumbJsonLd year={year} />
      {total > 0 && <MovieListJsonLd movies={movies} year={year} />}

      <div className="min-h-screen bg-[#0a0a0a]">

        {/* ══════════════════════════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════════════════════════ */}
        <section
          className="relative overflow-hidden bg-gradient-to-b from-[#0d0d0d] to-[#0a0a0a] border-b border-[#1f1f1f]"
          aria-label={`Odia movies from ${year}`}
        >
          {/* Decorative glows */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/6 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-orange-600/4 rounded-full blur-2xl" />
            <div className="absolute inset-0"
              style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #f9731608 0%, transparent 60%)" }} />
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 relative z-10">

            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-xs text-gray-500 mb-5 flex-wrap" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href="/movies" className="hover:text-orange-400 transition-colors">Movies</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-orange-400 font-medium">Movies of {year}</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-orange-500" />
                  </div>
                  {/* H1 — primary SEO heading */}
                  <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight">
                    Odia Movies {year} – Ollywood Films List
                  </h1>
                </div>
                <p className="text-gray-400 text-sm md:text-base max-w-2xl leading-relaxed">
                  {year === currentYear
                    ? `Discover all Odia (Ollywood) movies released in ${year}. This page lists every ${year} Odia film with the movie name, director, and release date — updated regularly as new films hit theatres.`
                    : `Complete A–Z list of Odia (Ollywood) movies released in ${year}. Find every Ollywood film from ${year} along with director names, release dates, box office verdict, cast details, and reviews.`}
                </p>
              </div>

              {/* Movie count pill */}
              <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-xl px-5 py-3 self-start md:self-auto flex-shrink-0">
                <Film className="w-4 h-4 text-orange-500" />
                <span className="text-2xl font-black text-white font-display">{total}</span>
                <span className="text-xs text-gray-500 leading-tight">Odia<br />films</span>
              </div>
            </div>

            {/* Year navigator */}
            <div className="flex items-center gap-2 mt-6 flex-wrap">
              <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mr-1">Browse year:</span>
              {VALID_YEARS.map((yr) => (
                <Link
                  key={yr}
                  href={`/movies/year/${yr}`}
                  aria-label={`Odia movies of ${yr}`}
                  aria-current={yr === year ? "page" : undefined}
                  className={[
                    "px-3 py-1 rounded-lg text-xs font-semibold transition-all",
                    yr === year
                      ? "bg-orange-500 text-white shadow-md shadow-orange-500/25"
                      : "bg-[#141414] border border-[#222] text-gray-400 hover:border-orange-500/40 hover:text-orange-400",
                  ].join(" ")}
                >
                  {yr}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">

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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-orange-500/15 rounded-lg flex items-center justify-center">
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

                            {/* Movie name */}
                            <td className="px-2 sm:px-4 py-3 align-top">
                              <Link
                                href={`/movie/${movie.slug}`}
                                className="font-semibold text-white hover:text-orange-400 transition-colors inline-flex items-start gap-1 group/link"
                                title={`${movie.title} – Odia Movie ${year}`}
                              >
                                <span className="leading-snug">{movie.title}</span>
                                <ExternalLink className="w-3 h-3 mt-0.5 opacity-0 group-hover/link:opacity-50 transition-opacity flex-shrink-0" />
                              </Link>
                            </td>

                            {/* Director */}
                            <td className="px-2 sm:px-4 py-3 text-gray-400 text-xs align-top leading-snug">
                              {movie.director ?? <span className="text-gray-700">—</span>}
                            </td>

                            {/* Release date */}
                            <td className="px-2 sm:px-4 py-3 text-gray-400 text-[11px] tabular-nums whitespace-nowrap align-top">
                              <time dateTime={movie.releaseDate}>
                                {formatReleaseDate(movie.releaseDate)}
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
              SEO CONTENT BLOCK
          ══════════════════════════════════════════════════════ */}
          {total > 0 && (
            <section
              aria-labelledby="seo-content-heading"
              className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 md:p-8 space-y-4"
            >
              <h2
                id="seo-content-heading"
                className="font-display text-base font-bold text-white flex items-center gap-2"
              >
                <span className="w-1 h-5 bg-orange-500 rounded-full inline-block" />
                About Odia Movies {year} – Ollywood Cinema
              </h2>

              <div className="space-y-3 text-sm text-gray-400 leading-relaxed">
                <p>
                  The <strong className="text-gray-300">{year} Ollywood lineup</strong> featured{" "}
                  <strong className="text-gray-300">{total} Odia films</strong> spanning action,
                  romance, drama, comedy, and mythology — continuing the rich legacy of{" "}
                  <strong className="text-gray-300">Odia cinema</strong>. Each entry in the table
                  above links to a dedicated movie page with full cast, crew, songs, trailer, and
                  box office data.
                </p>

                {verdictCounts["Blockbuster"] || verdictCounts["Superhit"] || verdictCounts["Hit"] ? (
                  <p>
                    Among the {year} releases,{" "}
                    {[
                      verdictCounts["Blockbuster"] && `${verdictCounts["Blockbuster"]} blockbuster${verdictCounts["Blockbuster"] > 1 ? "s" : ""}`,
                      verdictCounts["Superhit"]    && `${verdictCounts["Superhit"]} superhit${verdictCounts["Superhit"] > 1 ? "s" : ""}`,
                      verdictCounts["Hit"]         && `${verdictCounts["Hit"]} hit${verdictCounts["Hit"] > 1 ? "s" : ""}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}{" "}
                    proved the strength of Odia audience support for quality regional content.
                  </p>
                ) : null}

                <p>
                  Ollypedia is the most comprehensive database for{" "}
                  <strong className="text-gray-300">Odia movies</strong>, covering everything from
                  classic films to the latest Ollywood releases. Use the year navigator above to
                  explore Odia films from {Math.min(...VALID_YEARS)} to {Math.max(...VALID_YEARS)}.
                </p>
              </div>

              {/* Internal year links for SEO */}
              <div className="pt-2">
                <p className="text-[11px] text-gray-600 font-bold uppercase tracking-widest mb-2">
                  Explore Odia movies by year:
                </p>
                <div className="flex flex-wrap gap-2">
                  {VALID_YEARS.filter((yr) => yr !== year).map((yr) => (
                    <Link
                      key={yr}
                      href={`/movies/year/${yr}`}
                      title={`Odia movies released in ${yr}`}
                      className="px-3 py-1 text-xs font-semibold rounded-lg border border-[#222] bg-[#111] text-gray-500 hover:border-orange-500/40 hover:text-orange-400 transition-all"
                    >
                      Odia Movies {yr}
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════════════════════════════════════════════
              YEAR NAVIGATION — prev / next
          ══════════════════════════════════════════════════════ */}
          <nav
            aria-label="Navigate between years"
            className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]"
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

        </div>
      </div>
    </>
  );
}