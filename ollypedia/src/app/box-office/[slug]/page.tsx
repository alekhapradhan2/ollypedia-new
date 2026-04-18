// app/box-office/[slug]/page.tsx
// ★ UPDATED: Stronger movie-name-first SEO keywords, inter-link JSON-LD
//             linking box-office → movie → blog → songs for entity graph.

import type { Metadata } from "next";
import { notFound }       from "next/navigation";
import { connectDB }      from "@/lib/db";
import Movie              from "@/models/Movie";
import Blog               from "@/models/Blog";
import BoxOfficeClient    from "./BoxOfficeClient";

export const revalidate    = 60;          // ← was 1800, now 60s for fresh data
export const dynamicParams = true;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(val: unknown): string {
  const n = parseFloat(String(val || "").replace(/[^0-9.]/g, ""));
  if (isNaN(n) || n === 0) return String(val || "TBA");
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function parseNum(s: unknown): number {
  const v = parseFloat(String(s || "").replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
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
  const movies = await (Movie as any)
    .find({ "boxOfficeDays.0": { $exists: true } }, "slug title")
    .sort({ updatedAt: -1 })
    .limit(100)
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

  const image     = movie.bannerUrl || movie.posterUrl || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/box-office/${slug}`;

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
      modifiedTime:  movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: `${movie.title} Box Office Collection` }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
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

  // ★ Fetch related blogs for JSON-LD inter-linking
  const relatedBlogs = await getRelatedBlogs(movie.title, 6);

  // ── Article JSON-LD ──────────────────────────────────────────────────────────
  const articleLd = {
    "@context":    "https://schema.org",
    "@type":       "Article",
    "headline":    `${movie.title} Box Office Collection${lastDay ? ` Day 1 to Day ${lastDay}` : ""}`,
    "description": `Complete day-wise box office collection of ${movie.title}. Total Net: ${fmtINR(totalNet)}, Total Gross: ${fmtINR(totalGross)}.`,
    "datePublished": movie.createdAt ? new Date(movie.createdAt).toISOString() : undefined,
    "dateModified":  movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
    "image":         movie.bannerUrl || movie.posterUrl || "https://ollypedia.in/default.jpg",
    "author":        { "@type": "Organization", "name": "Ollypedia" },
    "publisher": {
      "@type": "Organization",
      "name":  "Ollypedia",
      "logo":  { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" },
    },
    "mainEntityOfPage": {
      "@type": "@id",
      "@id":   `https://ollypedia.in/box-office/${slug}`,
    },
    // ★ Link box-office page → movie entity
    "about": {
      "@type":       "Movie",
      "name":        movie.title,
      "url":         `https://ollypedia.in/movie/${movie.slug}`,
      "dateCreated": movie.releaseDate || undefined,
      ...(movie.director && { "director": { "@type": "Person", "name": movie.director } }),
      ...(songs.length > 0 && {
        "musicBy": songs[0]?.musicDirector
          ? { "@type": "Person", "name": songs[0].musicDirector }
          : undefined,
      }),
    },
    // ★ Mention all cross-linked pages so Google traces the entity web
    "mentions": [
      { "@type": "WebPage", "name": `${movie.title} — Movie Page`,  "url": `https://ollypedia.in/movie/${movie.slug}` },
      { "@type": "WebPage", "name": `${movie.title} Songs`,          "url": `https://ollypedia.in/songs/${movie.slug}` },
      { "@type": "WebPage", "name": `${movie.title} Blog & Reviews`, "url": `https://ollypedia.in/blog?movie=${encodeURIComponent(movie.title)}` },
      ...relatedBlogs.map((b: any) => ({
        "@type": "WebPage",
        "name":  b.title,
        "url":   `https://ollypedia.in/blog/${b.slug}`,
      })),
    ],
  };

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
          "text":  `${movie.title} earned ${fmtINR(days.slice(0,7).reduce((s: number, d: any) => s + parseNum(d.net), 0))} net in its first week.`,
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
      { "@type": "ListItem", "position": 1, "name": "Home",       "item": "https://ollypedia.in/" },
      { "@type": "ListItem", "position": 2, "name": "Box Office", "item": "https://ollypedia.in/box-office" },
      { "@type": "ListItem", "position": 3, "name": movie.title,  "item": `https://ollypedia.in/box-office/${slug}` },
    ],
  };

  // ── Blog ItemList JSON-LD — helps Google see blog links from this page ──────
  const blogItemListLd = relatedBlogs.length > 0 ? {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    "name":     `Articles & Reviews for ${movie.title}`,
    "itemListElement": relatedBlogs.map((b: any, i: number) => ({
      "@type":    "ListItem",
      "position": i + 1,
      "name":     b.title,
      "url":      `https://ollypedia.in/blog/${b.slug}`,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {faqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      )}
      {blogItemListLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogItemListLd) }} />
      )}
      <BoxOfficeClient
        movie={movie}
        initialDays={days}
        totalNet={totalNet}
        totalGross={totalGross}
      />
    </>
  );
}