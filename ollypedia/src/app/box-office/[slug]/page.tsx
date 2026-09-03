// app/box-office/[slug]/page.tsx
// ★ UPDATED: Stronger movie-name-first SEO keywords, inter-link JSON-LD
//             linking box-office → movie → blog → songs for entity graph.
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import { notFound }       from "next/navigation";
import { connectDB }      from "@/lib/db";
import Movie              from "@/models/Movie";
import Blog               from "@/models/Blog";
import BoxOfficeClient    from "./BoxOfficeClient";
import { buildBoxOfficeMeta, generateBoxOfficeJsonLd } from "@/lib/boxOfficeSeo";

export const revalidate    = 3600;        // 1hr — BO data updates once/day; 60s was hammering DB
export const dynamicParams = true;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * parseNum — converts any currency string to raw rupees (integer).
 * Handles BOTH storage formats:
 *   Old: "1400000", "900000"  (raw integer strings from previous admin panel)
 *   New: "₹7.00 L", "₹1.00 Cr", "7L", "0.5Cr", "3.36Cr"  (formatted strings)
 * Rules:
 *   "₹7.00 L"  → 700000
 *   "₹1.00 Cr" → 10000000
 *   "1400000"  → 1400000  (bare integer ≥ 1000 trusted as rupees)
 *   "7"        → 0        (bare tiny number with no unit = corrupted/ignore)
 */
function parseNum(s: unknown): number {
  if (s === null || s === undefined || s === "") return 0;
  const str = String(s).replace(/[₹,\s]/g, "").toLowerCase();
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  if (str.includes("cr") || str.includes("crore")) return Math.round(n * 1_00_00_000);
  if (str.includes("l") || str.includes("lakh"))   return Math.round(n * 1_00_000);
  if (n >= 1000) return Math.round(n); // bare integer already in rupees
  return 0; // bare tiny number with no unit — skip
}

function fmtINR(val: unknown): string {
  const n = parseNum(val);
  if (!n) return String(val || "TBA");
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Misspelling generator for movie title — helps capture common typos in search
// getMisspellings REMOVED — Google handles misspelling matching automatically.
// The box-office version was the worst offender: up to 60 typos × 23 intent
// suffixes = 1,380 spam keywords per page. This triggers SpamBrain penalties.

// ─── Static params ────────────────────────────────────────────────────────────
// Pre-render top 10 currently tracked box office pages at build time.
export async function generateStaticParams() {
  try {
    await connectDB();
    const movies = await (Movie as any)
      .find({ "boxOfficeDays.0": { $exists: true } }, "slug title")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
    return movies.map((m: any) => ({
      slug: m.slug || String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    }));
  } catch (err) {
    return [];
  }
}

// ─── Data fetch ───────────────────────────────────────────────────────────────

async function getMovieBySlug(slug: string) {
  await connectDB();
  const isOid = /^[a-f0-9]{24}$/i.test(slug);
  const movie = isOid
    ? await (Movie as any).findById(slug).lean()
    : await (Movie as any).findOne({ slug }).lean();
  if (!movie) return null;
  return JSON.parse(JSON.stringify(movie));
}

async function getRelatedBlogs(movieTitle: string, limit = 6) {
  await connectDB();
  const blogs = await (Blog as any)
    .find({
      published: true,
      $or: [
        { movieTitle: { $regex: new RegExp(movieTitle, "i") } },
        { tags:       { $in: [new RegExp(movieTitle, "i")] } },
        { title:      { $regex: new RegExp(movieTitle, "i") } },
      ],
    })
    .select("title slug excerpt coverImage category createdAt")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

// Fetch movies releasing around the same date — "other Odia movies this week" section
async function getCompetingMovies(currentSlug: string, releaseDate?: string, limit = 4) {
  await connectDB();
  if (!releaseDate) return [];
  const d     = new Date(releaseDate);
  const from  = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days before
  const to    = new Date(d.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after
  const movies = await (Movie as any)
    .find({
      slug:        { $ne: currentSlug },
      releaseDate: { $gte: from.toISOString().split("T")[0], $lte: to.toISOString().split("T")[0] },
      "boxOfficeDays.0": { $exists: true },
    })
    .select("title slug posterUrl releaseDate verdict boxOfficeDays")
    .sort({ releaseDate: 1 })
    .limit(limit)
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const slug  = params?.slug;
  const movie = await getMovieBySlug(slug);
  if (!movie) return { robots: { index: false, follow: false } };

  const days       = (movie.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
  const totalNet   = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
  const totalGross = days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
  const lastDay    = days[days.length - 1]?.day || 0;
  const hasRealData = totalNet > 0 || totalGross > 0 || days.some((d: any) => parseNum(d.net) > 0 || parseNum(d.gross) > 0);

  if (!hasRealData) return { robots: { index: false, follow: true } };

  // Delegate to boxOfficeSeo module — clean, focused keyword set (no SpamBrain risk)
  return buildBoxOfficeMeta({
    movieTitle: movie.title,
    movieSlug: slug,
    totalNet: totalNet > 0 ? fmtINR(totalNet) : undefined,
    totalGross: totalGross > 0 ? fmtINR(totalGross) : undefined,
    day1Collection: days[0] ? fmtINR(parseNum(days[0].net)) : undefined,
    verdict: movie.verdict,
    releaseDate: movie.releaseDate,
    daysCount: lastDay,
    posterUrl: movie.bannerUrl || movie.posterUrl,
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function BoxOfficePage({
  params,
}: {
  params: { slug: string };
}) {
  const slug  = params?.slug;
  const movie = await getMovieBySlug(slug);
  if (!movie) notFound();

  const days       = (movie.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
  const totalNet   = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
  const totalGross = days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
  const lastDay    = days[days.length - 1]?.day || 0;
  const hasBoxOffice = days.length > 0 || (movie.reReleaseBoxOfficeDays && movie.reReleaseBoxOfficeDays.length > 0) || totalNet > 0;

  if (!hasBoxOffice) notFound();
  const year       = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const songs      = movie.media?.songs || [];

  const [relatedBlogs, competingMovies] = await Promise.all([
    getRelatedBlogs(movie.title, 6),
    getCompetingMovies(slug, movie.releaseDate, 4),
  ]);

  // ── Article JSON-LD ──────────────────────────────────────────────────────────
  const articleLd = {
    "@context":    "https://schema.org",
    "@type":       "Article",
    "headline":    `${movie.title} Box Office Collection${lastDay ? ` Day 1 to Day ${lastDay}` : ""}`,
    "description": `Complete day-wise box office collection of ${movie.title}. Total Net: ${fmtINR(totalNet)}, Total Gross: ${fmtINR(totalGross)}.`,
    "datePublished": movie.createdAt ? new Date(movie.createdAt).toISOString() : undefined,
    "dateModified":  movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
    "image":         movie.bannerUrl || movie.posterUrl || `${SITE_URL}/default.jpg`,
    "author":        { "@type": "Organization", "name": "Ollypedia" },
    "publisher": {
      "@type": "Organization",
      "name":  "Ollypedia",
      "logo":  { "@type": "ImageObject", "url": `${SITE_URL}/logo.png` },
    },
    // ★ FIX: "@type": "@id" is invalid schema.org — caused Article rich result failure.
    // Correct format uses "@type": "WebPage" with "@id" as the canonical URL.
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id":   `${SITE_URL}/box-office/${slug}`,
    },
    // ★ Link box-office page → movie entity with cast for Knowledge Panel
    "about": {
      "@type":       "Movie",
      "name":        movie.title,
      "url":         `${SITE_URL}/movie/${movie.slug}`,
      "dateCreated": movie.releaseDate || undefined,
      // sameAs links to IMDB/Wikipedia allow Google to match this to a known entity
      // Add the real IMDB/Wikipedia URL if available in your movie data
      ...(movie.imdbUrl    && { "sameAs": [movie.imdbUrl] }),
      ...(movie.wikipediaUrl && { "sameAs": [movie.wikipediaUrl] }),
      ...(movie.director && { "director": { "@type": "Person", "name": movie.director } }),
      ...(movie.cast?.length > 0 && {
        "actor": (() => {
          const CREW_LOWER = ["director", "producer", "writer", "screenplay", "story", "dialogue", "music", "cinematographer", "editor", "choreographer", "art director", "costume", "sound", "stunt", "vfx", "singer", "lyricist", "dop", "d.o.p"];
          const actors = (movie.cast || []).filter((c: any) => {
            const r = (c.role || "").toLowerCase();
            const t = (c.type || "").toLowerCase();
            return !CREW_LOWER.some((cr) => r.includes(cr) || t.includes(cr));
          });
          const uniqueActors = Array.from(new Set(actors.map((a: any) => a.name).filter(Boolean)));
          return uniqueActors.slice(0, 5).map((name) => ({
            "@type": "Person",
            "name":  name,
          }));
        })(),
      }),
      ...(songs.length > 0 && {
        "musicBy": songs[0]?.musicDirector
          ? { "@type": "Person", "name": songs[0].musicDirector }
          : undefined,
      }),
    },
    // ★ Mention all cross-linked pages so Google traces the entity web
    "mentions": [
      { "@type": "WebPage", "name": `${movie.title} — Movie Page`,  "url": `${SITE_URL}/movie/${movie.slug}` },
      { "@type": "WebPage", "name": `${movie.title} Songs`,          "url": `${SITE_URL}/songs/${movie.slug}` },
      { "@type": "WebPage", "name": `${movie.title} Blog & Reviews`, "url": `${SITE_URL}/blog?movie=${encodeURIComponent(movie.title)}` },
      ...relatedBlogs.map((b: any) => ({
        "@type": "WebPage",
        "name":  b.title,
        "url":   `${SITE_URL}/blog/${b.slug}`,
      })),
    ],
  };

  // ── Dataset JSON-LD — day-wise table as structured data ─────────────────────
  // Google can render this as a data table in search results for collection queries
  const datasetLd = days.length > 0 ? {
    "@context":   "https://schema.org",
    "@type":      "Dataset",
    "name":       `${movie.title} Day-wise Box Office Collection`,
    "description": `Complete day-wise net and gross box office collection of ${movie.title} at the Odia (Ollywood) box office.`,
    "url":        `${SITE_URL}/box-office/${slug}`,
    "creator":    { "@type": "Organization", "name": "Ollypedia" },
    "dateModified": movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
    "variableMeasured": ["Net Collection (INR)", "Gross Collection (INR)", "Day"],
    "distribution": {
      "@type":        "DataDownload",
      "encodingFormat": "text/html",
      "contentUrl":   `${SITE_URL}/box-office/${slug}`,
    },
  } : null;

  // ── Compute week totals for FAQ ───────────────────────────────────────────────
  const week1Total  = days.slice(0,  7).reduce((s: number, d: any) => s + parseNum(d.net), 0);
  const week2Total  = days.slice(7, 14).reduce((s: number, d: any) => s + parseNum(d.net), 0);
  const week3Total  = days.slice(14, 21).reduce((s: number, d: any) => s + parseNum(d.net), 0);
  const month1Total = days.slice(0, 30).reduce((s: number, d: any) => s + parseNum(d.net), 0);

  // ── FAQ JSON-LD ──────────────────────────────────────────────────────────────
  const faqLd = days.length > 0 ? {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name":  `What is the total box office collection of ${movie.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} has earned ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross in ${lastDay} days at the Odia box office.`,
        },
      },
      ...(days[0] ? [{
        "@type": "Question",
        "name":  `What is ${movie.title} Day 1 box office collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} collected ${fmtINR(days[0].net)} net on Day 1 at the Odia box office.`,
        },
      }] : []),
      ...(days.length >= 7 ? [{
        "@type": "Question",
        "name":  `What is ${movie.title} first week collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} earned ${fmtINR(week1Total)} net in its first week (Day 1–7) at the Odia box office.`,
        },
      }] : []),
      ...(days.length >= 14 ? [{
        "@type": "Question",
        "name":  `What is ${movie.title} second week collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} collected ${fmtINR(week2Total)} net in its second week (Day 8–14). The two-week total stands at ${fmtINR(week1Total + week2Total)} net.`,
        },
      }] : []),
      ...(days.length >= 21 ? [{
        "@type": "Question",
        "name":  `What is ${movie.title} third week collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} earned ${fmtINR(week3Total)} net in its third week (Day 15–21). Three-week total: ${fmtINR(week1Total + week2Total + week3Total)} net.`,
        },
      }] : []),
      ...(days.length >= 30 ? [{
        "@type": "Question",
        "name":  `What is ${movie.title} total 30-day box office collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} collected a total of ${fmtINR(month1Total)} net in its first 30 days of theatrical run at the Odia (Ollywood) box office.`,
        },
      }] : []),
      {
        "@type": "Question",
        "name":  `Where can I find ${movie.title} daily box office collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `Ollypedia publishes verified day-wise box office collection for ${movie.title} at ollypedia.in/box-office/${slug}. Data is updated daily.`,
        },
      },
      {
        "@type": "Question",
        "name":  `Where can I read reviews and blogs about ${movie.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `You can read full reviews and articles about ${movie.title} on Ollypedia's blog section at ollypedia.in/blog.`,
        },
      },
    ],
  } : null;

  // ── BreadcrumbList JSON-LD ────────────────────────────────────────────────────
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",       "item": `${SITE_URL}/` },
      { "@type": "ListItem", "position": 2, "name": "Box Office", "item": `${SITE_URL}/box-office` },
      { "@type": "ListItem", "position": 3, "name": movie.title,  "item": `${SITE_URL}/box-office/${slug}` },
    ],
  };

  // ── VideoObject JSON-LD — trailer video rich result ──────────────────────────
  const trailerYtId = movie.media?.trailer?.ytId || movie.trailerYtId || null;
  const videoLd = trailerYtId ? {
    "@context":     "https://schema.org",
    "@type":        "VideoObject",
    "name":         `${movie.title} Official Trailer`,
    "description":  `Watch the official trailer of ${movie.title}, an Odia film${movie.director ? ` directed by ${movie.director}` : ""}.`,
    "thumbnailUrl": `https://img.youtube.com/vi/${trailerYtId}/maxresdefault.jpg`,
    "uploadDate":   movie.releaseDate ? new Date(movie.releaseDate).toISOString() : new Date().toISOString(),
    "contentUrl":   `https://www.youtube.com/watch?v=${trailerYtId}`,
    "embedUrl":     `https://www.youtube.com/embed/${trailerYtId}`,
    "publisher":    { "@type": "Organization", "name": "Ollypedia" },
    "inLanguage":   "or",
  } : null;

  // ── Blog ItemList JSON-LD — helps Google see blog links from this page ──────
  const blogItemListLd = relatedBlogs.length > 0 ? {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    "name":     `Articles & Reviews for ${movie.title}`,
    "itemListElement": relatedBlogs.map((b: any, i: number) => ({
      "@type":    "ListItem",
      "position": i + 1,
      "name":     b.title,
      "url":      `${SITE_URL}/blog/${b.slug}`,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      {datasetLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }} />
      )}
      {videoLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(videoLd) }} />
      )}
      {blogItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogItemListLd) }} />
      )}

      <BoxOfficeClient
        movie={movie}
        initialDays={days}
        totalNet={totalNet}
        totalGross={totalGross}
        updatedAt={movie.updatedAt}
        relatedBlogs={relatedBlogs}
        competingMovies={competingMovies}
      />

      {/* ★ SERVER-RENDERED SEO SECTION — positioned cleanly below the interactive client views */}
      <section
        aria-label={`${movie.title} box office collection summary`}
        className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8"
      >
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            {movie.title} Box Office Breakdown & Analysis
          </h2>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed mb-6">
            {movie.title} has accumulated{" "}
            <strong className="text-orange-400 font-semibold">{fmtINR(totalNet)} net</strong> and{" "}
            <strong className="text-white font-semibold">{fmtINR(totalGross)} gross</strong>{" "}
            {lastDay > 0 ? `across ${lastDay} days of tracking` : ""} at the Odia (Ollywood) box office.
            {movie.verdict ? ` The film holds a "${movie.verdict}" theatrical verdict.` : ""}
            {movie.director ? ` Directed by ${movie.director}.` : ""}
          </p>

          {/* Re-release data */}
          {movie.reReleaseBoxOfficeDays && movie.reReleaseBoxOfficeDays.length > 0 && (() => {
            const rrDays = movie.reReleaseBoxOfficeDays.sort((a: any, b: any) => a.day - b.day);
            const rrTotalNet = rrDays.reduce((s: number, d: any) => s + parseNum(d.net), 0);
            const rrTotalGross = rrDays.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
            const rrLastDay = rrDays[rrDays.length - 1]?.day || 0;
            return (
              <div className="pt-4 border-t border-[#1f1f1f]">
                <h3 className="text-lg font-bold text-white mb-2">
                  {movie.title} (Re-Release) Collections
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {movie.title} Re-Release has tracked an additional{" "}
                  <strong className="text-orange-400 font-semibold">{fmtINR(rrTotalNet)} net</strong> and{" "}
                  <strong className="text-white font-semibold">{fmtINR(rrTotalGross)} gross</strong>{" "}
                  over {rrLastDay} days.
                </p>
              </div>
            );
          })()}
        </div>
      </section>
    </>
  );
}