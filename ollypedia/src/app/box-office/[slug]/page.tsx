// app/box-office/[slug]/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
//  Box Office collection page  —  NEW file, does NOT touch any existing code
//  Route: /box-office/[movie-slug]
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import { notFound }       from "next/navigation";
import { connectDB }      from "@/lib/db";
import Movie              from "@/models/Movie";
import BoxOfficeClient    from "./BoxOfficeClient";

export const revalidate    = 1800;  // 30-min ISR — fresh on every new day
export const dynamicParams = true;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getVerdict(totalNet: number, budget?: string) {
  if (!totalNet) return "Pending";
  const b = parseNum(budget);
  if (b > 0) {
    const r = totalNet / b;
    if (r >= 3)   return "Blockbuster";
    if (r >= 2)   return "Super Hit";
    if (r >= 1.2) return "Hit";
    if (r >= 0.8) return "Average";
    if (r >= 0.5) return "Flop";
    return "Disaster";
  }
  if (totalNet > 5_00_00_000) return "Blockbuster";
  if (totalNet > 2_00_00_000) return "Super Hit";
  if (totalNet > 1_00_00_000) return "Hit";
  if (totalNet > 50_00_000)   return "Average";
  return "Flop";
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  await connectDB();
  const movies = await (Movie as any)
    .find({ "boxOfficeDays.0": { $exists: true } }, "slug title releaseDate")
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
  const movie = await (Movie as any).findOne({ slug }).lean();
  if (!movie) return null;
  return JSON.parse(JSON.stringify(movie));
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const movie = await getMovieBySlug(params.slug);
  if (!movie) return { robots: { index: false, follow: false } };

  const days      = (movie.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
  const totalNet  = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
  const totalGross= days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
  const lastDay   = days[days.length - 1]?.day || 0;
  const verdict   = getVerdict(totalNet, movie.budget);

  const title       = `${movie.title} Box Office Collection${lastDay ? ` Day ${lastDay}` : ""} | Ollypedia`;
  const description = `${movie.title} box office collection: Total Net ${fmtINR(totalNet)} | Total Gross ${fmtINR(totalGross)}${lastDay ? ` in ${lastDay} days` : ""}. Day-wise breakdown, verdict: ${verdict}. Updated daily.`;
  const image       = movie.bannerUrl || movie.posterUrl || "https://ollypedia.in/default.jpg";
  const canonical   = `https://ollypedia.in/box-office/${params.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url:         canonical,
      siteName:    "Ollypedia",
      type:        "article",
      publishedTime: movie.createdAt ? new Date(movie.createdAt).toISOString() : undefined,
      modifiedTime:  movie.updatedAt ? new Date(movie.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: movie.title }],
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
  const movie = await getMovieBySlug(params.slug);
  if (!movie) notFound();

  const days      = (movie.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
  const totalNet  = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
  const totalGross= days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
  const lastDay   = days[days.length - 1]?.day || 0;
  const verdict   = getVerdict(totalNet, movie.budget);

  // JSON-LD structured data
  const jsonLd = {
    "@context":    "https://schema.org",
    "@type":       "Article",
    "headline":    `${movie.title} Box Office Collection`,
    "description": `Complete day-wise box office collection of ${movie.title}. Total Net: ${fmtINR(totalNet)}.`,
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
      "@type": "WebPage",
      "@id":   `https://ollypedia.in/box-office/${params.slug}`,
    },
    ...(days.length > 0 && {
      "about": {
        "@type":       "Movie",
        "name":        movie.title,
        "dateCreated": movie.releaseDate || undefined,
      },
    }),
  };

  // Table structured data (FAQ schema for rich results)
  const faqLd = days.length > 0 ? {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    "mainEntity": [
      {
        "@type":          "Question",
        "name":           `What is the total box office collection of ${movie.title}?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} has earned a total net collection of ${fmtINR(totalNet)} and gross collection of ${fmtINR(totalGross)} in ${lastDay} days.`,
        },
      },
      {
        "@type":          "Question",
        "name":           `Is ${movie.title} a Hit or Flop?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `Based on current box office performance, ${movie.title} is a ${verdict}.`,
        },
      },
      ...(days[0] ? [{
        "@type":          "Question",
        "name":           `What is ${movie.title} Day 1 box office collection?`,
        "acceptedAnswer": {
          "@type": "Answer",
          "text":  `${movie.title} collected ${fmtINR(days[0].net)} net and ${fmtINR(days[0].gross)} gross on Day 1.`,
        },
      }] : []),
    ],
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <BoxOfficeClient
        movie={movie}
        initialDays={days}
        totalNet={totalNet}
        totalGross={totalGross}
        verdict={verdict}
      />
    </>
  );
}