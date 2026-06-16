// app/box-office/page.tsx
// Box Office listing — all years, year-wise tabs, all-time leaderboard

import type { Metadata } from "next";
import Link              from "next/link";
import { connectDB }     from "@/lib/db";
import Movie             from "@/models/Movie";
import Blog              from "@/models/Blog";

export const revalidate = 600;

/* ─── Dynamic metadata ──────────────────────────────────────────────────────── */

export async function generateMetadata(
  { searchParams }: { searchParams: { year?: string } }
): Promise<Metadata> {
  const year = searchParams?.year ? parseInt(searchParams.year, 10) : new Date().getFullYear();
  const isCurrentYear = year === new Date().getFullYear();
  const title = isCurrentYear
    ? `Odia Box Office Collection ${year} | Ollypedia`
    : `Odia Box Office Collection ${year} | Ollywood Hit Flop List | Ollypedia`;
  const description = isCurrentYear
    ? `Complete Odia (Ollywood) box office collection report ${year}. Day-wise net and gross earnings for all latest Odia movies — updated daily on Ollypedia.`
    : `Odia (Ollywood) box office collection ${year} — all movies, hit & flop verdict, day-wise net and gross earnings. Complete Ollywood ${year} trade report on Ollypedia.`;

  return {
    title,
    description,
    alternates:  { canonical: "https://ollypedia.in/box-office" },
    robots:      { index: true, follow: true },
    keywords:    [
      "Odia box office", "Ollywood collection", `Odia movie collection ${year}`,
      "Odia cinema box office", `Ollywood box office ${year}`, "Odia film earnings",
      "Ollywood hit flop verdict", "Odia movie first day collection",
      `Ollywood movie verdict ${year}`, "Odia film box office report",
      "Ollywood hit or flop", "Odia movie total collection",
      "today Odia box office", "Odia movie this week collection",
      `Ollywood ${year} hit flop list`, "Odia cinema earnings report",
      "all time highest grossing Odia film", "Ollywood blockbuster list",
    ],
    openGraph: {
      title,
      description,
      url:         "https://ollypedia.in/box-office",
      siteName:    "Ollypedia",
      type:        "website",
      locale:      "en_IN",
      images: [{ url: "https://ollypedia.in/og-box-office.jpg", width: 1200, height: 630, alt: `Odia Box Office Collection ${year} — Ollypedia` }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description: `Day-wise net & gross earnings for all Odia (Ollywood) movies ${year}. Updated daily.`,
      images:      ["https://ollypedia.in/og-box-office.jpg"],
      site:        "@ollypedia",
    },
  };
}

/* ─── Helpers ─────────────────────────────────────────────────────────────────*/

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

function dateTs(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const iso = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`).getTime();
  return new Date(dateStr).getTime() || 0;
}

function getYear(dateStr: string | undefined | null): number {
  if (!dateStr) return 0;
  const iso = String(dateStr).match(/^(\d{4})/);
  return iso ? parseInt(iso[1], 10) : 0;
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

/* ─── Data ─────────────────────────────────────────────────────────────────── */

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

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default async function BoxOfficePage({
  searchParams,
}: {
  searchParams: { year?: string };
}) {
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams?.year
    ? parseInt(searchParams.year, 10)
    : currentYear;

  const [movies, blogs] = await Promise.all([getBoxOfficeMovies(), getBoxOfficeBlogs()]);

  // Enrich ALL movies (needed for all-time stats)
  const enriched = movies.map((m: any) => {
    const days       = (m.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
    const totalNet   = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
    const totalGross = days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
    const lastDay    = days[days.length - 1]?.day || 0;
    const year       = getYear(m.releaseDate);
    return { ...m, days, totalNet, totalGross, lastDay, year };
  });

  // Available years (for tabs)
 const availableYears = [
  ...new Set<number>(
    enriched
      .map((m: any) => m.year)
      .filter(Boolean)
  ),
].sort((a, b) => b - a);

  // Movies for selected year
  const yearMovies = enriched.filter((m: any) => m.year === selectedYear);

  /* ── All-time stats (across all years) ── */
  const allTimeNet    = enriched.reduce((s: number, m: any) => s + m.totalNet, 0);
  const allTimeGross  = enriched.reduce((s: number, m: any) => s + m.totalGross, 0);
  const allTimeTop    = [...enriched].sort((a: any, b: any) => b.totalNet - a.totalNet)[0] || null;
  const allTimeTop5   = [...enriched].sort((a: any, b: any) => b.totalNet - a.totalNet).slice(0, 5);
  const allHitsCount  = enriched.filter((m: any) =>
    m.verdict && ["hit","superhit","blockbuster"].some((k: string) => m.verdict.toLowerCase().includes(k))
  ).length;

  /* ── Selected year stats ── */
  const yearNet    = yearMovies.reduce((s: number, m: any) => s + m.totalNet, 0);
  const yearGross  = yearMovies.reduce((s: number, m: any) => s + m.totalGross, 0);
  const yearHits   = yearMovies.filter((m: any) =>
    m.verdict && ["hit","superhit","blockbuster"].some((k: string) => m.verdict.toLowerCase().includes(k))
  ).length;

  const now     = Date.now();
  const oneWeek = 7  * 24 * 60 * 60 * 1000;
  const oneDay  = 24 * 60 * 60 * 1000;

  /* ── Currently Running ──────────────────────────────────────────────────────
     A movie is "currently running" if it has day-by-day box office data AND
     the estimated date of its latest day entry is within the last 14 days.
     This means the admin is actively adding daily collection — the film is
     genuinely still in theatres and being tracked.
     Latest day date = releaseDate + (lastDay - 1) days.
  ────────────────────────────────────────────────────────────────────────── */
  const running = enriched
    .filter((m: any) => {
      if (!m.lastDay || m.lastDay < 1) return false;
      const relTs       = dateTs(m.releaseDate);
      if (!relTs) return false;
      const lastDayTs   = relTs + (m.lastDay - 1) * oneDay;
      return now - lastDayTs <= 14 * oneDay;   // latest tracked day is within 14 days
    })
    .sort((a: any, b: any) => {
      // Sort by how recent the last tracked day is
      const aLastTs = dateTs(a.releaseDate) + (a.lastDay - 1) * oneDay;
      const bLastTs = dateTs(b.releaseDate) + (b.lastDay - 1) * oneDay;
      return bLastTs - aLastTs;
    })
    .slice(0, 6);

  /* ── This week's top ── */
  const withWeekNet = enriched.map((m: any) => {
    const relTs   = dateTs(m.releaseDate);
    const weekNet = (m.days || []).reduce((s: number, d: any) => {
      const dayTs = relTs + (d.day - 1) * oneDay;
      return now - dayTs <= oneWeek ? s + parseNum(d.net) : s;
    }, 0);
    return { ...m, weekNet };
  });
  const weekTop = [...withWeekNet]
    .filter((m: any) => m.weekNet > 0)
    .sort((a: any, b: any) => b.weekNet - a.weekNet)[0] || null;

  /* ── Month-grouped for selected year ── */
  const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  type MovieGroup = { label: string; items: any[] };
  const monthGroups: MovieGroup[] = [];
  yearMovies.forEach((m: any) => {
    const iso = String(m.releaseDate || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    const label = iso ? `${MONTHS_FULL[parseInt(iso[2], 10) - 1]} ${iso[1]}` : "Unknown";
    const last  = monthGroups[monthGroups.length - 1];
    if (last && last.label === label) { last.items.push(m); }
    else { monthGroups.push({ label, items: [m] }); }
  });

  /* ── Year verdict breakdown ── */
  const verdictGroups: Record<string, number> = {
    Blockbuster: 0, Superhit: 0, Hit: 0, Average: 0, Flop: 0, Disaster: 0,
  };
  yearMovies.forEach((m: any) => {
    if (!m.verdict) return;
    const v = m.verdict.toLowerCase();
    if      (v.includes("blockbuster")) verdictGroups["Blockbuster"]++;
    else if (v.includes("superhit"))    verdictGroups["Superhit"]++;
    else if (v.includes("hit"))         verdictGroups["Hit"]++;
    else if (v.includes("average"))     verdictGroups["Average"]++;
    else if (v.includes("disaster"))    verdictGroups["Disaster"]++;
    else if (v.includes("flop"))        verdictGroups["Flop"]++;
  });
  const verdictColorMap: Record<string, string> = {
    Blockbuster: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Superhit:    "text-emerald-300 bg-emerald-500/10 border-emerald-500/20",
    Hit:         "text-green-400 bg-green-500/10 border-green-500/20",
    Average:     "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
    Flop:        "text-red-400 bg-red-500/10 border-red-500/20",
    Disaster:    "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };
  const verdictEntries = Object.entries(verdictGroups).filter(([, n]) => n > 0);

  const lastUpdated = enriched[0]?.updatedAt
    ? new Date(enriched[0].updatedAt).toISOString()
    : new Date().toISOString();

  const languages = [...new Set(yearMovies.map((m: any) => m.language).filter(Boolean))] as string[];

  /* ── JSON-LD ── */
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type":    "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home",       "item": "https://ollypedia.in" },
      { "@type": "ListItem", "position": 2, "name": "Box Office", "item": "https://ollypedia.in/box-office" },
      ...(selectedYear !== currentYear ? [{ "@type": "ListItem", "position": 3, "name": String(selectedYear), "item": `https://ollypedia.in/box-office?year=${selectedYear}` }] : []),
    ],
  };

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
    "name":     `Odia Box Office Collection ${selectedYear} | Ollypedia`,
    "description": `Complete day-wise box office collection for Odia (Ollywood) movies ${selectedYear}. Updated daily.`,
    "url":      "https://ollypedia.in/box-office",
    "dateModified": lastUpdated,
    "publisher": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
    "mainEntity": {
      "@type": "ItemList",
      "name":  `Odia Movies Box Office ${selectedYear}`,
      "numberOfItems": yearMovies.length,
      "itemListElement": yearMovies.slice(0, 20).map((m: any, i: number) => ({
        "@type":    "ListItem",
        "position": i + 1,
        "name":     m.title,
        "url":      `https://ollypedia.in/box-office/${movieSlug(m)}`,
      })),
    },
  };

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
        "acceptedAnswer": { "@type": "Answer", "text": allTimeTop ? `${allTimeTop.title} holds the record for the highest net collection among all Odia films tracked on Ollypedia, with a total of ${fmtINR(allTimeTop.totalNet)}.` : "Ollypedia tracks all Odia films and the all-time highest grosser is updated regularly on this page." },
      },
      {
        "@type":          "Question",
        "name":           `How many Odia movies are tracked on Ollypedia?`,
        "acceptedAnswer": { "@type": "Answer", "text": `Ollypedia is currently tracking ${enriched.length} Odia films with box office data across all years (${availableYears[availableYears.length - 1]}–${availableYears[0]}). New releases are added as they hit theatres.` },
      },
      {
        "@type":          "Question",
        "name":           "What does 'Day 1 collection' mean for Odia movies?",
        "acceptedAnswer": { "@type": "Answer", "text": "Day 1 collection refers to box office earnings on a film's first day of release, including morning, afternoon, and evening shows across all theatres in Odisha and other regions." },
      },
      {
        "@type":          "Question",
        "name":           "Is Ollypedia free to use?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes, Ollypedia is completely free. All box office data, verdicts, and Odia cinema news are available without any subscription or login." },
      },
    ],
  };

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
              <Link href="/box-office" className="hover:text-orange-400 transition-colors">Box Office</Link>
              {selectedYear !== currentYear && (
                <>
                  <span>/</span>
                  <span className="text-gray-400">{selectedYear}</span>
                </>
              )}
            </nav>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest
                uppercase text-orange-400 bg-orange-500/10 border border-orange-500/20
                rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse inline-block" />
                Live Tracking
              </span>
              <span className="text-xs text-gray-600">{enriched.length} films across all years</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              Odia Box Office{" "}
              <span className="text-orange-400">Collection {selectedYear}</span>
            </h1>
            <p className="text-gray-500 text-xs mt-1.5">
              Day-wise net &amp; gross for all Odia (Ollywood) movies — latest releases first.
              {selectedYear !== currentYear && (
                <> Viewing archive for <strong className="text-gray-400">{selectedYear}</strong>.</>
              )}
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

          {/* ── Year Tabs ── */}
          {availableYears.length > 1 && (
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                📅 Browse by Year
              </p>
              {/* Scrollable year pill row */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide snap-x">
                {/* "All Time" anchor tab */}
                <a
                  href="#all-time"
                  className="flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold border transition-all
                    text-yellow-400 border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 whitespace-nowrap"
                >
                  👑 All Time
                </a>
                {availableYears.map((yr) => {
                  const isActive = yr === selectedYear;
                  const isCurrent = yr === currentYear;
                  return (
                    <Link
                      key={yr}
                      href={yr === currentYear ? "/box-office" : `/box-office?year=${yr}`}
                      className={[
                        "flex-shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap",
                        isActive
                          ? "text-orange-400 border-orange-500/40 bg-orange-500/15"
                          : "text-gray-400 border-[#1c1c1c] bg-[#0f0f0f] hover:text-white hover:border-orange-500/20 hover:bg-[#141414]",
                      ].join(" ")}
                    >
                      {yr}
                      {isCurrent && (
                        <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-orange-400 inline-block align-middle" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All-Time Stats Bar ── */}
          {enriched.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                📊 All-Time Totals ({availableYears[availableYears.length - 1]}–{availableYears[0]})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "All-Time Net",    value: fmtINR(allTimeNet),        accent: "text-orange-400" },
                  { label: "All-Time Gross",  value: fmtINR(allTimeGross),      accent: "text-sky-300" },
                  { label: "Films Tracked",   value: String(enriched.length),   accent: "text-white" },
                  { label: "Total Hits",      value: String(allHitsCount),      accent: "text-emerald-400" },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl px-4 py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">{label}</p>
                    <p className={`text-lg sm:text-xl font-black ${accent}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Selected Year Stats ── */}
          {yearMovies.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2">
                🎬 {selectedYear} Stats — {yearMovies.length} Films
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: `${selectedYear} Net`,   value: fmtINR(yearNet),        accent: "text-orange-400" },
                  { label: `${selectedYear} Gross`, value: fmtINR(yearGross),      accent: "text-sky-300" },
                  { label: "Hits",                  value: String(yearHits),        accent: "text-emerald-400" },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="bg-[#0a0a0a] border border-[#181818] rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-700 uppercase tracking-widest mb-1">{label}</p>
                    <p className={`text-base sm:text-lg font-black ${accent}`}>{value}</p>
                  </div>
                ))}
              </div>
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

          {/* ── Verdict Breakdown for selected year ── */}
          {verdictEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  🏆 {selectedYear} Verdict Scorecard
                </span>
                <span className="text-[10px] text-gray-600">— how Ollywood performed</span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {verdictEntries.map(([label, count]) => (
                  <div key={label}
                    className={`border rounded-xl px-3 py-2.5 text-center ${verdictColorMap[label]}`}>
                    <p className="text-lg font-black leading-none">{count}</p>
                    <p className="text-[10px] font-semibold mt-1 opacity-80">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Highlight Cards: Week Top + All-Time #1 ── */}
          {enriched.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* This Week's Top Performer */}
              {weekTop && (
                <Link
                  href={`/box-office/${movieSlug(weekTop)}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-orange-500/10 via-[#111] to-[#0f0f0f]
                    border border-orange-500/20 rounded-2xl p-4 hover:border-orange-500/40 transition-all"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2">
                    🔥 This Week's Top Performer
                  </p>
                  <div className="flex items-start gap-3">
                    {(weekTop.posterUrl || weekTop.thumbnailUrl) && (
                      <img
                        src={weekTop.posterUrl || weekTop.thumbnailUrl}
                        alt={weekTop.title}
                        loading="lazy"
                        className="w-12 h-16 object-cover rounded-lg flex-shrink-0 shadow-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-white group-hover:text-orange-400 transition-colors
                        text-sm sm:text-base leading-snug truncate">{weekTop.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{fmtDate(weekTop.releaseDate)}</p>
                      <div className="mt-2">
                        <p className="text-xl font-black text-orange-400">{fmtINR(weekTop.weekNet)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">This week's net</p>
                      </div>
                      {isValidVerdict(weekTop.verdict) && (
                        <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${verdictColor(weekTop.verdict)}`}>
                          {weekTop.verdict}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4 text-orange-500/15 text-5xl font-black
                    pointer-events-none select-none group-hover:text-orange-500/25 transition-colors">🔥</div>
                </Link>
              )}

              {/* All-Time #1 */}
              {allTimeTop && (
                <Link
                  href={`/box-office/${movieSlug(allTimeTop)}`}
                  className="group relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-[#111] to-[#0f0f0f]
                    border border-yellow-500/20 rounded-2xl p-4 hover:border-yellow-500/40 transition-all"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400 mb-2">
                    👑 All-Time Highest Grosser
                  </p>
                  <div className="flex items-start gap-3">
                    {(allTimeTop.posterUrl || allTimeTop.thumbnailUrl) && (
                      <img
                        src={allTimeTop.posterUrl || allTimeTop.thumbnailUrl}
                        alt={allTimeTop.title}
                        loading="lazy"
                        className="w-12 h-16 object-cover rounded-lg flex-shrink-0 shadow-lg"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-black text-white group-hover:text-yellow-400 transition-colors
                        text-sm sm:text-base leading-snug truncate">{allTimeTop.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        {fmtDate(allTimeTop.releaseDate)} · {allTimeTop.year}
                      </p>
                      <div className="mt-2">
                        <p className="text-xl font-black text-yellow-400">{fmtINR(allTimeTop.totalNet)}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">Net Collection</p>
                      </div>
                      {isValidVerdict(allTimeTop.verdict) && (
                        <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full border ${verdictColor(allTimeTop.verdict)}`}>
                          {allTimeTop.verdict}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-4 text-yellow-500/20 text-5xl font-black
                    pointer-events-none select-none group-hover:text-yellow-500/30 transition-colors">👑</div>
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
                <span className="text-[10px] text-gray-600">— actively tracked day by day</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {running.map((m: any) => {
                  const slug      = movieSlug(m);
                  const verdict   = isValidVerdict(m.verdict) ? m.verdict : null;
                  const vColor    = verdict ? verdictColor(verdict) : "";
                  const relTs     = dateTs(m.releaseDate);
                  const lastDayTs = relTs + (m.lastDay - 1) * oneDay;
                  const daysAgo   = Math.floor((now - lastDayTs) / oneDay);
                  const daysAgoLabel = daysAgo === 0 ? "Updated today" : daysAgo === 1 ? "Updated yesterday" : `Updated ${daysAgo}d ago`;
                  return (
                    <Link
                      key={m._id}
                      href={`/box-office/${slug}`}
                      className="group bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl p-2.5
                        hover:border-orange-500/30 transition-all flex gap-2.5 items-start"
                    >
                      {(m.posterUrl || m.thumbnailUrl) ? (
                        <img src={m.posterUrl || m.thumbnailUrl} alt={m.title} loading="lazy"
                          className="w-9 h-[52px] object-cover rounded-md flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-[52px] bg-[#1a1a1a] rounded-md flex items-center
                          justify-center text-sm text-gray-700 flex-shrink-0">🎬</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-white group-hover:text-orange-400
                          transition-colors leading-tight line-clamp-2">{m.title}</p>
                        <p className="text-[10px] text-orange-400 font-bold mt-1">{fmtINR(m.totalNet)}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[9px] text-gray-600">Day {m.lastDay}</span>
                          {verdict && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${vColor}`}>
                              {verdict}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-green-500/70 mt-1 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-green-500 inline-block animate-pulse" />
                          {daysAgoLabel}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All-Time Top 10 Leaderboard ── */}
          {allTimeTop5.length > 0 && (
            <section id="all-time" aria-label="All-time highest grossing Odia movies">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    👑 All-Time Top Grossers
                  </span>
                  <span className="text-[10px] text-gray-600">— highest net collection ever</span>
                </div>
              </div>
              <div className="bg-[#0d0d0d] border border-yellow-500/15 rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="hidden sm:flex items-center gap-3 px-4 py-2.5 border-b border-[#1a1a1a]
                  text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                  <span className="w-6 text-center">#</span>
                  <span className="w-9" />
                  <span className="flex-1">Movie</span>
                  <span className="w-14 text-center">Year</span>
                  <span className="w-24 text-right">Net</span>
                  <span className="w-24 text-right hidden md:block">Gross</span>
                  <span className="w-24 text-right">Verdict</span>
                </div>
                <div className="divide-y divide-[#141414]">
                  {[...enriched]
                    .sort((a: any, b: any) => b.totalNet - a.totalNet)
                    .slice(0, 10)
                    .map((m: any, idx: number) => {
                      const slug          = movieSlug(m);
                      const storedVerdict = isValidVerdict(m.verdict) ? m.verdict : null;
                      const vColor        = storedVerdict ? verdictColor(storedVerdict) : "";
                      const medal         = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : null;
                      return (
                        <Link key={m._id} href={`/box-office/${slug}`}
                          className="group flex items-center gap-2 sm:gap-3 py-3 px-3 sm:px-4
                            hover:bg-yellow-500/[0.04] transition-colors duration-100">
                          <span className="w-6 text-center text-xs font-black text-gray-700
                            group-hover:text-yellow-500 transition-colors flex-shrink-0">
                            {medal || idx + 1}
                          </span>
                          <div className="flex-shrink-0">
                            {(m.posterUrl || m.thumbnailUrl) ? (
                              <img src={m.posterUrl || m.thumbnailUrl} alt={m.title} loading="lazy"
                                className="w-8 h-11 sm:w-9 sm:h-[52px] object-cover rounded-md shadow-md" />
                            ) : (
                              <div className="w-8 h-11 sm:w-9 sm:h-[52px] bg-[#1a1a1a] rounded-md
                                flex items-center justify-center text-sm text-gray-700">🎬</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white group-hover:text-yellow-400
                              transition-colors truncate text-xs sm:text-sm leading-snug">{m.title}</p>
                            {/* Mobile: show year + net inline */}
                            <div className="sm:hidden flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] text-gray-600">{m.year}</span>
                              {m.totalNet > 0 && <span className="text-[10px] font-bold text-yellow-400">{fmtINR(m.totalNet)}</span>}
                              {storedVerdict && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${vColor}`}>{storedVerdict}</span>
                              )}
                            </div>
                          </div>
                          <div className="hidden sm:block w-14 text-center flex-shrink-0">
                            <span className="text-[11px] text-gray-500">{m.year}</span>
                          </div>
                          <div className="hidden sm:block w-24 text-right flex-shrink-0">
                            <span className="font-bold text-yellow-400 text-sm">{fmtINR(m.totalNet)}</span>
                          </div>
                          <div className="hidden md:block w-24 text-right flex-shrink-0">
                            <span className="font-bold text-sky-300 text-sm">{fmtINR(m.totalGross)}</span>
                          </div>
                          <div className="hidden sm:flex w-24 justify-end flex-shrink-0">
                            {storedVerdict && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${vColor}`}>
                                {storedVerdict}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                </div>
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
                    <a key={lang}
                      href={`#lang-${lang.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-[10px] text-gray-400 hover:text-orange-400 border border-[#1c1c1c]
                        hover:border-orange-500/30 bg-[#0f0f0f] rounded-full px-2.5 py-1 transition-colors">
                      {lang}
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          )}

          {/* ── Full Year List — Month Grouped ── */}
          <section aria-label={`Odia movies box office collection ${selectedYear}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                📋 {selectedYear} Releases
              </span>
              <span className="text-[10px] text-gray-600">
                — {yearMovies.length} film{yearMovies.length !== 1 ? "s" : ""}, sorted by release date
              </span>
            </div>

            {yearMovies.length === 0 ? (
              <div className="py-12 text-center bg-[#0f0f0f] border border-[#1c1c1c] rounded-2xl">
                <p className="text-3xl mb-3">🎬</p>
                <p className="text-sm font-bold text-gray-400">No films tracked for {selectedYear}</p>
                <p className="text-xs text-gray-600 mt-1">Try a different year from the tabs above.</p>
                <Link href="/box-office"
                  className="inline-block mt-4 px-4 py-2 bg-orange-500/10 border border-orange-500/20
                    rounded-full text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all">
                  View {currentYear} →
                </Link>
              </div>
            ) : (
              monthGroups.map((group, gi) => {
                const offset    = monthGroups.slice(0, gi).reduce((s, g) => s + g.items.length, 0);
                const groupLang = group.items[0]?.language || "";
                return (
                  <div key={group.label} className="mb-4"
                    id={`lang-${groupLang.toLowerCase().replace(/\s+/g, "-")}`}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-600
                      border-b border-[#1c1c1c] pb-1.5 mb-0.5 flex items-center gap-2">
                      <span>{group.label}</span>
                      <span className="text-gray-700 font-normal normal-case tracking-normal">
                        — {group.items.length} film{group.items.length !== 1 ? "s" : ""}
                      </span>
                    </h3>

                    {/* Desktop column headers — only first group */}
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
                          <Link key={m._id} href={`/box-office/${slug}`}
                            className="group flex items-center gap-2 sm:gap-3 py-2.5 px-2 rounded-lg
                              hover:bg-white/[0.03] transition-colors duration-100">
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
                                  transition-colors truncate text-xs sm:text-sm leading-snug">{m.title}</p>
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
              })
            )}
          </section>

          {/* ── Box Office Blogs ── */}
          {blogs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    📰 Box Office News &amp; Analysis
                  </span>
                  <span className="text-[10px] text-gray-600">— {blogs.length} articles</span>
                </div>
                <Link href="/blog?category=Box+Office"
                  className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-semibold">
                  View all →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {blogs.map((b: any) => (
                  <Link key={b._id} href={`/blog/${b.slug}`}
                    className="group flex gap-3 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl p-3
                      hover:border-orange-500/30 hover:bg-[#111] transition-all duration-150">
                    {b.coverImage ? (
                      <img src={b.coverImage} alt={b.title} loading="lazy"
                        className="w-20 h-14 sm:w-24 sm:h-16 object-cover rounded-lg flex-shrink-0
                          group-hover:opacity-90 transition-opacity" />
                    ) : (
                      <div className="w-20 h-14 sm:w-24 sm:h-16 bg-[#1a1a1a] rounded-lg flex-shrink-0
                        flex items-center justify-center text-xl text-gray-700">📰</div>
                    )}
                    <div className="flex flex-col justify-between min-w-0 flex-1">
                      <div>
                        {b.featured && (
                          <span className="inline-block text-[8px] font-black uppercase tracking-widest
                            text-orange-400 bg-orange-500/10 border border-orange-500/20
                            rounded-full px-1.5 py-0.5 mb-1">Featured</span>
                        )}
                        <p className="text-[11px] sm:text-xs font-bold text-white
                          group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                          {b.title}
                        </p>
                        {b.excerpt && (
                          <p className="text-[10px] text-gray-600 leading-relaxed mt-1 line-clamp-2">{b.excerpt}</p>
                        )}
                      </div>
                      <p className="text-[9px] text-gray-700 mt-1.5">{fmtDate(b.createdAt)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ── SEO Content Blocks ── */}
          <div className="space-y-4 pt-4">
            {[
              {
                title: "Odia Box Office Collection — All Years | Ollywood Trade Report",
                body:  `Ollypedia is Odisha's most trusted box office tracking platform for Odia (Ollywood) cinema. We publish accurate, day-wise net and gross collection figures for every major Odia film release — from ${availableYears[availableYears.length - 1]} to ${availableYears[0]}. Whether you follow the first-day opening, weekend trends, or total lifetime earnings, our box office section covers it all — updated daily with verified trade estimates.`,
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

            {/* Top 5 all-time SEO block */}
            {allTimeTop5.length > 0 && (
              <div className="p-4 sm:p-5 bg-[#0f0f0f] border border-[#1c1c1c] rounded-xl">
                <h2 className="text-xs sm:text-sm font-bold text-white mb-2">
                  Top Earning Odia Movies — All Time
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Based on total net collection tracked on Ollypedia, the highest-grossing Odia films of all time are{" "}
                  <strong className="text-gray-300">{allTimeTop5.map((m: any) => m.title).join(", ")}</strong>. These films
                  represent the benchmark for Ollywood box office success and are regularly cited in trade reports across Odisha.
                </p>
                <div className="flex flex-wrap gap-2">
                  {allTimeTop5.map((m: any) => (
                    <Link key={m._id} href={`/box-office/${movieSlug(m)}`}
                      className="text-[10px] text-yellow-400 hover:text-yellow-300 border border-yellow-500/20
                        bg-yellow-500/5 hover:bg-yellow-500/10 rounded-full px-2.5 py-1 transition-colors">
                      {m.title} ({m.year}) — {fmtINR(m.totalNet)}
                    </Link>
                  ))}
                </div>
              </div>
            )}

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
                    q: "How many Odia movies does Ollypedia track?",
                    a: `Ollypedia is currently tracking ${enriched.length} Odia films with box office data across ${availableYears.length} years (${availableYears[availableYears.length - 1]}–${availableYears[0]}). New releases are added as they hit theatres.`,
                  },
                  {
                    q: "Can I browse Odia box office by year?",
                    a: `Yes! Use the year tabs at the top of the page to browse collections for any year from ${availableYears[availableYears.length - 1]} to ${availableYears[0]}. Each year view shows month-wise release data and verdicts.`,
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

          {/* ── Internal Link Footer ── */}
          <nav aria-label="Explore more on Ollypedia"
            className="border-t border-[#1c1c1c] pt-5 mt-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">
              Explore Ollypedia
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { href: "/box-office",               label: "Box Office Home",     desc: "All Odia movie collections" },
                { href: "/blog",                     label: "Odia Cinema News",    desc: "Latest Ollywood updates" },
                { href: "/blog?category=Box+Office", label: "Box Office Reports",  desc: "Day-wise collection blogs" },
                { href: "/",                         label: "Ollypedia Home",       desc: "Odisha's cinema database" },
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

            {/* Year archive links — SEO internal links */}
            {availableYears.length > 1 && (
              <div className="mt-3 pt-3 border-t border-[#141414]">
                <p className="text-[10px] font-bold text-gray-700 uppercase tracking-widest mb-2">
                  Box Office by Year
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {availableYears.map((yr) => (
                    <Link key={yr}
                      href={yr === currentYear ? "/box-office" : `/box-office?year=${yr}`}
                      className="text-[10px] text-gray-500 hover:text-orange-400 border border-[#1a1a1a]
                        hover:border-orange-500/20 bg-[#0d0d0d] rounded-full px-2.5 py-1 transition-colors">
                      Odia Box Office {yr}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </nav>

        </div>
      </div>
    </>
  );
}