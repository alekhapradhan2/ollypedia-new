// app/movies/year/[year]/page.tsx
// Odia Movies by Year — tight SEO: metadata, JSON-LD (CollectionPage + ItemList + BreadcrumbList + FAQPage),
// OG, Twitter Card, canonical, hreflang, keyword-rich description, inline SEO content

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Constants ────────────────────────────────────────────────────────────
const SITE_URL   = "https://ollypedia.in";
const SITE_NAME  = "Ollypedia";
const YEAR_START = 2000;
const YEAR_END   = new Date().getFullYear();
const ALL_YEARS  = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_END - i);

// ─── Static params ──────────────────────────────────────────────────────
export async function generateStaticParams() {
  return ALL_YEARS.map((year) => ({ year: String(year) }));
}

// ─── Data fetcher ────────────────────────────────────────────────────────
async function getMoviesByYear(year: number) {
  await connectDB();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end   = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const movies = await Movie.find(
    { releaseDate: { $gte: start, $lt: end } },
    "title slug releaseDate director genre verdict"
  )
    .sort({ releaseDate: 1 })
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

// ─── SEO helpers ─────────────────────────────────────────────────────────

function buildTitle(year: number, count: number): string {
  return `Odia Movies ${year} – Complete List of ${count > 0 ? count + " " : ""}Ollywood Films | ${SITE_NAME}`;
}

function buildDescription(year: number, movies: any[]): string {
  const count   = movies.length;
  const topDirs = [...new Set(movies.map((m: any) => m.director).filter(Boolean))].slice(0, 3) as string[];
  const dirStr  = topDirs.length ? ` Directed by ${topDirs.join(", ")} and more.` : "";
  const base    = `Complete list of ${count > 0 ? count + " " : "all "}Odia (Ollywood) movies released in ${year}. Includes release dates, directors & full details.${dirStr}`;
  return base.slice(0, 160);
}

function buildKeywords(year: number, movies: any[]): string {
  const directors = [...new Set(movies.map((m: any) => m.director).filter(Boolean))].slice(0, 5) as string[];
  const titles    = movies.slice(0, 8).map((m: any) => m.title) as string[];

  const kw = [
    `odia movies ${year}`,
    `ollywood movies ${year}`,
    `odia film ${year}`,
    `odia cinema ${year}`,
    `new odia movies ${year}`,
    `odia movies ${year} list`,
    `odia movies ${year} full list`,
    `odia movies released in ${year}`,
    `best odia movies ${year}`,
    `top odia movies ${year}`,
    `odia movies ${year} with cast`,
    `odia movies ${year} director`,
    `odia movies ${year} release date`,
    `ollywood ${year} film list`,
    `odia movie names ${year}`,
    ...directors.map((d) => `${d} odia movie ${year}`),
    ...titles.map((t) => `${t} odia movie`),
    `ollypedia odia movies ${year}`,
    "odia movies",
    "ollywood movies",
    "odia film list",
    "odia cinema",
  ];
  return [...new Set(kw)].join(", ");
}

// ─── Metadata ────────────────────────────────────────────────────────────
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
  const ogImage     = `${SITE_URL}/og/movies-${year}.jpg`;

  return {
    title,
    description,
    keywords,

    // ── Canonical & alternates ────────────────────────────────────────
    alternates: {
      canonical,
      languages: {
        "en-IN": canonical,
        "or-IN": canonical,
      },
    },

    // ── Open Graph ───────────────────────────────────────────────────
    openGraph: {
      type:     "website",
      siteName: SITE_NAME,
      url:      canonical,
      title,
      description,
      locale:   "en_IN",
      images: [
        {
          url:    ogImage,
          width:  1200,
          height: 630,
          alt:    `Odia Movies ${year} – Ollypedia`,
        },
      ],
    },

    // ── Twitter Card ─────────────────────────────────────────────────
    twitter: {
      card:        "summary_large_image",
      site:        "@ollypedia",
      creator:     "@ollypedia",
      title,
      description,
      images:      [ogImage],
    },

    // ── Robots ───────────────────────────────────────────────────────
    robots: {
      index:     true,
      follow:    true,
      googleBot: {
        index:               true,
        follow:              true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet":       -1,
      },
    },

    // ── Other ────────────────────────────────────────────────────────
    authors:   [{ name: SITE_NAME, url: SITE_URL }],
    creator:   SITE_NAME,
    publisher: SITE_NAME,
    category:  "Entertainment",
  };
}

// ─── JSON-LD helpers ─────────────────────────────────────────────────────

function collectionPageJsonLd(year: number, count: number, desc: string) {
  return {
    "@context":    "https://schema.org",
    "@type":       "CollectionPage",
    "@id":         `${SITE_URL}/movies/year/${year}#webpage`,
    name:          `Odia Movies ${year}`,
    description:   desc,
    url:           `${SITE_URL}/movies/year/${year}`,
    inLanguage:    ["en-IN", "or-IN"],
    numberOfItems: count,
    isPartOf: {
      "@type": "WebSite",
      "@id":   `${SITE_URL}/#website`,
      name:    SITE_NAME,
      url:     SITE_URL,
    },
    about: {
      "@type":  "Thing",
      name:     `Odia Cinema ${year}`,
      sameAs:   "https://en.wikipedia.org/wiki/Odia_cinema",
    },
  };
}

function itemListJsonLd(year: number, movies: any[]) {
  return {
    "@context":      "https://schema.org",
    "@type":         "ItemList",
    name:            `Odia Movies ${year} List`,
    url:             `${SITE_URL}/movies/year/${year}`,
    numberOfItems:   movies.length,
    itemListElement: movies.map((m: any, i: number) => ({
      "@type":    "ListItem",
      position:   i + 1,
      name:       m.title,
      url:        `${SITE_URL}/movie/${m.slug || m._id}`,
      item: {
        "@type":         "Movie",
        name:            m.title,
        url:             `${SITE_URL}/movie/${m.slug || m._id}`,
        datePublished:   m.releaseDate ? m.releaseDate.split("T")[0] : undefined,
        director:        m.director ? { "@type": "Person", name: m.director } : undefined,
        countryOfOrigin: { "@type": "Country", name: "India" },
        inLanguage:      "or",
      },
    })),
  };
}

function breadcrumbJsonLd(year: number) {
  return {
    "@context":      "https://schema.org",
    "@type":         "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",         item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Movies",       item: `${SITE_URL}/movies` },
      { "@type": "ListItem", position: 3, name: `Odia Movies ${year}`, item: `${SITE_URL}/movies/year/${year}` },
    ],
  };
}

function faqJsonLd(year: number, movies: any[], topDirs: string[]) {
  const topTitles = movies.slice(0, 4).map((m: any) => m.title).join(", ");
  return {
    "@context":   "https://schema.org",
    "@type":      "FAQPage",
    mainEntity: [
      {
        "@type":  "Question",
        name:     `How many Odia movies were released in ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: movies.length > 0
            ? `A total of ${movies.length} Odia (Ollywood) movies were released in ${year} according to Ollypedia's database.`
            : `Ollypedia's database for ${year} is still being updated.`,
        },
      },
      {
        "@type":  "Question",
        name:     `Which are the best Odia movies of ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: movies.length > 0
            ? `Notable Odia movies of ${year} include ${topTitles}. Visit each movie's page on Ollypedia for reviews and box office details.`
            : `Details for ${year} Odia films are being compiled on Ollypedia.`,
        },
      },
      ...(topDirs.length > 0
        ? [{
            "@type":  "Question",
            name:     `Who directed Odia movies in ${year}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Directors of Odia films in ${year} include ${topDirs.join(", ")}.`,
            },
          }]
        : []),
      {
        "@type":  "Question",
        name:     `Where can I find the full list of Odia movies released in ${year}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Ollypedia.in provides the complete list of all Odia movies released in ${year} with release dates, directors, cast, songs and box office information.`,
        },
      },
    ],
  };
}

// ─── Format date ─────────────────────────────────────────────────────────
function fmtDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ─── Page component ──────────────────────────────────────────────────────
export default async function OdiaMoviesYearPage({
  params,
}: {
  params: { year: string };
}) {
  const year = Number(params.year);
  if (isNaN(year) || year < YEAR_START || year > YEAR_END) notFound();

  const movies: any[]  = await getMoviesByYear(year);
  const description    = buildDescription(year, movies);
  const topDirectors   = [...new Set(movies.map((m: any) => m.director).filter(Boolean))].slice(0, 5) as string[];
  const genreSet       = [...new Set(movies.flatMap((m: any) => m.genre || []))].slice(0, 6) as string[];

  const prevYear = year - 1 >= YEAR_START ? year - 1 : null;
  const nextYear = year + 1 <= YEAR_END   ? year + 1 : null;

  return (
    <>
      {/* ── Structured Data ─────────────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageJsonLd(year, movies.length, description)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd(year, movies)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(year)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(year, movies, topDirectors)) }} />

      <div className="min-h-screen bg-[#0a0a0a] text-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">

          {/* ── Breadcrumb ───────────────────────────────────────────── */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 mb-8">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <span aria-hidden="true">/</span>
            <Link href="/movies" className="hover:text-orange-400 transition-colors">Movies</Link>
            <span aria-hidden="true">/</span>
            <span className="text-gray-300" aria-current="page">Odia Movies {year}</span>
          </nav>

          {/* ── H1 + intro ───────────────────────────────────────────── */}
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-9 bg-orange-500 rounded-full" aria-hidden="true" />
              <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Odia Movies <span className="text-orange-400">{year}</span>
              </h1>
            </div>

            {/* Keyword-rich intro visible to users and crawlers */}
            <p className="text-sm text-gray-400 leading-relaxed max-w-2xl mt-3">
              Complete list of{" "}
              <strong className="text-gray-200">Odia (Ollywood) movies released in {year}</strong>.
              {movies.length > 0 && (
                <> This page covers all{" "}
                  <strong className="text-gray-200">{movies.length} Odia films of {year}</strong>{" "}
                  with release dates and directors.
                </>
              )}
              {topDirectors.length > 0 && (
                <> Notable directors:{" "}
                  <strong className="text-gray-200">{topDirectors.slice(0, 3).join(", ")}</strong>.
                </>
              )}
            </p>

            {/* Stat + genre chips */}
            {movies.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs bg-orange-500/10 border border-orange-500/20 text-orange-400 px-3 py-1 rounded-full">
                  🎬 {movies.length} Films
                </span>
                {genreSet.slice(0, 4).map((g) => (
                  <Link
                    key={g}
                    href={`/movies?genre=${encodeURIComponent(g)}`}
                    className="text-xs bg-[#111] border border-[#1f1f1f] text-gray-400 hover:text-orange-400 hover:border-orange-500/30 px-3 py-1 rounded-full transition-colors"
                  >
                    🎭 {g}
                  </Link>
                ))}
              </div>
            )}
          </header>

          {/* ── Year navigation ──────────────────────────────────────── */}
          <nav aria-label="Browse Odia movies by year" className="flex flex-wrap gap-2 mb-8">
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
            {ALL_YEARS.length > 12 && (
              <details className="relative">
                <summary className="cursor-pointer text-xs px-3 py-1.5 rounded-full border border-[#1f1f1f] bg-[#111] text-gray-400 hover:text-orange-400 list-none select-none">
                  More ▾
                </summary>
                <div className="absolute z-10 mt-1 bg-[#111] border border-[#1f1f1f] rounded-xl p-3 flex flex-wrap gap-2 w-64 shadow-xl">
                  {ALL_YEARS.slice(12).map((y) => (
                    <Link
                      key={y}
                      href={`/movies/year/${y}`}
                      className="text-xs px-2.5 py-1 rounded-full border border-[#2a2a2a] text-gray-400 hover:text-orange-400 hover:border-orange-500/40 transition-all"
                    >
                      {y}
                    </Link>
                  ))}
                </div>
              </details>
            )}
          </nav>

          {/* ── Table ────────────────────────────────────────────────── */}
          {movies.length > 0 ? (
            <section aria-label={`Odia movies ${year} table`}>
              <div className="rounded-2xl border border-[#1f1f1f] overflow-hidden">
                {/* Header row */}
                <div className="grid grid-cols-[2fr_1fr_1fr] bg-[#111] border-b border-[#1f1f1f] px-4 sm:px-6 py-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Movie Name</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Release Date</span>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Director</span>
                </div>

                {/* Data rows */}
                <div className="divide-y divide-[#161616]">
                  {movies.map((movie: any, idx: number) => (
                    <Link
                      key={String(movie._id)}
                      href={`/movie/${movie.slug || movie._id}`}
                      title={`${movie.title} – Odia movie ${year}${movie.director ? `, directed by ${movie.director}` : ""}`}
                      className="grid grid-cols-[2fr_1fr_1fr] items-center px-4 sm:px-6 py-4 hover:bg-[#0f0f0f] transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs text-gray-600 w-5 shrink-0 tabular-nums select-none">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-200 group-hover:text-orange-400 transition-colors truncate">
                          {movie.title}
                        </span>
                      </div>
                      <time
                        dateTime={movie.releaseDate ? movie.releaseDate.split("T")[0] : undefined}
                        className="text-sm text-gray-400"
                      >
                        {fmtDate(movie.releaseDate)}
                      </time>
                      <span className="text-sm text-gray-400 truncate">
                        {movie.director || "—"}
                      </span>
                    </Link>
                  ))}
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

          {/* ── Prev / Next ──────────────────────────────────────────── */}
          <nav
            aria-label="Year navigation"
            className="flex items-center justify-between mt-8 pt-6 border-t border-[#1f1f1f]"
          >
            {prevYear ? (
              <Link href={`/movies/year/${prevYear}`} rel="prev" className="text-sm text-gray-400 hover:text-orange-400 transition-colors">
                ← Odia Movies {prevYear}
              </Link>
            ) : <span />}
            {nextYear ? (
              <Link href={`/movies/year/${nextYear}`} rel="next" className="text-sm text-gray-400 hover:text-orange-400 transition-colors">
                Odia Movies {nextYear} →
              </Link>
            ) : <span />}
          </nav>

          {/* ── SEO Content Section ──────────────────────────────────────
               Visible to users + fully crawlable. Placed below the table.
          ─────────────────────────────────────────────────────────────── */}
          <section aria-label={`About Odia movies ${year}`} className="mt-14 pt-8 border-t border-[#1f1f1f] space-y-5 text-sm text-gray-500 leading-relaxed">

            <h2 className="text-base font-bold text-gray-300">
              Odia Movies {year} – Complete Ollywood Film List
            </h2>

            <p>
              {movies.length > 0 ? (
                <>
                  A total of{" "}
                  <strong className="text-gray-300">{movies.length} Odia movies</strong> were released in{" "}
                  <strong className="text-gray-300">{year}</strong>.{" "}
                  {topDirectors.length > 0 && (
                    <>
                      The year featured films directed by{" "}
                      <strong className="text-gray-300">{topDirectors.join(", ")}</strong> among others.{" "}
                    </>
                  )}
                  Ollypedia maintains the most comprehensive database of Odia cinema, covering every
                  Odia film from {YEAR_START} to {YEAR_END}.
                </>
              ) : (
                <>
                  Ollypedia is building the most comprehensive database of Odia (Ollywood) cinema.
                  Movie data for <strong className="text-gray-300">{year}</strong> will be updated as information becomes available.
                </>
              )}
            </p>

            <p>
              The Odia film industry, popularly known as <strong className="text-gray-300">Ollywood</strong>,
              is one of the oldest regional film industries in India. Based out of Bhubaneswar and Cuttack,
              Ollywood produces films in the Odia language. This page lists all Odia films released in{" "}
              <strong className="text-gray-300">{year}</strong> with release dates and directors.
              Click any movie title for full details — cast, songs, trailer and box office collection.
            </p>

            {/* Internal year links (crawl depth + anchor text SEO) */}
            <h3 className="text-sm font-semibold text-gray-400 pt-2">
              Browse Odia Movies by Year
            </h3>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {ALL_YEARS.slice(0, 10).map((y) => (
                <Link
                  key={y}
                  href={`/movies/year/${y}`}
                  className={`text-xs hover:text-orange-400 transition-colors ${y === year ? "text-orange-400 font-semibold" : "text-gray-500"}`}
                >
                  Odia Movies {y}
                </Link>
              ))}
            </div>

            {/* Inline FAQ — also backed by FAQPage JSON-LD above */}
            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-400">
                Frequently Asked Questions – Odia Movies {year}
              </h3>
              {[
                {
                  q: `How many Odia movies were released in ${year}?`,
                  a: movies.length > 0
                    ? `A total of ${movies.length} Odia (Ollywood) movies were released in ${year} as per Ollypedia's database.`
                    : `Ollypedia's database for ${year} is still being updated. Check back soon.`,
                },
                {
                  q: `Which are the best Odia movies of ${year}?`,
                  a: movies.length > 0
                    ? `Notable Odia movies of ${year} include ${movies.slice(0, 4).map((m: any) => m.title).join(", ")}. Visit each movie page for reviews and box office collections.`
                    : `Details for ${year} Odia films are being compiled on Ollypedia.`,
                },
                ...(topDirectors.length > 0 ? [{
                  q: `Who directed Odia movies in ${year}?`,
                  a: `Directors of Odia films in ${year} include ${topDirectors.join(", ")}.`,
                }] : []),
                {
                  q: `Where can I find the full list of Odia movies released in ${year}?`,
                  a: `Ollypedia.in provides the complete list of all Odia movies released in ${year}, with release dates, directors, cast, songs and box office data.`,
                },
              ].map((faq, i) => (
                <details key={i} className="group border border-[#1a1a1a] rounded-xl overflow-hidden">
                  <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-gray-400 list-none flex justify-between items-center gap-3 select-none hover:text-orange-400 hover:bg-[#0d0d0d] transition-all">
                    <span>{faq.q}</span>
                    <span className="text-gray-600 group-open:rotate-180 transition-transform duration-200 flex-shrink-0">▼</span>
                  </summary>
                  <div className="px-4 pb-4 pt-1 border-t border-[#1a1a1a]">
                    <p className="text-xs text-gray-500 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>

          </section>

        </div>
      </div>
    </>
  );
}