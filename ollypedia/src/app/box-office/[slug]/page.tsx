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
// ── Expanded fuzzy keyword generator ────────────────────────────────────────
// Generates typo variants + intent-based phrase combinations for each word
// in the movie title.  Result is a flat list of long-tail keyword strings.
function getMisspellings(title: string): string[] {
  if (!title) return [];

  // --- Suffix sets ---
  const intentSuffixes = [
    "movie", "film", "odia", "odia film", "odia movie", "ollywood",
    "review", "story", "cast", "songs", "trailer", "box office",
    "collection", "rating", "release date", "full movie",
    "movie review", "public review", "movie story", "movie cast",
    "movie trailer", "movie details", "worth watching",
    "movie rating ollypedia", "movie in odisha", "bhubaneswar release",
    "odia cinema", "odia movie review", "ollywood movie",
  ];

  const variants = new Set<string>();
  const words    = title.trim().split(/\s+/);

  for (const word of words) {
    if (word.length < 3) continue;
    const w = word.toLowerCase();

    // Phonetic swaps
    const typos: string[] = [
      w.replace(/([aeiou])\1+/g, "$1"),   // double vowel removal
      w.replace(/a/g, "e"),
      w.replace(/a/g, "o"),
      w.replace(/e/g, "i"),
      w.replace(/u/g, "o"),
      w.replace(/i/g, "e"),
      w.replace(/h/g, ""),                 // silent-h drop
      w.replace(/ck/g, "k"),
      w.replace(/ph/g, "f"),
      w + "a", w + "i", w + "u",          // trailing vowel additions
      w.slice(0, -1),                      // drop last char
      w.slice(1),                          // drop first char
    ];

    // Transpositions (adjacent letter swap)
    for (let i = 0; i < w.length - 1; i++) {
      typos.push(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }

    for (const typo of typos) {
      if (!typo || typo === w || typo.length < 3) continue;
      // Pair each typo with all intent suffixes
      for (const suffix of intentSuffixes) {
        variants.add(`${typo} ${suffix}`);
      }
    }
  }

  // Also add clean title + all intent suffixes (no typo — just phrasing)
  const cleanTitle = title.toLowerCase();
  for (const suffix of intentSuffixes) {
    variants.add(`${cleanTitle} ${suffix}`);
  }

  return [...variants].filter(v => v.length > 4).slice(0, 60); // cap at 60
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  await connectDB();
  // Fetch ALL box-office movies, not just 30 — pages beyond 30 were ISR cold-starts
  const movies = await (Movie as any)
    .find({ "boxOfficeDays.0": { $exists: true } }, "slug title")
    .sort({ updatedAt: -1 })
    .lean();
  return movies.map((m: any) => ({
    slug: m.slug || String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  }));
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
  const year       = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const day1Net    = days[0] ? parseNum(days[0].net) : 0;

  // SEO title: movie name first → highest relevance signal
  const title = lastDay
    ? `${movie.title} Box Office Collection Day ${lastDay} — ${fmtINR(totalNet)} Net | Ollypedia`
    : `${movie.title} Box Office Collection | Odia Film | Ollypedia`;

  const description = totalNet
    ? `${movie.title}${year ? ` (${year})` : ""} box office: ₹ ${fmtINR(totalNet)} net, ${fmtINR(totalGross)} gross in ${lastDay} days. Day 1 collection: ${fmtINR(day1Net)}. Full day-wise Odia (Ollywood) box office data on Ollypedia.`
    : `Track ${movie.title} day-wise box office collection — net and gross earnings updated daily. Odia (Ollywood) cinema box office data on Ollypedia.`;

  const image     = movie.bannerUrl || movie.posterUrl || `${SITE_URL}/default.jpg`;
  const canonical = `${SITE_URL}/box-office/${slug}`;

  // ★ Comprehensive keyword set — movie name first in every variant
  const keywords = [
    // ── Core box-office keywords (movie name first = highest relevance) ──
    `${movie.title} box office collection`,
    `${movie.title} box office`,
    `${movie.title} collection`,
    `${movie.title} total collection`,
    `${movie.title} day wise collection`,
    `${movie.title} 1st day collection`,
    `${movie.title} first day collection`,
    `${movie.title} first week collection`,
    `${movie.title} opening day collection`,
    `${movie.title} net collection`,
    `${movie.title} gross collection`,
    `${movie.title} worldwide collection`,
    `${movie.title} earning`,

    // ── Movie intent keywords ──────────────────────────────────────────────
    `${movie.title} review`,
    `${movie.title} full movie details`,
    `${movie.title} story`,
    `${movie.title} cast and crew`,
    `${movie.title} cast`,
    `${movie.title} director`,
    `${movie.title} release date`,
    `${movie.title} trailer`,
    `${movie.title} songs`,
    `${movie.title} movie`,
    `${movie.title} film`,
    `${movie.title} rating`,
    `${movie.title} public review`,
    `${movie.title} worth watching`,
    `${movie.title} movie review`,
    `${movie.title} movie story`,
    `${movie.title} movie cast`,
    `${movie.title} full movie review`,
    `${movie.title} movie details`,
    `${movie.title} movie rating ollypedia`,

    // ── Regional + language ────────────────────────────────────────────────
    `${movie.title} odia movie`,
    `${movie.title} odia film`,
    `${movie.title} ollywood`,
    `${movie.title} ollywood movie`,
    `${movie.title} odia cinema`,
    `${movie.title} movie in odisha`,
    `${movie.title} bhubaneswar release`,
    `odia movie ${movie.title} review`,

    // ── Long-tail intent ───────────────────────────────────────────────────
    `${movie.title} movie review in odia`,
    `${movie.title} movie public review`,
    `${movie.title} movie worth watching`,
    `${movie.title} movie rating ollypedia`,
    year ? `latest odia movie ${movie.title} review ${year}` : "",
    year ? `${movie.title} ${year} box office` : "",
    year ? `${movie.title} ${year} collection` : "",
    year ? `${movie.title} ${year} review` : "",
    year ? `${movie.title} odia movie ${year}` : "",

    // ── Director-based ────────────────────────────────────────────────────
    movie.director ? `${movie.director} movie collection` : "",
    movie.director ? `${movie.director} odia film` : "",
    movie.director ? `${movie.director} new movie` : "",
    movie.director ? `${movie.director} movie review` : "",

    // ── General Odia box office ───────────────────────────────────────────
    "odia box office collection",
    "ollywood box office",
    "odia film collection",
    "odia movie box office",
    "odia film box office report",
    "ollywood hit movie",
    year ? `odia movies ${year}` : "",
    year ? `ollywood ${year} collection` : "",
    year ? `odia box office ${year}` : "",
    year ? `best odia movie ${year}` : "",

    // ── Cast-based keywords — actor name + "new movie collection" = top search type ──
    ...(movie.cast || []).slice(0, 4).flatMap((c: any) => [
      `${c.name} new movie`,
      `${c.name} new movie collection`,
      `${c.name} movie ${year || ""}`.trim(),
      `${c.name} odia movie`,
    ]),

    // ── Genre-based ──────────────────────────────────────────────────────
    ...(movie.genre || []).map((g: string) => `${g} odia film box office`),
    ...(movie.genre || []).map((g: string) => `${g} ollywood movie`),

    // ── Fuzzy typo variants with intent phrases ───────────────────────────
    ...getMisspellings(movie.title),
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url:           canonical,
      siteName:      "Ollypedia",
      type:          "article",
      locale:        "en_IN",
      publishedTime: movie.createdAt ? new Date(movie.createdAt).toISOString() : undefined,
      modifiedTime:  movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: `${movie.title} Box Office Collection` }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      site:        "@ollypedia",
      images:      [image],
    },
  };
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
    "mainEntityOfPage": {
      "@type": "@id",
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
        "actor": movie.cast.slice(0, 5).map((c: any) => ({
          "@type": "Person",
          "name":  c.name,
        })),
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

      {/* ★ SERVER-RENDERED TEXT — Google indexes this, users don't see it */}
      <div style={{ position:"absolute", left:"-9999px", width:1, height:1, overflow:"hidden" }}
           aria-hidden="true">
        <h1>{movie.title} Box Office Collection — Total {fmtINR(totalNet)} Net</h1>
        <p>{movie.title} has collected {fmtINR(totalNet)} net and {fmtINR(totalGross)} gross
           in {lastDay} days at the Odia (Ollywood) box office.</p>
        <table>
          <caption>{movie.title} Day-wise Box Office Collection</caption>
          <thead><tr><th>Day</th><th>Net Collection</th><th>Gross Collection</th></tr></thead>
          <tbody>
            {days.map((d: any) => (
              <tr key={d.day}>
                <td>Day {d.day}</td>
                <td>{fmtINR(d.net)}</td>
                <td>{fmtINR(d.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {movie.reReleaseBoxOfficeDays && movie.reReleaseBoxOfficeDays.length > 0 && (() => {
          const rrDays = movie.reReleaseBoxOfficeDays.sort((a: any, b: any) => a.day - b.day);
          const rrTotalNet = rrDays.reduce((s: number, d: any) => s + parseNum(d.net), 0);
          const rrTotalGross = rrDays.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
          const rrLastDay = rrDays[rrDays.length - 1]?.day || 0;
          return (
            <>
              <h2>{movie.title} (Re-Release) Box Office Collection — Total {fmtINR(rrTotalNet)} Net</h2>
              <p>{movie.title} Re-Release has collected {fmtINR(rrTotalNet)} net and {fmtINR(rrTotalGross)} gross in {rrLastDay} days.</p>
              <table>
                <caption>{movie.title} (Re-Release) Day-wise Box Office Collection</caption>
                <thead><tr><th>Day</th><th>Net Collection</th><th>Gross Collection</th></tr></thead>
                <tbody>
                  {rrDays.map((d: any) => (
                    <tr key={d.day}>
                      <td>Day {d.day}</td>
                      <td>{fmtINR(d.net)}</td>
                      <td>{fmtINR(d.gross)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          );
        })()}
      </div>
      <BoxOfficeClient
        movie={movie}
        initialDays={days}
        totalNet={totalNet}
        totalGross={totalGross}
        updatedAt={movie.updatedAt}
        relatedBlogs={relatedBlogs}
        competingMovies={competingMovies}
      />
    </>
  );
}