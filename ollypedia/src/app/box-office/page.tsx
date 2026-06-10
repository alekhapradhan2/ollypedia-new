// app/box-office/page.tsx
// Box Office listing — sorted by release date (newest first)

import type { Metadata } from "next";
import Link              from "next/link";
import { connectDB }     from "@/lib/db";
import Movie             from "@/models/Movie";
import Blog              from "@/models/Blog";

export const revalidate = 600; // revalidate every 10 min — box office data changes daily

export const metadata: Metadata = {
  title:       "Odia Box Office Collection 2026 | Ollypedia",
  description: "Complete Odia (Ollywood) box office collection report 2026. Day-wise net and gross earnings for all latest Odia movies — updated daily on Ollypedia.",
  alternates:  { canonical: "https://ollypedia.in/box-office" },
  robots:      { index: true, follow: true },
  keywords:    [
    "Odia box office", "Ollywood collection", "Odia movie collection 2026",
    "Odia cinema box office", "Ollywood box office 2026", "Odia film earnings",
    "Ollywood hit flop verdict", "Odia movie first day collection",
    "Ollywood movie verdict 2026", "Odia film box office report",
    "Ollywood hit or flop", "Odia movie total collection",
    "today Odia box office", "Odia movie this week collection",
    "Ollywood 2026 hit flop list", "Odia cinema earnings report",
  ],
  openGraph: {
    title:       "Odia Box Office Collection 2026 | Ollypedia",
    description: "Track day-wise Odia cinema box office collection. Net and gross earnings updated daily.",
    url:         "https://ollypedia.in/box-office",
    siteName:    "Ollypedia",
    type:        "website",
    locale:      "en_IN",
    images: [{ url: "https://ollypedia.in/og-box-office.jpg", width: 1200, height: 630, alt: "Odia Box Office Collection 2026 — Ollypedia" }],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Odia Box Office Collection 2026 | Ollypedia",
    description: "Day-wise net & gross earnings for all Odia (Ollywood) movies. Updated daily.",
    images:      ["https://ollypedia.in/og-box-office.jpg"],
    site:        "@ollypedia",
  },
};

/* ─── Helpers ─────────────────────────────────────────────── */

/**
 * parseNum — converts any currency string to raw rupees (integer).
 *   "₹7.00 L"  → 700000
 *   "7L"       → 700000
 *   "0.1 Cr"   → 1000000
 *   "3.36Cr"   → 33600000
 *   "700000"   → 700000   (bare integer ≥ 1000 trusted as rupees)
 *   "7"        → 0        (bare tiny number with no unit = corrupted)
 */
function parseNum(s: unknown): number {
  if (s === null || s === undefined || s === "") return 0;
  const str = String(s).replace(/[₹,\s]/g, "").toLowerCase();
  const n = parseFloat(str);
  if (isNaN(n)) return 0;
  if (str.includes("cr") || str.includes("crore")) return Math.round(n * 1_00_00_000);
  if (str.includes("l") || str.includes("lakh"))   return Math.round(n * 1_00_000);
  if (n >= 1000) return Math.round(n);
  return 0;
}

function fmtINR(n: number): string {
  if (!n) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Timezone-safe ISO date parser — avoids UTC midnight shift in IST
function fmtDate(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "—";
  const s = String(dateStr).trim();
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${parseInt(iso[3], 10)} ${MONTHS[parseInt(iso[2], 10) - 1]} ${iso[1]}`;
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Get numeric timestamp from ISO date string (no timezone issues)
function dateTs(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const iso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`).getTime();
  return new Date(dateStr).getTime() || 0;
}

function verdictColor(verdict: string): string {
  const v = verdict.toLowerCase();
  if (v.includes("blockbuster") || v.includes("superhit"))
    return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
  if (v.includes("hit"))      return "text-green-400 border-green-500/30 bg-green-500/10";
  if (v.includes("average"))  return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
  if (v.includes("disaster")) return "text-rose-500 border-rose-500/30 bg-rose-500/10";
  if (v.includes("flop"))     return "text-red-400 border-red-500/30 bg-red-500/10";
  return "text-gray-400 border-white/10 bg-white/5";
}

function movieSlug(m: any): string {
  return m.slug || String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function isValidVerdict(v: string | undefined): boolean {
  if (!v) return false;
  return !["upcoming", "released", ""].includes(v.toLowerCase().trim());
}

/* ─── Data ─────────────────────────────────────────────────── */

async function getBoxOfficeMovies() {
  await connectDB();
  const movies = await (Movie as any)
    .find(
      { "boxOfficeDays.0": { $exists: true } },
      "title slug posterUrl thumbnailUrl releaseDate language verdict boxOfficeDays updatedAt"
    )
    .sort({ releaseDate: -1 })
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

async function getBoxOfficeBlogs() {
  await connectDB();
  const blogs = await (Blog as any)
    .find(
      { published: true, category: "Box Office" },
      "title slug excerpt coverImage createdAt featured"
    )
    .sort({ createdAt: -1 })
    .limit(12)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

/* ─── Page ──────────────────────────────────────────────────── */

export default async function BoxOfficePage() {
  const [movies, blogs] = await Promise.all([getBoxOfficeMovies(), getBoxOfficeBlogs()]);

  const enriched = movies.map((m: any) => {
    const days       = (m.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
    const totalNet   = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
    const totalGross = days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
    const lastDay    = days[days.length - 1]?.day || 0;
    return { ...m, days, totalNet, totalGross, lastDay };
  }); // already sorted by releaseDate DESC

  /* ── Derived highlights ── */
  const now      = Date.now();
  const oneWeek  = 7 * 24 * 60 * 60 * 1000;
  const oneDay   = 24 * 60 * 60 * 1000;

  // This week's top performer — sum only the day-entries whose calendar date falls in last 7 days
  // Each boxOfficeDay.day = 1-indexed day since release, so its date = releaseDate + (day - 1) days
  const withWeekNet = enriched.map((m: any) => {
    const relTs = dateTs(m.releaseDate);
    const weekNet = (m.days || []).reduce((s: number, d: any) => {
      const dayTs = relTs + (d.day - 1) * oneDay; // calendar date of that collection day
      return now - dayTs <= oneWeek ? s + parseNum(d.net) : s;
    }, 0);
    return { ...m, weekNet };
  });
  const weekTop = [...withWeekNet]
    .filter((m: any) => m.weekNet > 0)
    .sort((a: any, b: any) => b.weekNet - a.weekNet)[0] || null;

  // Currently running — released in last 30 days, sorted by net
  const running  = enriched
    .filter((m: any) => now - dateTs(m.releaseDate) <= 30 * 24 * 60 * 60 * 1000)
    .sort((a: any, b: any) => b.totalNet - a.totalNet)
    .slice(0, 4);

  // All-time #1 by net
  const allTimeTop = [...enriched].sort((a: any, b: any) => b.totalNet - a.totalNet)[0] || null;

  // Total net across all films
  const totalNetAll   = enriched.reduce((s: number, m: any) => s + m.totalNet, 0);
  const totalGrossAll = enriched.reduce((s: number, m: any) => s + m.totalGross, 0);
  const hitsCount     = enriched.filter((m: any) =>
    m.verdict && ["hit","superhit","blockbuster"].some((k: string) => m.verdict.toLowerCase().includes(k))
  ).length;

  const lastUpdated = enriched[0]?.updatedAt
    ? new Date(enriched[0].updatedAt).toISOString()
    : new Date().toISOString();

  // Recently updated — updatedAt within last 48h, max 4
  const twoDays = 2 * 24 * 60 * 60 * 1000;
  const recentlyUpdated = enriched
    .filter((m: any) => m.updatedAt && now - new Date(m.updatedAt).getTime() <= twoDays)
    .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // Month-grouped movie list
  const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  type MovieGroup = { label: string; items: any[] };
  const monthGroups: MovieGroup[] = [];
  enriched.forEach((m: any) => {
    const iso = String(m.releaseDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const label = iso ? `${MONTHS_FULL[parseInt(iso[2], 10) - 1]} ${iso[1]}` : "Unknown";
    const last = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) { last.items.push(m); }
    else { monthGroups.push({ label, items: [m] }); }
  });

  // Unique languages for filter links
  const languages = [...new Set(enriched.map((m: any) => m.language).filter(Boolean))] as string[];

  // ── Schema: BreadcrumbList ──
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",       "item": "https://ollypedia.in" },
      { "@type": "ListItem", "position": 2, "name": "Box Office", "item": "https://ollypedia.in/box-office" },
    ],
  };

  // ── Schema: WebSite with SearchAction (Google Sitelinks Search Box) ──
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type":    "WebSite",
    "name":     "Ollypedia",
    "url":      "https://ollypedia.in",
    "potentialAction": {
      "@type":       "SearchAction",
      "target":      { "@type": "EntryPoint", "urlTemplate": "https://ollypedia.in/search?q={search_term_string}" },
      "query-input": "required name=search_term_string",
    },
  };
  const movieListJsonLd = {
    "@context": "https://schema.org",
    "@type":    "CollectionPage",
    "name":     "Odia Box Office Collection 2026 | Ollypedia",
    "description": "Complete day-wise box office collection for Odia (Ollywood) movies. Updated daily.",
    "url":      "https://ollypedia.in/box-office",
    "dateModified": lastUpdated,
    "publisher": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
    "mainEntity": {
      "@type": "ItemList",
      "name":  "Odia Movies Box Office 2026",
      "numberOfItems": enriched.length,
      "itemListElement": enriched.slice(0, 20).map((m: any, i: number) => ({
        "@type":    "ListItem",
        "position": i + 1,
        "name":     m.title,
        "url":      `https://ollypedia.in/box-office/${movieSlug(m)}`,
      })),
    },
  };

  // ── Schema: FAQPage ──
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type":    "FAQPage",
    "mainEntity": [
      {
        "@type":          "Question",
        "name":           "Where can I find the latest Odia movie box office collection?",
        "acceptedAnswer": { "@type": "Answer", "text": "Ollypedia publishes daily box office updates for all Odia movies. Bookmark this page and check back every day for fresh figures." },
      },
      {
        "@type":          "Question",
        "name":           "What is the difference between net and gross collection?",
        "acceptedAnswer": { "@type": "Answer", "text": "Gross is total revenue including taxes. Net is what remains after deducting GST and local entertainment tax — the actual revenue for producers and distributors." },
      },
      {
        "@type":          "Question",
        "name":           "How is an Odia movie verdict decided?",
        "acceptedAnswer": { "@type": "Answer", "text": "A verdict is based on earnings vs total cost (production + prints + publicity). A film recovering more than twice its cost is called a Blockbuster; failing to recover costs is a Flop." },
      },
      {
        "@type":          "Question",
        "name":           "Does Ollypedia track worldwide collection of Odia movies?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes, where data is available we include worldwide figures covering Odisha, rest of India, and international markets." },
      },
      {
        "@type":          "Question",
        "name":           "Which Odia movie has the highest box office collection ever?",
        "acceptedAnswer": { "@type": "Answer", "text": `${allTimeTop ? `${allTimeTop.title} holds the record for the highest net collection among all Odia films tracked on Ollypedia with a total of ${fmtINR(allTimeTop.totalNet)}.` : "Ollypedia tracks all Odia films and the all-time highest grosser is updated regularly on this page."}` },
      },
      {
        "@type":          "Question",
        "name":           "How many Odia movies released in 2026?",
        "acceptedAnswer": { "@type": "Answer", "text": `As of the latest update, Ollypedia is tracking ${enriched.length} Odia films with box office data in 2026. New releases are added regularly.` },
      },
      {
        "@type":          "Question",
        "name":           "What does 'Day 1 collection' mean for Odia movies?",
        "acceptedAnswer": { "@type": "Answer", "text": "Day 1 collection refers to the box office earnings of an Odia film on its first day of release, including morning, afternoon, and evening shows across all theatres in Odisha and other regions." },
      },
      {
        "@type":          "Question",
        "name":           "Is Ollypedia free to use?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes, Ollypedia is completely free. All box office data, verdicts, and news about Odia cinema are available to everyone without any subscription or login." },
      },
    ],
  };

  // ── Schema: Blog articles ──
  const blogListJsonLd = blogs.length > 0 ? {
    "@context": "https://schema.org",
    "@type":    "ItemList",
    "name":     "Odia Box Office News & Analysis",
    "itemListElement": blogs.map((b: any, i: number) => ({
      "@type":    "ListItem",
      "position": i + 1,
      "url":      `https://ollypedia.in/blog/${b.slug}`,
      "name":     b.title,
    })),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(movieListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {blogListJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogListJsonLd) }} />
      )}

      <div className="min-h-screen bg-[#080808] text-white">

        {/* ── Header ── */}
        <div className="border-b border-[#1c1c1c] bg-[#0b0b0b]">
          <div className="w-full max-w-screen-lg mx-auto px-3 sm:px-5 py-5 sm:py-8">
            <nav className="flex items-center gap-1.5 text-xs text-gray-600 mb-3">
              <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-gray-400">Box Office</span>
            </nav>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest
                uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20
                rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                Live Tracking
              </span>
              <span className="text-xs text-gray-600">{enriched.length} films</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              Odia Box Office <span className="text-orange-400">Collection 2026</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1.5">
              Day-wise net &amp; gross for all Odia (Ollywood) movies — latest releases first.
            </p>
            <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Updated on{" "}
              <time dateTime={lastUpdated} className="text-gray-400 font-medium">
                {fmtDate(lastUpdated)}
              </time>
            </p>
          </div>
        </div>

        <div className="w-full max-w-screen-lg mx-auto px-3 sm:px-5 py-4 sm:py-6 space-y-5">

          {/* ── Stats Bar ── */}
          {enriched.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total 2026 Net", value: fmtINR(totalNetAll),   accent: "text-orange-400" },
                { label: "Total 2026 Gross", value: fmtINR(totalGrossAll), accent: "text-sky-300" },
                { label: "Films Tracked",  value: String(enriched.length), accent: "text-white" },
                { label: "Hits / Superhits", value: String(hitsCount),   accent: "text-emerald-400" },
              ].map(({ label, value, accent }) => (
                <div key={label} className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl px-4 py-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                  <p className={`text-lg sm:text-xl font-black ${accent}`}>{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Data Disclaimer ── */}
          <div className="flex gap-3 p-4 bg-amber-500/8 border border-amber-500/25 rounded-xl">
            <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="text-xs font-bold text-amber-400 mb-1">Please Note</p>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                The Box Office Data are compiled from various sources and by our own research.
                These data can be approximate or may have a huge difference from producer figures.{" "}
                <strong className="text-amber-300">Ollypedia</strong> does not make any claims about the
                authenticity of the data. This is box office collection data reported as new data arrives.
              </p>
            </div>
          </div>

          {/* ── 2026 Verdict Breakdown ── */}
          {enriched.length > 0 && (() => {
            const verdictGroups: Record<string, number> = {
              Blockbuster: 0, Superhit: 0, Hit: 0, Average: 0, Flop: 0, Disaster: 0,
            };
            enriched.forEach((m: any) => {
              if (!m.verdict) return;
              const v = m.verdict.toLowerCase();
              if (v.includes("blockbuster"))   verdictGroups["Blockbuster"]++;
              else if (v.includes("superhit")) verdictGroups["Superhit"]++;
              else if (v.includes("hit"))      verdictGroups["Hit"]++;
              else if (v.includes("average"))  verdictGroups["Average"]++;
              else if (v.includes("disaster")) verdictGroups["Disaster"]++;
              else if (v.includes("flop"))     verdictGroups["Flop"]++;
            });
            const colorMap: Record<string, string> = {
              Blockbuster: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
              Superhit:    "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
              Hit:         "text-green-400 bg-green-500/10 border-green-500/20",
              Average:     "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
              Flop:        "text-red-400 bg-red-500/10 border-red-500/20",
              Disaster:    "text-rose-500 bg-rose-500/10 border-rose-500/20",
            };
            const entries = Object.entries(verdictGroups).filter(([, n]) => n > 0);
            if (!entries.length) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    🏆 2026 Verdict Scorecard
                  </span>
                  <span className="text-[10px] text-gray-600">— how Ollywood performed this year</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {entries.map(([label, count]) => (
                    <div key={label}
                      className={`border rounded-xl px-3 py-2.5 text-center ${colorMap[label]}`}>
                      <p className="text-lg font-black leading-none">{count}</p>
                      <p className="text-[10px] font-semibold mt-1 opacity-80">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Highlight Cards Row ── */}
          {enriched.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* This Week's Top Performer */}
              {weekTop ? (
                <Link
                  href={`/box-office/${movieSlug(weekTop)}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-[#111] to-[#0f0f0f]
                    border border-orange-500/20 rounded-2xl p-4 hover:border-orange-500/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {(weekTop.posterUrl || weekTop.thumbnailUrl) && (
                      <img
                        src={weekTop.posterUrl || weekTop.thumbnailUrl}
                        alt={weekTop.title}
                        className="w-14 h-[78px] object-cover rounded-lg flex-shrink-0 shadow-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                          🔥 This Week's Top
                        </span>
                      </div>
                      <p className="font-black text-sm text-white group-hover:text-orange-400
                        transition-colors leading-tight truncate mb-1">
                        {weekTop.title}
                      </p>
                      <p className="text-[10px] text-gray-500 mb-2">{fmtDate(weekTop.releaseDate)}</p>
                      <p className="text-xl font-black text-orange-400">{fmtINR(weekTop.weekNet)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">This Week's Net</p>
                      {weekTop.totalNet > weekTop.weekNet && (
                        <p className="text-[10px] text-gray-700 mt-1">
                          Total: {fmtINR(weekTop.totalNet)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4 text-orange-500/20 text-5xl font-black
                    pointer-events-none select-none group-hover:text-orange-500/30 transition-colors">
                    #1
                  </div>
                </Link>
              ) : (
                /* Fallback: show most recent release */
                enriched[0] && (
                  <Link
                    href={`/box-office/${movieSlug(enriched[0])}`}
                    className="group relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-[#111] to-[#0f0f0f]
                      border border-orange-500/20 rounded-2xl p-4 hover:border-orange-500/40 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      {(enriched[0].posterUrl || enriched[0].thumbnailUrl) && (
                        <img
                          src={enriched[0].posterUrl || enriched[0].thumbnailUrl}
                          alt={enriched[0].title}
                          className="w-14 h-[78px] object-cover rounded-lg flex-shrink-0 shadow-lg"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-400 block mb-1.5">
                          🎬 Latest Release
                        </span>
                        <p className="font-black text-sm text-white group-hover:text-orange-400
                          transition-colors leading-tight truncate mb-1">
                          {enriched[0].title}
                        </p>
                        <p className="text-[10px] text-gray-500 mb-2">{fmtDate(enriched[0].releaseDate)}</p>
                        <p className="text-xl font-black text-orange-400">{fmtINR(enriched[0].totalNet)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Net Collection</p>
                      </div>
                    </div>
                  </Link>
                )
              )}

              {/* All-Time #1 */}
              {allTimeTop && (
                <Link
                  href={`/box-office/${movieSlug(allTimeTop)}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-[#111] to-[#0f0f0f]
                    border border-yellow-500/20 rounded-2xl p-4 hover:border-yellow-500/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    {(allTimeTop.posterUrl || allTimeTop.thumbnailUrl) && (
                      <img
                        src={allTimeTop.posterUrl || allTimeTop.thumbnailUrl}
                        alt={allTimeTop.title}
                        className="w-14 h-[78px] object-cover rounded-lg flex-shrink-0 shadow-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                          👑 All-Time Highest
                        </span>
                      </div>
                      <p className="font-black text-sm text-white group-hover:text-yellow-400
                        transition-colors leading-tight truncate mb-1">
                        {allTimeTop.title}
                      </p>
                      <p className="text-[10px] text-gray-500 mb-2">{fmtDate(allTimeTop.releaseDate)}</p>
                      <p className="text-xl font-black text-yellow-400">{fmtINR(allTimeTop.totalNet)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">Net Collection</p>
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4 text-yellow-500/20 text-5xl font-black
                    pointer-events-none select-none group-hover:text-yellow-500/30 transition-colors">
                    👑
                  </div>
                </Link>
              )}
            </div>
          )}

          {/* ── Currently Running ── */}
          {running.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  🎟 Currently Running
                </span>
                <span className="text-[10px] text-gray-600">— released in last 30 days</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {running.map((m: any) => {
                  const slug = movieSlug(m);
                  const verdict = isValidVerdict(m.verdict) ? m.verdict : null;
                  const vColor = verdict ? verdictColor(verdict) : "";
                  return (
                    <Link
                      key={m._id}
                      href={`/box-office/${slug}`}
                      className="group bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl p-2.5
                        hover:border-orange-500/30 transition-all flex gap-2.5 items-start"
                    >
                      {(m.posterUrl || m.thumbnailUrl) ? (
                        <img
                          src={m.posterUrl || m.thumbnailUrl}
                          alt={m.title}
                          loading="lazy"
                          className="w-9 h-[52px] object-cover rounded-md flex-shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-[52px] bg-[#1a1a1a] rounded-md flex items-center
                          justify-center text-sm text-gray-700 flex-shrink-0">🎬</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white group-hover:text-orange-400
                          transition-colors leading-tight truncate">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-orange-400 font-bold mt-1">
                          {fmtINR(m.totalNet)}
                        </p>
                        {verdict && (
                          <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5
                            rounded-full border ${vColor}`}>
                            {verdict}
                          </span>
                        )}
                        <p className="text-[9px] text-gray-700 mt-1">{m.lastDay}d</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Recently Updated ── */}
          {recentlyUpdated.length > 0 && (
            <section aria-label="Recently updated box office figures">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  🔄 Recently Updated
                </span>
                <span className="text-[10px] text-gray-600">— figures updated in last 48 hours</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {recentlyUpdated.map((m: any) => (
                  <Link
                    key={m._id}
                    href={`/box-office/${movieSlug(m)}`}
                    className="group flex gap-2 items-center bg-[#0f0f0f] border border-[#1c1c1c]
                      rounded-xl p-2.5 hover:border-orange-500/30 transition-all"
                  >
                    {(m.posterUrl || m.thumbnailUrl) ? (
                      <img src={m.posterUrl || m.thumbnailUrl} alt={m.title} loading="lazy"
                        className="w-8 h-11 object-cover rounded-md flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-11 bg-[#1a1a1a] rounded-md flex items-center
                        justify-center text-sm text-gray-700 flex-shrink-0">🎬</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-white group-hover:text-orange-400
                        transition-colors truncate leading-snug">{m.title}</p>
                      <p className="text-[10px] text-orange-400 font-bold mt-0.5">{fmtINR(m.totalNet)}</p>
                      <p className="text-[9px] text-gray-700 mt-0.5">{m.lastDay}d data</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ── Language Filter Links ── */}
          {languages.length > 1 && (
            <nav aria-label="Filter movies by language">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Filter by Language:</span>
                <div className="flex flex-wrap gap-1.5">
                  {languages.map((lang: string) => (
                    <a
                      key={lang}
                      href={`#lang-${lang.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-[10px] text-gray-400 hover:text-orange-400 border border-[#1c1c1c]
                        hover:border-orange-500/30 bg-[#0f0f0f] rounded-full px-2.5 py-1 transition-colors"
                    >
                      {lang}
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          )}

          {/* ── Full List — Month Grouped ── */}
          <section aria-label="All Odia movies box office collection 2026">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                📋 All Releases
              </span>
              <span className="text-[10px] text-gray-600">— {enriched.length} films, sorted by release date</span>
            </div>

            {monthGroups.map((group, gi) => {
              // running rank offset
              const offset = monthGroups.slice(0, gi).reduce((s, g) => s + g.items.length, 0);
              // find dominant language in group for id anchor
              const groupLang = group.items[0]?.language || "";
              return (
                <div key={group.label} className="mb-4"
                  id={`lang-${groupLang.toLowerCase().replace(/\s+/g, "-")}`}>
                  {/* Month heading — crawlable H3 */}
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600
                    border-b border-[#1c1c1c] pb-1.5 mb-0.5 flex items-center gap-2">
                    <span>{group.label}</span>
                    <span className="text-gray-700 font-normal normal-case tracking-normal">
                      — {group.items.length} film{group.items.length !== 1 ? "s" : ""}
                    </span>
                  </h3>

                  {/* Desktop column headers — only on first group */}
                  {gi === 0 && (
                    <div className="hidden sm:flex items-center gap-2 px-2 py-1.5
                      text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                      <span className="w-6 text-center">#</span>
                      <span className="w-9" />
                      <span className="flex-1">Movie</span>
                      <span className="w-28 text-left">Released</span>
                      <span className="w-20 text-right">Net</span>
                      <span className="w-20 text-right hidden md:block">Gross</span>
                      <span className="w-24 text-right">Verdict</span>
                      <span className="w-4" />
                    </div>
                  )}

                  <div className="divide-y divide-[#141414]">
                    {group.items.map((m: any, idx: number) => {
                      const slug          = movieSlug(m);
                      const storedVerdict = isValidVerdict(m.verdict) ? m.verdict : null;
                      const vColor        = storedVerdict ? verdictColor(storedVerdict) : "";
                      const relDate       = fmtDate(m.releaseDate);
                      const isNew         = now - dateTs(m.releaseDate) <= oneWeek;
                      const globalRank    = offset + idx + 1;

                      return (
                        <Link
                          key={m._id}
                          href={`/box-office/${slug}`}
                          className="group flex items-center gap-2 sm:gap-3 py-2.5 px-2 rounded-lg
                            hover:bg-white/[0.03] transition-colors duration-100"
                        >
                          <span className="w-6 text-center text-xs font-black text-gray-700
                            group-hover:text-orange-500 transition-colors flex-shrink-0">
                            {globalRank}
                          </span>

                          <div className="flex-shrink-0">
                            {(m.posterUrl || m.thumbnailUrl) ? (
                              <img src={m.posterUrl || m.thumbnailUrl} alt={`${m.title} box office collection`}
                                loading="lazy"
                                className="w-8 h-11 sm:w-9 sm:h-[52px] object-cover rounded-md shadow-md" />
                            ) : (
                              <div className="w-8 h-11 sm:w-9 sm:h-[52px] bg-[#1a1a1a] rounded-md
                                flex items-center justify-center text-sm text-gray-700">🎬</div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-white group-hover:text-orange-400
                                transition-colors truncate text-xs sm:text-sm leading-snug">
                                {m.title}
                              </p>
                              {isNew && (
                                <span className="flex-shrink-0 text-[8px] font-black uppercase
                                  tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20
                                  rounded-full px-1.5 py-0.5 hidden sm:inline">New</span>
                              )}
                            </div>
                            <div className="sm:hidden flex items-center gap-2 mt-1 flex-wrap">
                              {relDate !== "—" && <span className="text-[10px] text-gray-500">{relDate}</span>}
                              {m.totalNet > 0 && <span className="text-[10px] font-bold text-orange-400">{fmtINR(m.totalNet)}</span>}
                              {storedVerdict && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${vColor}`}>
                                  {storedVerdict}
                                </span>
                              )}
                            </div>
                            <div className="hidden sm:flex items-center gap-1 mt-0.5 text-[10px] text-gray-600">
                              {m.language && <span>{m.language}</span>}
                              {m.lastDay > 0 && <span>· {m.lastDay}d</span>}
                            </div>
                          </div>

                          <div className="hidden sm:block w-28 flex-shrink-0">
                            <span className="text-xs text-gray-400 whitespace-nowrap">{relDate}</span>
                          </div>
                          <div className="hidden sm:block w-20 text-right flex-shrink-0">
                            <span className="font-bold text-orange-400 text-sm">{fmtINR(m.totalNet)}</span>
                          </div>
                          <div className="hidden md:block w-20 text-right flex-shrink-0">
                            <span className="font-bold text-sky-300 text-sm">{fmtINR(m.totalGross)}</span>
                          </div>
                          <div className="hidden sm:flex w-24 justify-end flex-shrink-0">
                            {storedVerdict && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${vColor}`}>
                                {storedVerdict}
                              </span>
                            )}
                          </div>
                          <span className="w-4 text-right text-gray-700 group-hover:text-orange-400
                            transition-colors text-xs flex-shrink-0">→</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {/* ── Box Office Blogs ── */}
          {blogs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    📰 Box Office News & Analysis
                  </span>
                  <span className="text-[10px] text-gray-600">— {blogs.length} articles</span>
                </div>
                <Link
                  href="/blog?category=Box+Office"
                  className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-semibold"
                >
                  View all →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {blogs.map((b: any) => (
                  <Link
                    key={b._id}
                    href={`/blog/${b.slug}`}
                    className="group flex gap-3 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl p-3
                      hover:border-orange-500/30 hover:bg-[#111] transition-all duration-150"
                  >
                    {/* Thumbnail */}
                    {b.coverImage ? (
                      <img
                        src={b.coverImage}
                        alt={b.title}
                        loading="lazy"
                        className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-lg flex-shrink-0
                          group-hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-20 h-14 sm:w-24 sm:h-16 bg-[#1a1a1a] rounded-lg flex-shrink-0
                        flex items-center justify-center text-xl text-gray-700">📰</div>
                    )}

                    {/* Text */}
                    <div className="flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        {b.featured && (
                          <span className="inline-block text-[8px] font-black uppercase tracking-widest
                            text-orange-400 bg-orange-500/10 border border-orange-500/20
                            rounded-full px-1.5 py-0.5 mb-1">
                            Featured
                          </span>
                        )}
                        <p className="text-[11px] sm:text-xs font-bold text-white
                          group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                          {b.title}
                        </p>
                        {b.excerpt && (
                          <p className="text-[10px] text-gray-600 leading-relaxed mt-1 line-clamp-2">
                            {b.excerpt}
                          </p>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-700 mt-1.5">
                        {fmtDate(b.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── SEO blocks ── */}
          <div className="space-y-4 pt-4">
            {[
              {
                title: "Odia Box Office Collection 2026 — Ollywood Trade Report",
                body:  "Ollypedia is Odisha's most trusted box office tracking platform for Odia (Ollywood) cinema. We publish accurate, day-wise net and gross collection figures for every major Odia film release in 2026. Whether you follow the first-day opening, weekend trends, or total lifetime earnings, our box office section covers it all — updated daily with verified trade estimates.",
              },
              {
                title: "How We Calculate Odia Movie Box Office Collection",
                body:  "Our figures are sourced from distributor reports, exhibitor data, and industry trade networks across Odisha. Net collection is the money collected after deducting GST and entertainment tax. Gross collection includes all taxes. Verdicts like Hit, Blockbuster, Average, and Flop are based on the film's performance against its total cost.",
              },
              {
                title: "About Ollywood — The Odia Film Industry",
                body:  "Ollywood, the Odia film industry based in Bhubaneswar and Cuttack, produces over 30–40 films annually. With a growing theatre network across Odisha and diaspora audiences in other states, Odia cinema has seen a steady rise in box office numbers. Stars like Babushan Mohanty, Anubhav Mohanty, and Elina Samantray consistently deliver films that resonate with audiences across Odisha.",
              },
            ].map(({ title, body }) => (
              <div key={title} className="p-4 sm:p-5 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl">
                <h2 className="text-xs sm:text-sm font-bold text-white mb-2">{title}</h2>
                <p className="text-xs text-gray-400 leading-relaxed">{body}</p>
              </div>
            ))}

            {/* Dynamic top movies paragraph — long-tail SEO */}
            {enriched.length > 0 && (() => {
              const top5 = [...enriched]
                .sort((a: any, b: any) => b.totalNet - a.totalNet)
                .slice(0, 5);
              const names = top5.map((m: any) => m.title).join(", ");
              return (
                <div className="p-4 sm:p-5 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl">
                  <h2 className="text-xs sm:text-sm font-bold text-white mb-2">
                    Top Earning Odia Movies — All Time
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed mb-3">
                    Based on total net collection tracked on Ollypedia, the highest-grossing Odia films are{" "}
                    <strong className="text-gray-300">{names}</strong>. These films represent the benchmark
                    for Ollywood box office success and are regularly cited in trade reports across Odisha.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {top5.map((m: any) => (
                      <Link
                        key={m._id}
                        href={`/box-office/${movieSlug(m)}`}
                        className="text-[10px] text-orange-400 hover:text-orange-300 border border-orange-500/20
                          bg-orange-500/5 hover:bg-orange-500/10 rounded-full px-2.5 py-1 transition-colors"
                      >
                        {m.title} — {fmtINR(m.totalNet)}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* FAQ */}
            <div className="p-4 sm:p-5 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl">
              <h2 className="text-xs sm:text-sm font-bold text-white mb-3">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {[
                  {
                    q: "Where can I find the latest Odia movie box office collection?",
                    a: "Ollypedia publishes daily box office updates for all Odia movies. Bookmark this page and check back every day for fresh figures.",
                  },
                  {
                    q: "What is the difference between net and gross collection?",
                    a: "Gross is total revenue including taxes. Net is what remains after deducting GST and local entertainment tax — the actual revenue for producers and distributors.",
                  },
                  {
                    q: "How is an Odia movie verdict decided?",
                    a: "A verdict is based on earnings vs total cost (production + prints + publicity). A film recovering more than twice its cost is called a Blockbuster; failing to recover costs is a Flop.",
                  },
                  {
                    q: "Does Ollypedia track worldwide collection of Odia movies?",
                    a: "Yes, where data is available we include worldwide figures covering Odisha, rest of India, and international markets.",
                  },
                  {
                    q: "Which Odia movie has the highest box office collection ever?",
                    a: allTimeTop
                      ? `${allTimeTop.title} holds the record for the highest net collection among all Odia films tracked on Ollypedia with a total of ${fmtINR(allTimeTop.totalNet)}.`
                      : "Ollypedia tracks all Odia films and the all-time highest grosser is updated regularly on this page.",
                  },
                  {
                    q: "How many Odia movies released in 2026?",
                    a: `As of the latest update, Ollypedia is tracking ${enriched.length} Odia films with box office data in 2026. New releases are added as they hit theatres.`,
                  },
                  {
                    q: "What does 'Day 1 collection' mean for Odia movies?",
                    a: "Day 1 collection refers to box office earnings on a film's first day of release, including morning, afternoon, and evening shows across all theatres in Odisha and other regions.",
                  },
                  {
                    q: "Is Ollypedia free to use?",
                    a: "Yes, Ollypedia is completely free. All box office data, verdicts, and Odia cinema news are available without any subscription or login.",
                  },
                ].map(({ q, a }) => (
                  <div key={q} className="border-t border-[#1c1c1c] pt-3 first:border-0 first:pt-0">
                    <p className="text-xs font-semibold text-gray-200 mb-1">{q}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Internal Link Footer — SEO hub ── */}
          <nav aria-label="Explore more on Ollypedia"
            className="border-t border-[#1c1c1c] pt-5 mt-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">
              Explore Ollypedia
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { href: "/box-office",          label: "Box Office Home",         desc: "All Odia movie collections" },
                { href: "/blog",                label: "Odia Cinema News",        desc: "Latest Ollywood updates" },
                { href: "/blog?category=Box+Office", label: "Box Office Reports", desc: "Day-wise collection blogs" },
                { href: "/",                    label: "Ollypedia Home",           desc: "Odisha's cinema database" },
              ].map(({ href, label, desc }) => (
                <Link key={href} href={href}
                  className="group p-3 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl
                    hover:border-orange-500/20 hover:bg-[#111] transition-all">
                  <p className="text-[11px] font-bold text-white group-hover:text-orange-400
                    transition-colors">{label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{desc}</p>
                </Link>
              ))}
            </div>
          </nav>

        </div>
      </div>
    </>
  );
}