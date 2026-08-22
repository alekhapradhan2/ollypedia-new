import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Blog from "@/models/Blog";
import { MovieCard } from "@/components/movie/MovieCard";
import { BlogCard } from "@/components/blog/BlogCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buildMeta, SITE_NAME } from "@/lib/seo";
import {
  Film, Star, Music, TrendingUp, Award, BookOpen,
  ChevronRight, Clapperboard, Users, Mic2, Trophy, Flame, Clock, Info,
} from "lucide-react";
import { CommunityMovieCard, type CommunityMovieData } from "@/components/community/CommunityMovieCard";
import HeroCarousel, { type HeroMovie } from "@/components/layout/HeroCarousel";
import { InFeedAd } from "@/components/ads/InFeedAd";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { formatReleaseDate, mongoDateExpr } from "@/lib/dateUtils";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: `${SITE_NAME} – The Odia Film Encyclopedia`,
  description:
    "Ollypedia is Odisha's most comprehensive Odia film database. Discover latest Ollywood movies, songs, actor biographies, box office collection, reviews, Odia film blogs, and join the Odia cinema community to vote, discuss and rate movies.",
  image: "https://www.ollypedia.in/logo.png",
  imageAlt: "Ollypedia – The Odia Film Encyclopedia | Ollywood Movies, Cast, Songs & Box Office",
  keywords: [
    "Odia movies 2026", "Ollywood", "Odia cinema", "Odia films", "Babushaan",
    "Elina Samantray", "Odia actor", "Odia songs", "Odia movie reviews",
    "Ollywood box office", "Odia film blog", "official Odia cinema database",
    "legal Odia movie streaming info",
    "Odia movie community", "Ollywood community", "Odia cinema discussion",
    "Ollypedia Meter", "rate Odia movies", "Odia film reviews community",
    "upcoming Odia movies", "latest Odia releases",
  ],
  url: "/",
});

// ── Date helpers ─────────────────────────────────────────────────
const _now = new Date();
function withinDays(d: string | undefined, past: number, future: number) {
  if (!d) return false;
  const diff = (new Date(d).getTime() - _now.getTime()) / 86400000;
  return diff >= -past && diff <= future;
}
function isThisMonth(d: string | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  return dt.getMonth() === _now.getMonth() && dt.getFullYear() === _now.getFullYear();
}
function isLastMonth(d: string | undefined) {
  if (!d) return false;
  const dt = new Date(d);
  const lm = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
  return dt.getMonth() === lm.getMonth() && dt.getFullYear() === lm.getFullYear();
}
function fmtDate(iso: string, precision?: string) {
  return formatReleaseDate(iso, precision, "short");
}

// ── Date precision ranking ──────────────────────────────────────
// Priority tier: 1 = Full exact date, 2 = Month/Year, 3 = Year only, 4 = TBA / No date
function getDatePrecisionScore(m: any): number {
  const isRe = m.isReRelease && m.reReleaseDate;
  const tba = isRe ? m.reReleaseTBA : m.releaseTBA;
  const raw = isRe ? m.reReleaseDate : m.releaseDate;
  const prec = isRe ? m.reReleaseDatePrecision : m.releaseDatePrecision;

  if (tba || !raw || typeof raw !== "string") return 4;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "TBA") return 4;

  // 1. Year only: precision is "year" OR string is 4-digit year (e.g. "2026")
  if (prec === "year" || /^\d{4}$/.test(s)) return 3;

  // 2. Month & Year: precision is "month" OR string is YYYY-MM (e.g. "2026-08")
  if (prec === "month" || /^\d{4}-\d{2}$/.test(s)) return 2;

  // 3. Full date: valid YYYY-MM-DD
  const cleanIso = s.split("T")[0];
  const parts = cleanIso.split("-");
  if (parts.length === 3 && parts[1] && parts[2] && parts[2] !== "00") {
    return 1; // Full exact date
  }

  if (prec === "full") return 1;
  return 3;
}

function getMovieReleaseTime(m: any): number | null {
  const isRe = m.isReRelease && m.reReleaseDate;
  const raw = isRe ? m.reReleaseDate : m.releaseDate;
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s || s.toUpperCase() === "TBA") return null;

  // If 4-digit year (e.g. "2026"), sort as end of that year (Dec 31)
  if (/^\d{4}$/.test(s) || m.releaseDatePrecision === "year") {
    const yr = parseInt(s.slice(0, 4), 10);
    return !isNaN(yr) ? new Date(yr, 11, 31, 23, 59, 59).getTime() : null;
  }

  // If YYYY-MM (e.g. "2026-08"), sort as end of that month
  if (/^\d{4}-\d{2}$/.test(s) || m.releaseDatePrecision === "month") {
    const parts = s.split("-");
    const yr = parseInt(parts[0], 10);
    const mo = parseInt(parts[1], 10);
    if (!isNaN(yr) && !isNaN(mo)) {
      return new Date(yr, mo, 0, 23, 59, 59).getTime();
    }
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? null : dt.getTime();
}

// ── Box office helpers (same as /box-office/page.tsx) ────────────
function parseNum(s: unknown): number {
  const str = String(s || "").trim();
  const crMatch = str.match(/([\d.]+)\s*Cr/i);
  if (crMatch) return parseFloat(crMatch[1]) * 1_00_00_000;
  const lMatch  = str.match(/([\d.]+)\s*L/i);
  if (lMatch)  return parseFloat(lMatch[1])  * 1_00_000;
  const v = parseFloat(str.replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
}
function fmtINR(n: number): string {
  if (!n) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

async function getHomeData() {
  await connectDB();
  const [allMovies, upcomingMovies, latestBlogs, reReleaseMovies] = await Promise.all([
    Movie.find({}, "-reviews -media.songs")
      .sort({ releaseDate: -1 })
      .limit(100)
      .lean(),
    // ── Dedicated upcoming query so TBA movies (no releaseDate) are never
    //    crowded out by the 80-doc limit on the main descending-date query.
    Movie.aggregate([
      {
        $match: {
          $or: [{ verdict: "Upcoming" }, { verdict: { $exists: false } }, { verdict: null }],
        },
      },
      { $project: { reviews: 0, "media.songs": 0 } },
      {
        $addFields: {
          // 1 if releaseDate is a non-empty string, 0 if null/missing/empty → TBA
          _hasDated: {
            $cond: [
              { $and: [{ $ifNull: ["$releaseDate", false] }, { $ne: ["$releaseDate", ""] }] },
              1,
              0,
            ],
          },
          _releaseDateObj: mongoDateExpr("$releaseDate", "9999-12-31"),
        },
      },
      // _hasDated desc (dated first), then by date asc (soonest first), TBA last
      { $sort: { _hasDated: -1, _releaseDateObj: 1 } },
      { $limit: 12 },
    ]),
    // Latest blogs for the main grid
    Blog.find({ published: true }, "-content -reviews")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    // Re-releases to ensure they aren't missed by limits
    Movie.find({ isReRelease: true }, "-reviews -media.songs").lean(),
  ]);

  const allPossibleMovies = [...(allMovies as any[]), ...(upcomingMovies as any[]), ...(reReleaseMovies as any[])];
  const uniqueMoviesMap = new Map();
  allPossibleMovies.forEach(m => uniqueMoviesMap.set(String(m._id), m));
  const uniqueMovies = Array.from(uniqueMoviesMap.values());

  // ── Hero movies ───────────────────────────────────────────────
  const heroMovies: HeroMovie[] = uniqueMovies
    .filter((m) => {
      const hasImage = m.thumbnailUrl || (m.media?.videos && m.media.videos.length > 0) || m.posterUrl;
      if (!hasImage) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      const rd = m.isReRelease && m.reReleaseDate ? m.reReleaseDate : m.releaseDate;
      if (rd && withinDays(rd, 60, 0)) return true;
      return isThisMonth(rd) || isLastMonth(rd);
    })
    .sort((a: any, b: any) => {
      const aUp = !a.verdict || a.verdict === "Upcoming";
      const bUp = !b.verdict || b.verdict === "Upcoming";
      const aDate = getMovieReleaseTime(a);
      const bDate = getMovieReleaseTime(b);
      if (aUp && bUp) {
        // Show movies with full release date first, then month+year, then year only, then TBA
        const aScore = getDatePrecisionScore(a);
        const bScore = getDatePrecisionScore(b);
        if (aScore !== bScore) {
          return aScore - bScore;
        }
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate - bDate;
      }
      if (aUp && !bUp) return -1;
      if (!aUp && bUp) return 1;
      return (bDate || 0) - (aDate || 0);
    })
    .slice(0, 8)
    .map((m: any) => ({
      _id:         String(m._id),
      slug:        m.slug        || undefined,
      title:       m.title,
      category:    m.category    || undefined,
      genre:       m.genre       || undefined,
      language:    m.language    || undefined,
      releaseDate: m.releaseDate || undefined,
      releaseDatePrecision: m.releaseDatePrecision || undefined,
      isReRelease: m.isReRelease || undefined,
      reReleaseDate: m.reReleaseDate || undefined,
      reReleaseDatePrecision: m.reReleaseDatePrecision || undefined,
      releaseTBA:  m.releaseTBA  || undefined,
      director:    m.director    || undefined,
      verdict:     m.verdict     || undefined,
      synopsis:    m.synopsis    || undefined,
      thumbnailUrl: m.thumbnailUrl || undefined,
      posterUrl:   m.posterUrl   || undefined,
      bannerUrl:   m.bannerUrl   || undefined,
      videos:      m.media?.videos || undefined,
    }));

  // ── Latest released movies ────────────────────────────────────
  const latestMovies = (allMovies as any[])
    .filter((m) => m.status !== "Upcoming" && m.releaseDate && new Date(m.releaseDate) <= _now)
    .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 10);

  // ── Top-rated / blockbuster movies ───────────────────────────
  const topMovies = (allMovies as any[])
    .filter((m) => ["Blockbuster","Super Hit","Hit"].includes(m.verdict || ""))
    .sort((a: any, b: any) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime())
    .slice(0, 5);

  // ── Box office movies — recently released with collection data ─
  const boxOfficeMovies = (allMovies as any[])
    .filter((m) =>
      m.releaseDate &&
      new Date(m.releaseDate) <= _now &&
      m.verdict && m.verdict !== "Upcoming" &&
      m.boxOfficeDays && m.boxOfficeDays.length > 0
    )
    .map((m) => {
      const days = (m.boxOfficeDays as any[]).slice().sort((a, b) => a.day - b.day);
      const totalNet   = days.reduce((s, d) => s + parseNum(d.net),   0);
      const totalGross = days.reduce((s, d) => s + parseNum(d.gross), 0);
      return { ...m, _days: days, _totalNet: totalNet, _totalGross: totalGross };
    })
    .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 5);

  // ── JS-side re-sort as guarantee: full date -> month/year -> year only -> TBA last ──
  const sortedUpcoming = (upcomingMovies as any[]).sort((a, b) => {
    const aScore = getDatePrecisionScore(a);
    const bScore = getDatePrecisionScore(b);
    if (aScore !== bScore) {
      return aScore - bScore;
    }
    const aDate = getMovieReleaseTime(a);
    const bDate = getMovieReleaseTime(b);
    if (aDate && bDate) return aDate - bDate;  // both dated: soonest first
    if (aDate && !bDate) return -1;            // a has date, b is TBA: a first
    if (!aDate && bDate) return 1;             // a is TBA, b has date: b first
    return 0;                                  // both TBA: keep order
  });

  // ── This Month in Ollywood ──────────────────────────────────
  const thisMonthAll = uniqueMovies
    .filter((m: any) => {
      const rd = m.isReRelease && m.reReleaseDate ? m.reReleaseDate : m.releaseDate;
      return rd && isThisMonth(rd);
    })
    .sort((a: any, b: any) => {
      const aRd = a.isReRelease && a.reReleaseDate ? a.reReleaseDate : a.releaseDate;
      const bRd = b.isReRelease && b.reReleaseDate ? b.reReleaseDate : b.releaseDate;
      return new Date(aRd).getTime() - new Date(bRd).getTime();
    });

  // ── Community movie cards (no extra DB query, sliced from existing data) ─
  function toCommunityMovie(m: any): CommunityMovieData {
    return {
      _id:   String(m._id),
      title: m.title,
      slug:  m.slug || String(m._id),
      posterUrl:    m.posterUrl    || undefined,
      thumbnailUrl: m.thumbnailUrl || undefined,
      releaseDate:  m.releaseDate  || undefined,
      releaseDatePrecision: m.releaseDatePrecision || undefined,
      releaseTBA:   m.releaseTBA   || false,
      interestedYes: m.interestedYes || 0,
      interestedNo:  m.interestedNo  || 0,
      status:  m.status  || undefined,
      language: m.language || undefined,
      genre:   m.genre   || [],
      verdict: m.verdict || undefined,
      community: {
        totalVotes:    0,
        breakdown:     { skip: 0, timepass: 0, go_for_it: 0, perfection: 0 },
        topCategory:   "go_for_it",
        topPercentage: 0,
        threadsCount:  0,
        commentsCount: 0,
        lastActivity:  null,
      },
    };
  }

  const communityLatest = (allMovies as any[])
    .filter((m) => m.status !== "Upcoming" && m.releaseDate && new Date(m.releaseDate) <= _now)
    .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 6)
    .map(toCommunityMovie);

  const communityUpcoming = (sortedUpcoming as any[])
    .slice(0, 6)
    .map(toCommunityMovie);

  return { heroMovies, latestMovies, upcomingMovies: sortedUpcoming, latestBlogs, topMovies, boxOfficeMovies, thisMonthAll, communityLatest, communityUpcoming };
}

// ── Category pills for blog ───────────────────────────────────────
const BLOG_CATEGORIES = [
  { label: "Movie Review",    href: "/blog?category=Movie+Review",    emoji: "🎬" },
  { label: "Actor Spotlight", href: "/blog?category=Actor+Spotlight", emoji: "🌟" },
  { label: "Top 10",          href: "/blog?category=Top+10",          emoji: "🏆" },
  { label: "Behind the Scenes",href: "/blog?category=Behind+the+Scenes",emoji: "🎥" },
  { label: "Music",           href: "/blog?category=Music",           emoji: "🎵" },
  { label: "Opinion",         href: "/blog?category=Opinion",         emoji: "💬" },
  { label: "Box Office",      href: "/blog?category=Box+Office",      emoji: "📊" },
  { label: "Industry News",   href: "/blog?category=News",            emoji: "📰" },
];

export default async function HomePage() {
  const { heroMovies, latestMovies, upcomingMovies, latestBlogs, topMovies, boxOfficeMovies, thisMonthAll, communityLatest, communityUpcoming } =
    await getHomeData();

  return (
    <div className="min-h-screen">

      {/* ══ WebSite + Organization JSON-LD (Sitelinks Searchbox eligibility) ══ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Ollypedia",
              url: "https://www.ollypedia.in",
              description: "Ollypedia is the ultimate encyclopedia for Odia (Ollywood) cinema. Discover movies, actors, songs, reviews, box office, and news.",
              // ★ Sitelinks Searchbox: target uses URI template format
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://www.ollypedia.in/search?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Ollypedia",
              url: "https://www.ollypedia.in",
              // ★ Logo must be ImageObject with dimensions for proper Google display
              logo: {
                "@type": "ImageObject",
                url: "https://www.ollypedia.in/logo.png",
                width: 600,
                height: 60,
              },
              // ★ Complete sameAs — Google uses this to match entity to Knowledge Graph
              sameAs: [
                "https://www.instagram.com/ollypedia.in",
                "https://www.facebook.com/ollypedia",
                "https://twitter.com/ollypedia",
                "https://www.youtube.com/@ollypedia",
              ],
            },
            {
              "@context": "https://schema.org",
              // WebPage is the correct type for a community hub/landing page.
              // DiscussionForumPosting is for a single thread — not a forum index.
              "@type": "WebPage",
              name: "Ollypedia Odia Cinema Community — Vote, Discuss & Rate Odia Movies",
              url: "https://www.ollypedia.in/discussion",
              description:
                "Join the Ollypedia Community — the official hub for Odia cinema fans. Use the Ollypedia Meter to vote Skip, Timepass, Go for it, or Perfection on Odia movies. Participate in live discussion rooms, share audience reviews, and connect with thousands of Ollywood enthusiasts.",
              breadcrumb: {
                "@type": "BreadcrumbList",
                itemListElement: [
                  { "@type": "ListItem", position: 1, name: "Home", item: "https://www.ollypedia.in" },
                  { "@type": "ListItem", position: 2, name: "Community", item: "https://www.ollypedia.in/discussion" },
                ],
              },
              publisher: {
                "@type": "Organization",
                name: "Ollypedia",
                url: "https://www.ollypedia.in",
              },
              about: {
                "@type": "Thing",
                name: "Odia Cinema",
                sameAs: "https://en.wikipedia.org/wiki/Odia_cinema",
              },
            },
          ]),
        }}
      />

      {/* ══ HERO CAROUSEL ══ */}
      {/* Visually-hidden H1 tells Google this page is about the Odia Film Encyclopedia.
          Hero carousel movie titles use h2 — a movie title is not the page topic. */}
      <h1 className="sr-only">Ollypedia – Odia Film Encyclopedia | Ollywood Movies, Cast, Songs &amp; Box Office</h1>
      {heroMovies.length > 0 ? (
        <HeroCarousel movies={heroMovies} />
      ) : (
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
          <div className="relative z-10 text-center px-4">
            <p className="font-display text-5xl md:text-7xl font-black text-white leading-none mb-4">
              Discover <span className="text-orange-500">Odia</span> Cinema
            </p>
            <p className="text-gray-300 text-lg mb-6">
              Your ultimate guide to Ollywood — movies, actors, songs, and more.
            </p>
            <Link href="/movies" className="btn-primary inline-flex items-center gap-2">
              <Film className="w-4 h-4" /> Explore Movies
            </Link>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <DisplayAd slot="8191172163" format="horizontal" />
      </div>

      {/* ══ COMMUNITY SECTION — after hero ══ */}
      <section
        aria-label="Ollypedia Odia Cinema Community — Vote, Discuss &amp; Rate Odia Movies"
        className="relative overflow-hidden border-b border-[#1f1f1f] bg-[#0d0d0d]"
      >
        {/* SEO: Microdata + visually-hidden rich-text for search engines.
             itemScope on a div (not section) for better microdata parser compat. */}
        <div
          className="sr-only"
          itemScope
          itemType="https://schema.org/WebPage"
        >
          <span itemProp="name">Ollypedia Odia Cinema Community — Movie Discussion &amp; Ratings</span>
          <p itemProp="description">
            The Ollypedia Community is the official hub for Odia cinema and Ollywood fans.
            Vote on Odia movies with the Ollypedia Meter — choose Skip, Timepass, Go for it, or Perfection.
            Join live discussion rooms for upcoming Odia movies and latest Odia releases.
            Share audience reviews, rate Odia films, and connect with thousands of Ollywood enthusiasts across Odisha and the diaspora.
            Discover upcoming Odia movies 2026, discuss recently released Odia films, and be part of the largest Odia cinema community online.
          </p>
          <a itemProp="url" href="https://www.ollypedia.in/discussion">Ollypedia Community</a>
        </div>
        {/* Decorative glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-gradient-to-r from-orange-500/4 to-transparent" />
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-purple-500/4 to-transparent" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">

          {/* — Header row — */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/25 to-orange-500/5 border border-orange-500/30 flex items-center justify-center">
                  <Users className="w-5 h-5 text-orange-400" />
                </div>
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#0d0d0d] animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-0.5">Community</p>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg sm:text-xl font-black text-white leading-tight">
                    The Ollypedia <span className="text-orange-400">Movie Community</span>
                  </h2>
                  {/* Info icon with CSS-only tooltip */}
                  <div className="relative group/info flex-shrink-0">
                    <button
                      type="button"
                      aria-label="About Ollypedia Community"
                      className="w-5 h-5 rounded-full bg-white/5 border border-white/10 hover:border-orange-500/40 hover:bg-orange-500/10 flex items-center justify-center transition-all cursor-help"
                    >
                      <Info className="w-3 h-3 text-gray-500 group-hover/info:text-orange-400 transition-colors" />
                    </button>
                    {/* Tooltip */}
                    <div className="absolute left-0 top-full mt-2 z-50 w-72 sm:w-80 pointer-events-none opacity-0 group-hover/info:opacity-100 transition-opacity duration-200">
                      <div className="bg-[#1a1a1a] border border-orange-500/20 rounded-2xl p-4 shadow-2xl shadow-black/60">
                        {/* Arrow */}
                        <div className="absolute -top-1.5 left-3 w-3 h-3 bg-[#1a1a1a] border-l border-t border-orange-500/20 rotate-45" />
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                            <Users className="w-3.5 h-3.5 text-orange-400" />
                          </div>
                          <p className="text-xs font-black text-white">Ollypedia Community</p>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">
                          The Ollypedia Community is the official hub for Odia cinema fans. Vote on movies using the <strong className="text-white">Ollypedia Meter</strong>, join live discussion rooms, share audience reviews, and connect with thousands of Ollywood enthusiasts.
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { emoji: "🩷", label: "Skip" },
                            { emoji: "🟡", label: "Timepass" },
                            { emoji: "🟢", label: "Go for it" },
                            { emoji: "🟣", label: "Perfection" },
                          ].map(({ emoji, label }) => (
                            <div key={label} className="flex items-center gap-1.5 bg-white/4 rounded-lg px-2 py-1">
                              <span className="text-xs">{emoji}</span>
                              <span className="text-[10px] text-zinc-400 font-medium">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Link
              href="/discussion"
              className="group inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-black px-4 py-2 rounded-xl transition-all text-xs shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 flex-shrink-0"
            >
              Explore Community
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* — Two-column movie grids — */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">

            {/* LEFT — Upcoming Movies */}
            {communityUpcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Upcoming Movies</p>
                    <p className="text-[10px] text-zinc-500">Anticipated films with early fan buzz</p>
                  </div>
                  <Link href="/discussion" className="ml-auto text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-0.5 transition-colors">
                    See all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {communityUpcoming.map((movie) => (
                    <CommunityMovieCard key={movie._id} movie={movie} />
                  ))}
                </div>
              </div>
            )}

            {/* RIGHT — Latest Releases */}
            {communityLatest.length > 0 && (
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Flame className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Latest Releases</p>
                    <p className="text-[10px] text-zinc-500">Recently released films in discussion rooms</p>
                  </div>
                  <Link href="/discussion" className="ml-auto text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-0.5 transition-colors">
                    See all <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-2.5 sm:gap-3">
                  {communityLatest.map((movie) => (
                    <CommunityMovieCard key={movie._id} movie={movie} />
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* — Footer tagline — */}
          <p className="text-center text-[11px] text-gray-600 mt-6">
            Vote • Discuss • Rate — <Link href="/discussion" className="text-orange-400 hover:text-orange-300 transition-colors">Join the Ollypedia community</Link>
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <DisplayAd slot="8191172163" format="horizontal" />
      </div>

      {/* ══ STATS BAR ══ */}
      <section className="bg-[#111] border-y border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#1f1f1f]">
            {[
              { icon: Film,      label: "Odia Movies",   value: "500+"  },
              { icon: Users,     label: "Cast Profiles",  value: "1000+" },
              { icon: Music,     label: "Odia Songs",    value: "5000+" },
              { icon: BookOpen,  label: "Blog Articles", value: "100+"  },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-3 sm:py-4">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-base sm:text-lg font-bold text-white font-display">{value}</p>
                  <p className="text-[10px] sm:text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 sm:space-y-20">

        {/* ══ LATEST RELEASES ══ */}
        {latestMovies.length > 0 && (
          <section aria-label="Latest Odia movie releases">
            <SectionHeader
              title="Latest Releases"
              subtitle="Newest Odia films from Ollywood"
              href="/movies"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {latestMovies.slice(0, 10).map((m: any, idx: number) => (
                <React.Fragment key={String(m._id)}>
                  {idx === 4 && (
                    <div className="col-span-2 sm:col-span-1 h-full">
                      <InFeedAd className="min-h-[250px]" />
                    </div>
                  )}
                  <MovieCard movie={m} />
                </React.Fragment>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link href="/movies"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-semibold transition-colors">
                View all Odia movies <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ BOX OFFICE COLLECTION ══ */}
        {boxOfficeMovies.length > 0 && (
          <section aria-label="Odia movie box office collection">
            <SectionHeader
              title="Box Office Collection"
              subtitle="Latest Odia film box office figures & verdicts"
              href="/box-office"
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

              {/* ── Featured (first) movie — big card ── */}
              {(() => {
                const m = boxOfficeMovies[0] as any;
                if (!m) return null;
                const days      = m._days as any[];
                const totalNet  = m._totalNet  as number;
                const totalGross= m._totalGross as number;
                const maxNet    = Math.max(...days.map((d: any) => parseNum(d.net)), 1);

                const verdictColor: Record<string, string> = {
                  Blockbuster: "#22c55e", "Super Hit": "#4ade80", Hit: "#86efac",
                  Average: "#facc15", Flop: "#f87171", Disaster: "#ef4444",
                };
                const vc = verdictColor[m.verdict] || "#94a3b8";

                return (
                  <Link href={`/box-office/${m.slug || m._id}`}
                    className="lg:col-span-3 group relative rounded-2xl overflow-hidden bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 transition-all block">

                    {/* Poster banner */}
                    <div className="relative h-40 sm:h-52 w-full overflow-hidden">
                      {(m.thumbnailUrl || m.posterUrl) ? (
                        <Image
                          src={m.thumbnailUrl || m.posterUrl}
                          alt={`${m.title} box office collection`}
                          fill className="object-cover group-hover:scale-105 transition-transform duration-500 brightness-50"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-orange-900/30 to-[#111]" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                      {/* Verdict badge */}
                      <div className="absolute top-3 left-3">
                        <span className="text-xs font-black px-3 py-1.5 rounded-full"
                          style={{ background: `${vc}22`, color: vc, border: `1px solid ${vc}55` }}>
                          {m.verdict}
                        </span>
                      </div>

                      {/* Live indicator */}
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-gray-300 font-medium">Live</span>
                      </div>

                      {/* Title overlay */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="text-xs text-orange-400 font-semibold mb-1">
                          {m.releaseDate ? formatReleaseDate(m.releaseDate, m.releaseDatePrecision, "short") : ""}
                          {(m.genre || []).length > 0 && ` · ${(m.genre as string[]).slice(0,2).join(", ")}`}
                        </p>
                        <h2 className="font-display text-lg sm:text-xl lg:text-2xl font-bold text-white leading-snug group-hover:text-orange-300 transition-colors">
                          {m.title}
                        </h2>
                      </div>
                    </div>

                    {/* Collection stats row — calculated from boxOfficeDays */}
                    <div className="grid grid-cols-3 divide-x divide-[#1f1f1f] border-t border-[#1f1f1f]">
                      {[
                        { label: "Opening Day", val: days[0] ? fmtINR(parseNum(days[0].net)) : "TBA" },
                        { label: "Days Tracked", val: `${days.length} days` },
                        { label: "Total Net", val: fmtINR(totalNet) },
                      ].map(({ label, val }) => (
                        <div key={label} className="px-2 sm:px-4 py-2.5 sm:py-3 text-center">
                          <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
                          <p className="text-xs sm:text-sm font-bold text-white">{val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Day-wise collection — progress pill rows */}
                    {days.length > 0 && (
                      <div className="px-5 py-4 border-t border-[#1f1f1f]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Day-wise Net Collection</p>
                          <p className="text-[10px] text-gray-500">Total: <span className="text-orange-400 font-semibold">{fmtINR(totalNet)}</span></p>
                        </div>
                        <div className="space-y-2">
                          {days.slice(0, 5).map((d: any) => {
                            const net = parseNum(d.net);
                            const pct = maxNet > 0 ? Math.max(4, Math.round((net / maxNet) * 100)) : 4;
                            return (
                              <div key={d.day} className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-500 w-8 flex-shrink-0 font-medium">
                                  D{d.day}
                                </span>
                                <div className="flex-1 h-5 bg-[#1a1a1a] rounded-full overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-white font-semibold w-14 text-right flex-shrink-0">
                                  {fmtINR(net)}
                                </span>
                              </div>
                            );
                          })}
                          {days.length > 5 && (
                            <p className="text-[10px] text-gray-600 pt-0.5">+{days.length - 5} more days tracked</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="px-5 py-3 border-t border-[#1f1f1f] flex items-center justify-between">
                      <span className="text-xs text-gray-500">{days.length} days tracked · Gross: {fmtINR(totalGross)}</span>
                      <span className="text-xs text-orange-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Full box office data <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </Link>
                );
              })()}

              {/* ── Side list — remaining movies ── */}
              <div className="lg:col-span-2 flex flex-col gap-3">
                {boxOfficeMovies.slice(1).map((m: any) => {
                  const dayCount  = (m._days as any[]).length;
                  const totalNet  = m._totalNet  as number;
                  const verdictColor: Record<string, string> = {
                    Blockbuster: "#22c55e", "Super Hit": "#4ade80", Hit: "#86efac",
                    Average: "#facc15", Flop: "#f87171", Disaster: "#ef4444",
                  };
                  const vc = verdictColor[m.verdict] || "#94a3b8";

                  return (
                    <Link key={String(m._id)} href={`/box-office/${m.slug || m._id}`}
                      className="group flex gap-3 bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-3 transition-all items-center">

                      {/* Poster */}
                      <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
                        {(m.posterUrl || m.thumbnailUrl) ? (
                          <Image src={m.posterUrl || m.thumbnailUrl} alt={m.title} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clapperboard className="w-4 h-4 text-gray-600" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1 leading-snug">
                          {m.title}
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          {m.releaseDate ? formatReleaseDate(m.releaseDate, m.releaseDatePrecision, "short") : ""}
                        </p>
                        {/* Verdict + formatted total from boxOfficeDays */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: `${vc}18`, color: vc, border: `1px solid ${vc}40` }}>
                            {m.verdict}
                          </span>
                          {totalNet > 0 && (
                            <span className="text-xs text-orange-300 font-bold">{fmtINR(totalNet)}</span>
                          )}
                          <span className="text-[10px] text-gray-600">{dayCount}d</span>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                    </Link>
                  );
                })}

                {/* View all CTA */}
                <Link href="/box-office"
                  className="flex items-center justify-between rounded-xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 hover:border-orange-500/50 px-4 py-3 group transition-all mt-auto">
                  <div>
                    <p className="text-white font-bold text-sm">View All Box Office</p>
                    <p className="text-gray-500 text-xs mt-0.5">Day-wise collection tracker</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ CURRENTLY RUNNING ══ */}
        {(() => {
          const now30 = Date.now();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          const sevenDays  =  7 * 24 * 60 * 60 * 1000;
          const oneDay     = 24 * 60 * 60 * 1000;

          // Films released in the last 30 days that have box office data
          const running = (boxOfficeMovies as any[])
            .filter((m) => {
              if (!m.releaseDate) return false;
              const age = now30 - new Date(m.releaseDate).getTime();
              return age >= 0 && age <= thirtyDays;
            })
            .sort((a: any, b: any) => (b._totalNet as number) - (a._totalNet as number))
            .slice(0, 6);

          if (running.length === 0) return null;

          // This week's top collector — sum only day-entries whose calendar date is within last 7 days
          const withWeekNet = running.map((m: any) => {
            const relTs = new Date(m.releaseDate).getTime();
            const weekNet = ((m._days || []) as any[]).reduce((s: number, d: any) => {
              const dayTs = relTs + (d.day - 1) * oneDay;
              return now30 - dayTs <= sevenDays ? s + parseNum(d.net) : s;
            }, 0);
            return { ...m, _weekNet: weekNet };
          });
          const weekTop = [...withWeekNet]
            .filter((m: any) => m._weekNet > 0)
            .sort((a: any, b: any) => b._weekNet - a._weekNet)[0] || running[0];

          const verdictColorMap: Record<string, string> = {
            Blockbuster: "#22c55e", "Super Hit": "#4ade80", Hit: "#86efac",
            Average: "#facc15", Flop: "#f87171", Disaster: "#ef4444",
          };

          return (
            <section aria-label="Currently running Odia movies at box office">
              <SectionHeader
                title="Currently Running"
                subtitle="Odia films live at the box office right now"
                href="/box-office"
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── This Week's Top Performer — big card ── */}
                {weekTop && (
                  <Link
                    href={`/box-office/${weekTop.slug || weekTop._id}`}
                    className="group lg:col-span-1 relative overflow-hidden rounded-2xl border border-orange-500/20
                      bg-gradient-to-br from-orange-500/10 via-[#111] to-[#0f0f0f]
                      hover:border-orange-500/50 transition-all p-4 flex flex-col justify-between min-h-[200px]"
                  >
                    {/* bg poster faint */}
                    {(weekTop.posterUrl || weekTop.thumbnailUrl) && (
                      <div className="absolute inset-0 opacity-10">
                        <Image
                          src={weekTop.posterUrl || weekTop.thumbnailUrl}
                          alt={weekTop.title}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b0b]/80 to-[#0b0b0b]" />
                      </div>
                    )}

                    <div className="relative z-10">
                      {/* Badge */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
                          text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                          🔥 This Week&apos;s Top
                        </span>
                      </div>

                      <div className="flex gap-3">
                        {(weekTop.posterUrl || weekTop.thumbnailUrl) && (
                          <div className="relative w-16 h-[88px] flex-shrink-0 rounded-xl overflow-hidden shadow-lg">
                            <Image
                              src={weekTop.posterUrl || weekTop.thumbnailUrl}
                              alt={weekTop.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="font-black text-base text-white group-hover:text-orange-400
                            transition-colors leading-tight line-clamp-2 mb-1">
                            {weekTop.title}
                          </h3>
                          <p className="text-[11px] text-gray-500 mb-3">
                            {weekTop.releaseDate
                              ? formatReleaseDate(weekTop.releaseDate, weekTop.releaseDatePrecision, "short")
                              : ""}
                          </p>
                          <p className="text-2xl font-black text-orange-400 leading-none">
                            {fmtINR(weekTop._weekNet || weekTop._totalNet)}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5">
                            {weekTop._weekNet > 0 ? "This week's net" : "Total net"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                      <div>
                        {weekTop.verdict && !["Released","Upcoming"].includes(weekTop.verdict) && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${verdictColorMap[weekTop.verdict] || "#94a3b8"}18`,
                              color:       verdictColorMap[weekTop.verdict] || "#94a3b8",
                              border:      `1px solid ${verdictColorMap[weekTop.verdict] || "#94a3b8"}40`,
                            }}>
                            {weekTop.verdict}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-orange-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                        Full data <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>

                    {/* Watermark */}
                    <div className="absolute bottom-4 right-5 text-orange-500/10 text-6xl font-black
                      pointer-events-none select-none group-hover:text-orange-500/20 transition-colors">
                      #1
                    </div>
                  </Link>
                )}

                {/* ── Other running films — compact list ── */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {running
                    .filter((m: any) => String(m._id) !== String(weekTop?._id))
                    .slice(0, 4)
                    .map((m: any) => {
                      const vc = verdictColorMap[m.verdict] || "#94a3b8";
                      const days = m._days?.length || 0;
                      return (
                        <Link
                          key={String(m._id)}
                          href={`/box-office/${m.slug || m._id}`}
                          className="group flex items-center gap-3 bg-[#111] border border-[#1f1f1f]
                            hover:border-orange-500/30 rounded-xl p-3 transition-all"
                        >
                          {/* Poster */}
                          <div className="relative w-11 h-[60px] rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
                            {(m.posterUrl || m.thumbnailUrl) ? (
                              <Image src={m.posterUrl || m.thumbnailUrl} alt={m.title} fill className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Clapperboard className="w-4 h-4 text-gray-600" />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white group-hover:text-orange-300
                              transition-colors line-clamp-1 leading-snug">
                              {m.title}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-0.5">
                              {m.releaseDate
                                ? formatReleaseDate(m.releaseDate, m.releaseDatePrecision, "short")
                                : ""}
                              {days > 0 ? ` · ${days}d` : ""}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-bold text-orange-400">
                                {fmtINR(m._totalNet)}
                              </span>
                              {m.verdict && !["Released","Upcoming"].includes(m.verdict) && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: `${vc}18`, color: vc, border: `1px solid ${vc}40` }}>
                                  {m.verdict}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-orange-400
                            flex-shrink-0 transition-colors" />
                        </Link>
                      );
                    })}

                  {/* View all CTA */}
                  <Link
                    href="/box-office"
                    className="sm:col-span-2 flex items-center justify-between rounded-xl
                      bg-gradient-to-br from-orange-500/8 to-transparent border border-orange-500/20
                      hover:border-orange-500/50 px-4 py-3 group transition-all"
                  >
                    <div>
                      <p className="text-white font-bold text-sm">See Full Box Office Report</p>
                      <p className="text-gray-500 text-xs mt-0.5">Day-wise net &amp; gross for all films</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </div>
            </section>
          );
        })()}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ BLOG CATEGORIES ══ */}
        <section aria-label="Browse blog by category">
          <SectionHeader
            title="Browse by Category"
            subtitle="Find articles that interest you"
            href="/blog"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            {BLOG_CATEGORIES.map((cat) => (
              <Link key={cat.label} href={cat.href}
                className="group flex items-center gap-2 sm:gap-3 bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 hover:bg-orange-500/5 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 transition-all">
                <span className="text-lg sm:text-xl">{cat.emoji}</span>
                <span className="text-xs sm:text-sm font-semibold text-gray-300 group-hover:text-orange-300 transition-colors leading-tight">
                  {cat.label}
                </span>
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ THIS MONTH IN OLLYWOOD ══ */}
        {thisMonthAll.length > 0 && (() => {
          const monthName = _now.toLocaleDateString("en-IN", { month: "long" });
          const year      = _now.getFullYear();
          return (
            <section aria-label={`Odia movies releasing in ${monthName} ${year}`}>
              <SectionHeader
                title={`This Month in Ollywood`}
                subtitle={`${monthName} ${year} releases — what's out and what's coming`}
                href="/movies"
              />

              {/* Timeline */}
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[18px] sm:left-[22px] top-0 bottom-0 w-px bg-gradient-to-b from-orange-500/40 via-orange-500/20 to-transparent" />

                <div className="space-y-3">
                  {thisMonthAll.map((m: any, i: number) => {
                    const rdStr = m.isReRelease && m.reReleaseDate ? m.reReleaseDate : m.releaseDate;
                    const isRe = m.isReRelease && m.reReleaseDate;
                    const released  = rdStr ? new Date(rdStr) <= _now : false;
                    const isToday   = rdStr ? new Date(rdStr).toDateString() === _now.toDateString() : false;
                    const dateLabel = rdStr
                      ? (isRe ? "Re-Release: " : "") + formatReleaseDate(rdStr, isRe ? m.reReleaseDatePrecision : m.releaseDatePrecision, "short")
                      : "TBA";
                    const hasVerdict = m.verdict && !["Upcoming","Released",""].includes(m.verdict);

                    const verdictColorMap: Record<string,string> = {
                      Blockbuster:"#22c55e","Super Hit":"#4ade80",Hit:"#86efac",
                      Average:"#facc15",Flop:"#f87171",Disaster:"#ef4444",
                    };
                    const vc = verdictColorMap[m.verdict] || "#94a3b8";

                    return (
                      <Link
                        key={String(m._id)}
                        href={`/movie/${m.slug || m._id}`}
                        className="group relative flex items-center gap-3 sm:gap-4 pl-10 sm:pl-14"
                      >
                        {/* Timeline dot */}
                        <div className={`absolute left-[12px] sm:left-[16px] w-[13px] h-[13px] rounded-full border-2 flex-shrink-0 transition-all
                          ${isToday
                            ? "bg-orange-500 border-orange-400 shadow-[0_0_8px_#f97316]"
                            : released
                              ? "bg-orange-500/70 border-orange-500/50"
                              : "bg-[#1a1a1a] border-[#333] group-hover:border-orange-500/50"
                          }`}
                        />

                        {/* Card */}
                        <div className={`flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all
                          ${released
                            ? "bg-[#111] border-[#1f1f1f] hover:border-orange-500/30"
                            : "bg-[#0d0d0d] border-[#181818] border-dashed hover:border-orange-500/20"
                          }`}
                        >
                          {/* Poster */}
                          {(m.posterUrl || m.thumbnailUrl) && (
                            <div className="relative w-8 h-11 rounded-md overflow-hidden flex-shrink-0">
                              <Image src={m.posterUrl || m.thumbnailUrl} alt={m.title} fill className="object-cover" />
                            </div>
                          )}

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold leading-snug line-clamp-1 transition-colors
                              ${released ? "text-white group-hover:text-orange-400" : "text-gray-400 group-hover:text-gray-200"}`}>
                              {m.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-[10px] font-medium ${released ? "text-orange-400" : "text-gray-600"}`}>
                                {dateLabel}
                              </span>
                              {isToday && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-1.5 py-0.5 animate-pulse">
                                  Today!
                                </span>
                              )}
                              {!released && (
                                <span className="text-[9px] text-gray-600 uppercase tracking-widest">Upcoming</span>
                              )}
                              {hasVerdict && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background:`${vc}18`, color:vc, border:`1px solid ${vc}40` }}>
                                  {m.verdict}
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-gray-700 group-hover:text-orange-400 flex-shrink-0 transition-colors" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ UPCOMING MOVIES ══ */}
        {upcomingMovies.length > 0 && (
          <section aria-label="Upcoming Odia movies">
            <SectionHeader
              title="Upcoming Movies"
              subtitle="Odia films releasing soon — mark your calendar"
              href="/movies?verdict=Upcoming"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {upcomingMovies.map((m: any) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ BLOG — LATEST ARTICLES GRID ══ */}
        {latestBlogs.length > 0 && (
          <section aria-label="Latest Odia cinema blog posts">
            <SectionHeader
              title="Latest from the Blog"
              subtitle="In-depth reviews, cast spotlights and Ollywood stories"
              href="/blog"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {latestBlogs.map((b: any) => (
                <BlogCard key={String(b._id)} blog={b} />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/blog"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-3 rounded-xl transition-colors text-sm">
                <BookOpen className="w-4 h-4" /> Read All Blog Articles
              </Link>
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ BLOCKBUSTER / TOP MOVIES (SEO + AdSense filler) ══ */}
        {topMovies.length > 0 && (
          <section aria-label="Blockbuster and superhit Odia movies">
            <SectionHeader
              title="Blockbuster Hits"
              subtitle="Top-performing Odia films of recent years"
              href="/movies"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {topMovies.map((m: any, i: number) => (
                <Link key={String(m._id)} href={`/movie/${m.slug || m._id}`}
                  className="group relative bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 rounded-xl overflow-hidden transition-all">
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-orange-500 text-black text-xs font-black rounded-full flex items-center justify-center">
                    {i + 1}
                  </div>
                  {(m.posterUrl || m.thumbnailUrl) ? (
                    <div className="relative h-40 sm:h-52 w-full">
                      <Image src={m.posterUrl || m.thumbnailUrl} alt={m.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-40 sm:h-52 bg-orange-500/5 flex items-center justify-center">
                      <Clapperboard className="w-10 h-10 text-orange-500/20" />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-bold text-white group-hover:text-orange-300 transition-colors line-clamp-1">{m.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{m.releaseDate ? new Date(m.releaseDate).getFullYear() : ""}</span>
                      <span className="text-xs font-bold text-green-400">{m.verdict}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <DisplayAd slot="8191172163" format="horizontal" />
        </div>

        {/* ══ SEO RICH CONTENT — About Ollywood ══ */}
        <section
          aria-label="About Odia cinema Ollywood"
          className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 sm:p-8 md:p-12"
        >
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-orange-500" />
              <span className="text-orange-500 text-sm font-semibold uppercase tracking-widest">About Ollywood</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4 sm:mb-6 leading-tight">
              Celebrating the Rich Heritage of Odia Cinema
            </h2>
            <div className="prose-odia space-y-4">
              <p>
                Odia cinema, fondly known as <strong>Ollywood</strong>, is one of India's oldest and most culturally
                rich regional film industries. With roots tracing back to 1936 when the first Odia film{" "}
                <em>Sita Bibaha</em> was released, Odia cinema has evolved over nine decades into a vibrant
                industry that captivates millions of viewers across Odisha and beyond.
              </p>
              <p>
                The Odia film industry is headquartered in <strong>Bhubaneswar</strong>, the capital of Odisha,
                producing over 40–60 films annually. Stars like <strong>Babushaan Mohanty</strong>,{" "}
                <strong>Elina Samantray</strong>, <strong>Sabyasachi Mishra</strong>, and{" "}
                <strong>Barsha Priyadarshini</strong> have become household names drawing massive box office numbers.
              </p>
              <p>
                What makes Odia cinema unique is its deep connection to Odisha's cultural and spiritual identity —
                from devotional films set at the <strong>Jagannath Temple</strong> in Puri to contemporary thrillers
                in Bhubaneswar's streets. <strong>Ollypedia</strong> is your complete destination for Odia movie
                reviews, cast details, box office collections, songs, trailers and in-depth blog articles.
              </p>
            </div>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-3">
              <Link href="/movies" className="btn-primary">Browse Movies</Link>
              <Link href="/blog" className="btn-outline">Read Our Blog</Link>
              <Link href="/cast" className="btn-outline">Cast Profiles</Link>
            </div>
          </div>
        </section>

        {/* ══ WHY OLLYPEDIA — Features Grid ══ */}
        <section aria-label="What you can find on Ollypedia">
          <div className="text-center mb-6 sm:mb-10">
            <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-white">
              Everything About <span className="text-orange-500">Odia Cinema</span> in One Place
            </h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
              Ollypedia is the most complete Odia film database covering movies, music, cast and box office.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {[
              {
                icon: TrendingUp, color: "orange",
                title: "Box Office Tracking",
                desc: "Accurate opening day, first week and total collection data for every Odia film. Day-wise box office numbers updated regularly.",
                href: "/movies",
              },
              {
                icon: Star, color: "yellow",
                title: "Cast & Crew Profiles",
                desc: "Detailed biographies of Odia actors, directors, producers and film professionals with their complete filmography.",
                href: "/cast",
              },
              {
                icon: Music, color: "green",
                title: "Songs & Music",
                desc: "Every song from every Odia film — with YouTube videos, lyrics, singer and music director credits.",
                href: "/songs",
              },
              {
                icon: BookOpen, color: "blue",
                title: "In-Depth Blog Articles",
                desc: "Expert reviews, cast spotlights, top 10 lists, behind-the-scenes stories and opinion pieces about Ollywood.",
                href: "/blog",
              },
              {
                icon: Mic2, color: "purple",
                title: "Odia Film Reviews",
                desc: "Read and write honest public reviews for any Odia movie. Rating system helps you decide what to watch next.",
                href: "/movies",
              },
              {
                icon: Trophy, color: "orange",
                title: "Verdicts & Ratings",
                desc: "Blockbuster, Super Hit, Hit, Average, Flop — clear verdicts for every released Odia film based on box office performance.",
                href: "/movies",
              },
            ].map(({ icon: Icon, title, desc, href }) => (
              <Link key={title} href={href}
                className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-4 sm:p-6 transition-all hover:-translate-y-0.5">
                <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-colors">
                  <Icon className="w-5 h-5 text-orange-500" />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
                <div className="flex items-center gap-1 mt-4 text-orange-400 text-xs font-semibold group-hover:gap-2 transition-all">
                  Explore <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ══ FAQ — AdSense / SEO section ══ */}
        <section aria-label="Frequently asked questions about Odia cinema" className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 sm:p-8 md:p-10">
          <div className="flex items-center gap-2 mb-5 sm:mb-8">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-lg sm:text-2xl font-bold text-white">
              Frequently Asked Questions — Odia Cinema
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              {
                q: "What is Ollywood?",
                a: "Ollywood is the popular name for the Odia language film industry based in Bhubaneswar, Odisha. It is one of India's oldest regional film industries, producing 40–60 Odia films every year.",
              },
              {
                q: "Who are the top actors in Odia cinema?",
                a: "Popular Odia actors include Babushaan Mohanty, Sabyasachi Mishra, Anubhav Mohanty, Elina Samantray, Barsha Priyadarshini and Jhilik Bhattacharjee, among many others.",
              },
              {
                q: "Where can I read Odia movie reviews?",
                a: "Ollypedia publishes in-depth Odia movie reviews, audience ratings, box office analysis and cast spotlights. Visit our Blog section for the latest articles.",
              },
              {
                q: "What is the box office collection of recent Odia films?",
                a: "Ollypedia tracks day-wise net and gross box office collection for all major Odia films. Visit the Box Office section for updated figures.",
              },
              {
                q: "How can I find songs from an Odia movie?",
                a: "Every Odia film's song list with YouTube videos, lyrics, singers, lyricists and music directors is available on Ollypedia's Songs section.",
              },
              {
                q: "What does 'Blockbuster', 'Hit' and 'Flop' mean for Odia films?",
                a: "These verdicts are based on a film's box office performance relative to its budget and screen count. Ollypedia displays the final verdict for each released Odia film on its movie page.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#1f1f1f] pb-5 last:border-0">
                <h3 className="font-bold text-white text-sm mb-2 flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5 flex-shrink-0">Q.</span>
                  {q}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed pl-5">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ══ EXPLORE CTA BANNER ══ */}
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-900/40 via-[#111] to-[#111] border border-orange-500/20 p-6 sm:p-10 md:p-14 text-center">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #f97316 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-white mb-2 sm:mb-3">
              Your Gateway to <span className="text-orange-400">Ollywood</span>
            </h2>
            <p className="text-gray-300 text-sm sm:text-base max-w-xl mx-auto mb-5 sm:mb-8">
              Explore the complete world of Odia cinema — from classic films to today's blockbusters,
              from song lyrics to box office collections.
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              <Link href="/movies" className="btn-primary inline-flex items-center gap-2">
                <Film className="w-4 h-4" /> Browse Movies
              </Link>
              <Link href="/blog" className="btn-outline inline-flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Read Blog
              </Link>
              <Link href="/cast" className="btn-outline inline-flex items-center gap-2">
                <Users className="w-4 h-4" /> Cast Profiles
              </Link>
              <Link href="/songs" className="btn-outline inline-flex items-center gap-2">
                <Music className="w-4 h-4" /> Odia Songs
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}