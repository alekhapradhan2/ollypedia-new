// app/movies/year/[year]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// WHY PAGES WEREN'T INDEXING — fixes applied here:
//   1. No sitemap.xml entry  → add app/sitemap.ts (separate file below)
//   2. No robots.txt         → add app/robots.ts  (separate file below)
//   3. revalidate too short  → bumped to 86400 (daily); Googlebot caches aggressively
//   4. `dynamicParams = true` but NO sitemap → Google never discovers the URLs
//   5. Missing WebSite + WebPage + Organization schema → Google can't establish entity
//   6. FAQ JSON-LD hidden in <details> → Google ignores collapsed content; moved inline
//   7. Thin/duplicate intro text → rewritten, unique per year
//   8. Missing `<link rel="prev"/"next">` → added via alternates
//   9. No explicit `lastModified` in metadata → added
//  10. Open Graph image path was /og/movies-{year}.jpg (404 for most years) → switched to
//      a real OG image that exists, falling back to site default
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export const revalidate    = 86400;   // re-generate at most once per day
export const dynamicParams = true;

// ─── Constants ────────────────────────────────────────────────────────────────
const SITE_URL   = "https://ollypedia.in";
const SITE_NAME  = "Ollypedia";
const OG_DEFAULT = `${SITE_URL}/og-default.jpg`;   // one image that actually exists
const YEAR_START = 2000;
const YEAR_END   = new Date().getFullYear();
const ALL_YEARS  = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_END - i);

// ─── Static params (tells Next.js every valid URL at build time) ───────────────
export async function generateStaticParams() {
  return ALL_YEARS.map((year) => ({ year: String(year) }));
}

// ─── Data fetcher ─────────────────────────────────────────────────────────────
async function getMoviesByYear(year: number) {
  await connectDB();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end   = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const movies = await Movie.find(
    { releaseDate: { $gte: start, $lt: end } },
    "title slug releaseDate director genre verdict posterUrl"
  )
    .sort({ releaseDate: 1 })
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

// ─── SEO text helpers ─────────────────────────────────────────────────────────

function buildTitle(year: number, count: number): string {
  if (count === 0)
    return `Odia Movies ${year} | Ollywood Film List – ${SITE_NAME}`;
  return `Odia Movies ${year} – All ${count} Ollywood Films with Director & Release Date | ${SITE_NAME}`;
}

function buildDescription(year: number, movies: any[]): string {
  const count   = movies.length;
  const topDirs = uniqueDirs(movies).slice(0, 3);
  const dirStr  = topDirs.length ? ` Directed by ${topDirs.join(", ")} and more.` : "";
  if (count === 0)
    return `Discover Odia (Ollywood) movies released in ${year}. Ollypedia is updating its database for ${year}. Browse complete Odia film lists by year.`.slice(0, 160);
  return `Complete list of all ${count} Odia (Ollywood) movies released in ${year} — with director name, release date and verdict.${dirStr} Updated on Ollypedia.`.slice(0, 160);
}

function buildKeywords(year: number, movies: any[]): string {
  const dirs   = uniqueDirs(movies).slice(0, 5);
  const titles = movies.slice(0, 8).map((m: any) => m.title as string);
  return [...new Set([
    `odia movies ${year}`,
    `ollywood movies ${year}`,
    `odia films ${year}`,
    `odia movies ${year} list`,
    `odia movies ${year} with director`,
    `odia movies ${year} release date`,
    `best odia movies ${year}`,
    `new odia movies ${year}`,
    `ollywood ${year} film list`,
    `odia cinema ${year}`,
    `odia movie names ${year}`,
    `all odia movies ${year}`,
    `top odia movies ${year}`,
    ...dirs.map((d) => `${d} odia movie`),
    ...titles.map((t) => `${t} odia movie`),
    "odia movies", "ollywood movies", "odia film list",
  ])].join(", ");
}

function uniqueDirs(movies: any[]): string[] {
  return [...new Set(
    movies
      .flatMap((m: any) => Array.isArray(m.director) ? m.director : [m.director])
      .filter(Boolean)
  )] as string[];
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

// ─── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { year: string };
}): Promise<Metadata> {
  const year = Number(params.year);
  if (isNaN(year) || year < YEAR_START || year > YEAR_END)
    return { robots: { index: false, follow: false } };

  const movies      = await getMoviesByYear(year);
  const title       = buildTitle(year, movies.length);
  const description = buildDescription(year, movies);
  const keywords    = buildKeywords(year, movies);
  const canonical   = `${SITE_URL}/movies/year/${year}`;
  const prevYear    = year - 1 >= YEAR_START ? year - 1 : null;
  const nextYear    = year + 1 <= YEAR_END   ? year + 1 : null;

  return {
    title,
    description,
    keywords,

    // ── Canonical + prev/next pagination signals ────────────────────────
    alternates: {
      canonical,
      ...(prevYear || nextYear ? {
        // These tell Google these pages are NOT duplicates of each other
        ...(prevYear ? { prev: `${SITE_URL}/movies/year/${prevYear}` } : {}),
        ...(nextYear ? { next: `${SITE_URL}/movies/year/${nextYear}` } : {}),
      } : {}),
      languages: {
        "en-IN": canonical,
        "or":    canonical,   // Odia language code
        "x-default": canonical,
      },
    },

    // ── Open Graph ──────────────────────────────────────────────────────
    openGraph: {
      type:        "website",
      siteName:    SITE_NAME,
      url:         canonical,
      title,
      description,
      locale:      "en_IN",
      images: [
        {
          url:    OG_DEFAULT,   // a real image — 404 OG images hurt indexing
          width:  1200,
          height: 630,
          alt:    `Odia Movies ${year} – Complete Ollywood Film List on Ollypedia`,
        },
      ],
    },

    // ── Twitter Card ────────────────────────────────────────────────────
    twitter: {
      card:        "summary_large_image",
      site:        "@ollypedia",
      creator:     "@ollypedia",
      title,
      description,
      images:      [OG_DEFAULT],
    },

    // ── Robots — EXPLICIT is better than relying on defaults ────────────
    robots: {
      index:     movies.length > 0,   // don't index empty-year pages
      follow:    true,
      googleBot: {
        index:               movies.length > 0,
        follow:              true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet":       -1,
      },
    },

    // ── Other signals ───────────────────────────────────────────────────
    authors:   [{ name: SITE_NAME, url: SITE_URL }],
    creator:   SITE_NAME,
    publisher: SITE_NAME,
    category:  "Entertainment",

    // lastModified tells Google this content is fresh
    other: {
      "article:modified_time": new Date().toISOString(),
    },
  };
}

// ─── JSON-LD builders ─────────────────────────────────────────────────────────

/** WebSite + Sitelinks Searchbox — establishes entity, only needed once but fine per page */
function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    "@id":      `${SITE_URL}/#website`,
    name:       SITE_NAME,
    url:        SITE_URL,
    description: "Ollypedia — The complete Odia (Ollywood) cinema database.",
    inLanguage:  ["en-IN", "or"],
    potentialAction: {
      "@type":       "SearchAction",
      target: {
        "@type":       "EntryPoint",
        urlTemplate:   `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    publisher: {
      "@type": "Organization",
      "@id":   `${SITE_URL}/#organization`,
      name:    SITE_NAME,
      url:     SITE_URL,
      logo: {
        "@type":       "ImageObject",
        url:           `${SITE_URL}/logo.png`,
        width:         512,
        height:        512,
      },
      sameAs: [
        "https://www.facebook.com/ollypedia",
        "https://twitter.com/ollypedia",
        "https://www.instagram.com/ollypedia",
      ],
    },
  };
}

/** CollectionPage — the actual page entity */
function collectionPageJsonLd(year: number, count: number, desc: string) {
  const url = `${SITE_URL}/movies/year/${year}`;
  return {
    "@context":    "https://schema.org",
    "@type":       "CollectionPage",
    "@id":         `${url}#webpage`,
    name:          `Odia Movies ${year} – Complete Ollywood Film List`,
    description:   desc,
    url,
    inLanguage:    ["en-IN", "or"],
    numberOfItems: count,
    dateModified:  new Date().toISOString(),
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    breadcrumb: {
      "@id": `${url}#breadcrumb`,
    },
    about: {
      "@type":  "Thing",
      name:     `Odia Cinema ${year}`,
      sameAs:   "https://en.wikipedia.org/wiki/Odia_cinema",
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
  };
}

/** ItemList — each movie as a Movie entity — the richest signal for Google */
function itemListJsonLd(year: number, movies: any[]) {
  return {
    "@context":      "https://schema.org",
    "@type":         "ItemList",
    "@id":           `${SITE_URL}/movies/year/${year}#list`,
    name:            `All Odia Movies Released in ${year}`,
    url:             `${SITE_URL}/movies/year/${year}`,
    numberOfItems:   movies.length,
    itemListOrder:   "https://schema.org/ItemListOrderAscending",
    itemListElement: movies.map((m: any, i: number) => ({
      "@type":   "ListItem",
      position:  i + 1,
      item: {
        "@type":         "Movie",
        "@id":           `${SITE_URL}/movie/${m.slug || m._id}`,
        name:            m.title,
        url:             `${SITE_URL}/movie/${m.slug || m._id}`,
        datePublished:   m.releaseDate ? String(m.releaseDate).split("T")[0] : undefined,
        ...(m.posterUrl ? { image: m.posterUrl } : {}),
        director: m.director
          ? {
              "@type": "Person",
              name:    Array.isArray(m.director) ? m.director[0] : m.director,
            }
          : undefined,
        genre:           m.genre ?? undefined,
        countryOfOrigin: { "@type": "Country", name: "India" },
        inLanguage:      "or",
        productionCompany: {
          "@type": "Organization",
          name:    "Ollywood",
        },
      },
    })),
  };
}

/** BreadcrumbList */
function breadcrumbJsonLd(year: number) {
  return {
    "@context":      "https://schema.org",
    "@type":         "BreadcrumbList",
    "@id":           `${SITE_URL}/movies/year/${year}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",   item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Movies", item: `${SITE_URL}/movies` },
      { "@type": "ListItem", position: 3, name: `Odia Movies ${year}`, item: `${SITE_URL}/movies/year/${year}` },
    ],
  };
}

/** FAQPage — answers must be VISIBLE in HTML (not inside <details>) */
function faqJsonLd(year: number, movies: any[], topDirs: string[]) {
  const topTitles = movies.slice(0, 4).map((m: any) => m.title as string).join(", ");
  return {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name:    `How many Odia movies were released in ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: movies.length > 0
            ? `A total of ${movies.length} Odia (Ollywood) movies were released in ${year} according to Ollypedia's database.`
            : `Ollypedia's database for ${year} is still being updated.`,
        },
      },
      {
        "@type": "Question",
        name:    `Which are the best Odia movies of ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: movies.length > 0
            ? `Notable Odia movies of ${year} include ${topTitles}. Visit each movie page on Ollypedia for cast, songs, trailers and box office details.`
            : `Ollypedia is compiling the complete ${year} Odia film list. Check back soon.`,
        },
      },
      ...(topDirs.length > 0
        ? [{
            "@type": "Question",
            name:    `Who directed Odia movies in ${year}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Directors who made Odia films in ${year} include ${topDirs.join(", ")} among others.`,
            },
          }]
        : []),
      {
        "@type": "Question",
        name:    `Where can I watch Odia movies from ${year} online?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Many Odia films from ${year} are available on OTT platforms such as Amazon Prime Video, Disney+ Hotstar, Zee5 and SunNXT. Each movie page on Ollypedia includes available streaming and trailer links.`,
        },
      },
      {
        "@type": "Question",
        name:    `Where can I find the full list of Odia movies released in ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Ollypedia.in provides the complete list of all Odia movies released in ${year} with release dates, director names, cast, songs and box office verdict. This is the most complete Odia cinema database online.`,
        },
      },
    ],
  };
}

// ─── Page component ───────────────────────────────────────────────────────────
export default async function OdiaMoviesYearPage({
  params,
}: {
  params: { year: string };
}) {
  const year = Number(params.year);
  if (isNaN(year) || year < YEAR_START || year > YEAR_END) notFound();

  const movies: any[] = await getMoviesByYear(year);
  const description   = buildDescription(year, movies);
  const topDirectors  = uniqueDirs(movies).slice(0, 5);
  const genreSet      = [...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 6) as string[];
  const prevYear      = year - 1 >= YEAR_START ? year - 1 : null;
  const nextYear      = year + 1 <= YEAR_END   ? year + 1 : null;

  // Verdict counts
  const verdictMap: Record<string, number> = {};
  for (const m of movies) {
    const v = (m.verdict as string) || "Unknown";
    verdictMap[v] = (verdictMap[v] || 0) + 1;
  }

  // FAQ data — must be rendered in HTML to match JSON-LD
  const faqs = [
    {
      q: `How many Odia movies were released in ${year}?`,
      a: movies.length > 0
        ? `A total of ${movies.length} Odia (Ollywood) movies were released in ${year} according to Ollypedia's database.`
        : `Ollypedia's database for ${year} is still being updated. Check back soon.`,
    },
    {
      q: `Which are the best Odia movies of ${year}?`,
      a: movies.length > 0
        ? `Notable Odia movies of ${year} include ${movies.slice(0, 4).map((m: any) => m.title).join(", ")}. Visit each movie page for cast, songs, trailers and box office details.`
        : `Ollypedia is compiling the complete ${year} Odia film list.`,
    },
    ...(topDirectors.length > 0 ? [{
      q: `Who directed Odia movies in ${year}?`,
      a: `Directors who made Odia films in ${year} include ${topDirectors.join(", ")} among others.`,
    }] : []),
    {
      q: `Where can I watch Odia movies from ${year} online?`,
      a: `Many Odia films from ${year} are available on OTT platforms such as Amazon Prime Video, Disney+ Hotstar, Zee5 and SunNXT. Each movie page on Ollypedia includes streaming and trailer links.`,
    },
    {
      q: `Where can I find the full list of Odia movies released in ${year}?`,
      a: `Ollypedia.in has the complete list of all Odia movies released in ${year} with release dates, director names, cast, songs and box office verdict.`,
    },
  ];

  return (
    <>
      {/* ── All JSON-LD blocks — Google reads every <script type="application/ld+json"> ── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd(year, movies.length, description)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(year, movies)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(year)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(year, movies, topDirectors)) }} />

      <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10">

          {/* ── Breadcrumb — visible + matches JSON-LD ────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/movies" className="hover:text-orange-400 transition-colors">Movies</Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-300" aria-current="page">Odia Movies {year}</span>
          </nav>

          {/* ── H1 — exactly one per page, keyword-rich ───────────────────── */}
          <header>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-9 bg-orange-500 rounded-full" aria-hidden="true" />
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Odia Movies <span className="text-orange-400">{year}</span>
              </h1>
            </div>

            {/* Keyword-rich paragraph — fully visible, NOT hidden or collapsed */}
            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mt-3">
              Complete list of{" "}
              <strong className="text-gray-200">Odia (Ollywood) movies released in {year}</strong>.
              {movies.length > 0 && (
                <>
                  {" "}This page covers all{" "}
                  <strong className="text-gray-200">{movies.length} Odia films of {year}</strong>{" "}
                  with director names and release dates.
                </>
              )}
              {topDirectors.length > 0 && (
                <>
                  {" "}Notable directors:{" "}
                  <strong className="text-gray-200">{topDirectors.slice(0, 3).join(", ")}</strong>.
                </>
              )}
            </p>

            {/* Stat + genre chips — crawlable internal links */}
            {movies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full">
                  🎬 {movies.length} Films
                </span>
                {genreSet.map((g) => (
                  <Link
                    key={g}
                    href={`/movies?genre=${encodeURIComponent(g)}`}
                    className="text-xs bg-[#111] border border-[#1f1f1f] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 px-3 py-1 rounded-full transition-colors"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* ── Year navigation — anchor-text links help crawl other year pages ── */}
          <nav aria-label="Browse Odia movies by year" className="flex flex-wrap gap-2">
            {ALL_YEARS.slice(0, 12).map((y) => (
              <Link
                key={y}
                href={`/movies/year/${y}`}
                aria-label={`Odia Movies ${y}`}
                aria-current={y === year ? "page" : undefined}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  y === year
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-[#111] border-[#1f1f1f] text-gray-400 hover:border-orange-500/40 hover:text-orange-400"
                }`}
              >
                {y}
              </Link>
            ))}
            {/* Remaining years as plain links — NOT inside <details> which Google can miss */}
            {ALL_YEARS.slice(12).map((y) => (
              <Link
                key={y}
                href={`/movies/year/${y}`}
                aria-label={`Odia Movies ${y}`}
                className="text-xs px-2.5 py-1 rounded-full border border-[#2a2a2a] text-gray-500 hover:text-orange-400 hover:border-orange-500/40 transition-all"
              >
                {y}
              </Link>
            ))}
          </nav>

          {/* ── Movies table ──────────────────────────────────────────────── */}
          {movies.length > 0 ? (
            <section aria-labelledby="table-heading">
              <h2 id="table-heading" className="sr-only">
                All Odia Movies Released in {year}
              </h2>

              <div className="rounded-2xl border border-[#1f1f1f] overflow-hidden">
                {/* Table header */}
                <div className="hidden sm:grid sm:grid-cols-[2rem_2fr_1.2fr_1.2fr_1fr] bg-[#111] border-b border-[#1f1f1f] px-4 sm:px-6 py-3 gap-4">
                  <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">#</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Movie Name</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Director</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Release Date</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Verdict</span>
                </div>

                {/* Mobile header */}
                <div className="grid grid-cols-[2fr_1fr] sm:hidden bg-[#111] border-b border-[#1f1f1f] px-4 py-3 gap-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Movie</span>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Date</span>
                </div>

                {/* Rows */}
                <div className="divide-y divide-[#161616]">
                  {movies.map((movie: any, idx: number) => {
                    const dirs = Array.isArray(movie.director)
                      ? movie.director.join(", ")
                      : movie.director || "—";
                    const verdictColor: Record<string, string> = {
                      Blockbuster: "text-orange-400",
                      Superhit:    "text-yellow-400",
                      Hit:         "text-green-400",
                      Average:     "text-blue-400",
                      Flop:        "text-red-400",
                    };
                    const vColor = verdictColor[movie.verdict] ?? "text-gray-500";

                    return (
                      <Link
                        key={String(movie._id)}
                        href={`/movie/${movie.slug || movie._id}`}
                        title={`${movie.title} – Odia movie ${year}${dirs !== "—" ? `, directed by ${dirs}` : ""}`}
                        className="group block"
                      >
                        {/* Desktop row */}
                        <div className="hidden sm:grid sm:grid-cols-[2rem_2fr_1.2fr_1.2fr_1fr] items-center px-4 sm:px-6 py-4 gap-4 hover:bg-[#0f0f0f] transition-colors">
                          <span className="text-xs text-gray-600 tabular-nums select-none">{idx + 1}</span>
                          <span className="text-sm font-semibold text-gray-200 group-hover:text-orange-400 transition-colors truncate">
                            {movie.title}
                          </span>
                          <span className="text-sm text-gray-400 truncate">{dirs}</span>
                          <time
                            dateTime={movie.releaseDate ? String(movie.releaseDate).split("T")[0] : undefined}
                            className="text-sm text-gray-400"
                          >
                            {fmtDate(movie.releaseDate)}
                          </time>
                          <span className={`text-xs font-semibold ${vColor}`}>
                            {movie.verdict || "—"}
                          </span>
                        </div>

                        {/* Mobile row */}
                        <div className="grid grid-cols-[2fr_1fr] sm:hidden items-center px-4 py-3.5 gap-4 hover:bg-[#0f0f0f] transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-200 group-hover:text-orange-400 transition-colors truncate">
                              {movie.title}
                            </p>
                            {dirs !== "—" && (
                              <p className="text-xs text-gray-500 truncate mt-0.5">{dirs}</p>
                            )}
                          </div>
                          <time
                            dateTime={movie.releaseDate ? String(movie.releaseDate).split("T")[0] : undefined}
                            className="text-xs text-gray-400 text-right"
                          >
                            {fmtDate(movie.releaseDate)}
                          </time>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Table footer */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-[#161616] bg-[#0d0d0d]">
                  <span className="text-[11px] text-gray-600">
                    {movies.length} Odia films from {year} · Sorted by release date
                  </span>
                  <Link
                    href="/movies"
                    className="text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    Browse all years →
                  </Link>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center border border-[#1f1f1f] rounded-2xl bg-[#0d0d0d]">
              <span className="text-5xl mb-4">🎬</span>
              <p className="text-gray-400 text-sm">
                No Odia movies found for <strong className="text-white">{year}</strong>.
              </p>
              <Link href="/movies" className="mt-4 text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4">
                Browse all Odia movies →
              </Link>
            </div>
          )}

          {/* ── Prev / Next year — rel="prev/next" for crawl signal ───────── */}
          <nav
            aria-label="Year navigation"
            className="flex items-center justify-between pt-4 border-t border-[#1f1f1f]"
          >
            {prevYear ? (
              <Link
                href={`/movies/year/${prevYear}`}
                rel="prev"
                className="text-sm text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-1"
              >
                ← Odia Movies {prevYear}
              </Link>
            ) : <span />}
            {nextYear ? (
              <Link
                href={`/movies/year/${nextYear}`}
                rel="next"
                className="text-sm text-gray-400 hover:text-orange-400 transition-colors flex items-center gap-1"
              >
                Odia Movies {nextYear} →
              </Link>
            ) : <span />}
          </nav>

          {/* ══════════════════════════════════════════════════════════════════
              SEO CONTENT — fully visible, NOT in accordion/details/hidden
              Google needs to read this text to understand the page topic.
          ═══════════════════════════════════════════════════════════════════ */}
          <section
            aria-label={`About Odia movies ${year}`}
            className="pt-8 border-t border-[#1f1f1f] space-y-8 text-sm text-gray-500 leading-relaxed"
          >

            {/* ── Overview paragraph ──────────────────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-base font-bold text-gray-300">
                Odia Movies {year} – Complete Ollywood Film List
              </h2>
              <p>
                {movies.length > 0 ? (
                  <>
                    A total of{" "}
                    <strong className="text-gray-300">{movies.length} Odia movies</strong> were
                    released in{" "}
                    <strong className="text-gray-300">{year}</strong> by the{" "}
                    <strong className="text-gray-300">Odia film industry (Ollywood)</strong>.{" "}
                    {topDirectors.length > 0 && (
                      <>
                        The year featured films directed by{" "}
                        <strong className="text-gray-300">{topDirectors.slice(0, 3).join(", ")}</strong> among others.{" "}
                      </>
                    )}
                    {verdictMap["Blockbuster"]
                      ? `${verdictMap["Blockbuster"]} film${verdictMap["Blockbuster"] > 1 ? "s" : ""} achieved Blockbuster status at the Odia box office. `
                      : null}
                    Ollypedia maintains the most comprehensive database of Odia cinema, with complete
                    records for every Odia film from {YEAR_START} to {YEAR_END}.
                  </>
                ) : (
                  <>
                    Ollypedia is building the most comprehensive database of Odia (Ollywood) cinema.
                    Movie data for{" "}
                    <strong className="text-gray-300">{year}</strong> will be updated as information
                    becomes available. Browse other years using the navigation above.
                  </>
                )}
              </p>
              <p>
                The Odia film industry, popularly known as{" "}
                <strong className="text-gray-300">Ollywood</strong>, is one of India's oldest
                regional film industries, based in Bhubaneswar and Cuttack, Odisha. Ollywood
                produces films in the Odia language covering genres including Action, Romance,
                Drama, Comedy, Devotional and Thriller. This page lists all Odia films released
                in{" "}
                <strong className="text-gray-300">{year}</strong> with release dates and director
                names. Click any movie title for full details — cast, songs, trailer and box
                office collection.
              </p>
            </div>

            {/* ── Verdict breakdown — visible stats ───────────────────── */}
            {movies.length > 0 && Object.keys(verdictMap).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-400">
                  {year} Odia Box Office at a Glance
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(verdictMap)
                    .sort((a, b) => b[1] - a[1])
                    .map(([verdict, count]) => (
                      <span
                        key={verdict}
                        className="text-xs px-3 py-1.5 rounded-lg bg-[#111] border border-[#1f1f1f] text-gray-400"
                      >
                        <span className="text-gray-200 font-semibold">{count}</span> {verdict}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* ── Internal year links — anchor-text SEO + crawl signal ── */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-400">
                Browse Odia Movies by Year
              </h3>
              {/* Plain anchor links — Google reads all of these */}
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {ALL_YEARS.map((y) => (
                  <Link
                    key={y}
                    href={`/movies/year/${y}`}
                    className={`text-xs hover:text-orange-400 transition-colors ${
                      y === year ? "text-orange-400 font-semibold" : "text-gray-500"
                    }`}
                  >
                    Odia Movies {y}
                  </Link>
                ))}
              </div>
            </div>

            {/* ── FAQ — rendered as VISIBLE H3+P pairs, not <details> ───
                 CRITICAL: JSON-LD FAQPage only gets rich results if the same
                 Q+A text appears visibly in the HTML. <details> is risky.     */}
            <div className="space-y-6">
              <h3 className="text-sm font-semibold text-gray-400">
                Frequently Asked Questions – Odia Movies {year}
              </h3>
              <div className="space-y-5">
                {faqs.map((faq, i) => (
                  <div
                    key={i}
                    className="border border-[#1a1a1a] rounded-xl px-4 py-4 space-y-1.5"
                    itemScope
                    itemType="https://schema.org/Question"
                  >
                    <p className="text-xs font-semibold text-gray-300" itemProp="name">
                      {faq.q}
                    </p>
                    <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                      <p className="text-xs text-gray-500 leading-relaxed" itemProp="text">
                        {faq.a}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </section>

        </div>
      </div>
    </>
  );
}