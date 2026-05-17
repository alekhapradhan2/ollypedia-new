// app/box-office/page.tsx
// Box Office listing — sorted by release date (newest first)

import type { Metadata } from "next";
import Link              from "next/link";
import { connectDB }     from "@/lib/db";
import Movie             from "@/models/Movie";

export const revalidate = 1800;

export const metadata: Metadata = {
  title:       "Odia Box Office Collection 2026 | Ollypedia",
  description: "Complete Odia (Ollywood) box office collection report 2026. Day-wise net and gross earnings for all latest Odia movies — updated daily on Ollypedia.",
  alternates:  { canonical: "https://ollypedia.in/box-office" },
  robots:      { index: true, follow: true },
  keywords:    [
    "Odia box office", "Ollywood collection", "Odia movie collection 2026",
    "Odia cinema box office", "Ollywood box office 2026", "Odia film earnings",
    "Ollywood hit flop verdict", "Odia movie first day collection",
  ],
  openGraph: {
    title:       "Odia Box Office Collection 2026 | Ollypedia",
    description: "Track day-wise Odia cinema box office collection. Net and gross earnings updated daily.",
    url:         "https://ollypedia.in/box-office",
    siteName:    "Ollypedia",
    type:        "website",
  },
};

/* ─── Helpers ─────────────────────────────────────────────── */

function parseNum(s: unknown): number {
  const v = parseFloat(String(s || "").replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
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

/* ─── Page ──────────────────────────────────────────────────── */

export default async function BoxOfficePage() {
  const movies = await getBoxOfficeMovies();

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

  const jsonLd = {
    "@context":  "https://schema.org",
    "@type":     "CollectionPage",
    "name":      "Odia Box Office Collection 2026 | Ollypedia",
    "description": "Complete day-wise box office collection for Odia (Ollywood) movies. Updated daily.",
    "url":       "https://ollypedia.in/box-office",
    "publisher": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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

          {/* ── Full List ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                📋 All Releases
              </span>
              <span className="text-[10px] text-gray-600">— sorted by release date</span>
            </div>

            {/* Desktop column headers */}
            <div className="hidden sm:flex items-center gap-2 px-2 pb-2 mb-0.5
              border-b border-[#1c1c1c]
              text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              <span className="w-6 text-center">#</span>
              <span className="w-9" />
              <span className="flex-1">Movie</span>
              <span className="w-28 text-left">Released</span>
              <span className="w-20 text-right">Net</span>
              <span className="w-20 text-right hidden md:block">Gross</span>
              <span className="w-24 text-right">Verdict</span>
              <span className="w-4" />
            </div>

            <div className="divide-y divide-[#141414]">
              {enriched.map((m: any, idx: number) => {
                const slug          = movieSlug(m);
                const storedVerdict = isValidVerdict(m.verdict) ? m.verdict : null;
                const vColor        = storedVerdict ? verdictColor(storedVerdict) : "";
                const relDate       = fmtDate(m.releaseDate);
                const isNew         = now - dateTs(m.releaseDate) <= oneWeek;

                return (
                  <Link
                    key={m._id}
                    href={`/box-office/${slug}`}
                    className="group flex items-center gap-2 sm:gap-3 py-2.5 px-2 rounded-lg
                      hover:bg-white/[0.03] transition-colors duration-100"
                  >
                    {/* Rank */}
                    <span className="w-6 text-center text-xs font-black text-gray-700
                      group-hover:text-orange-500 transition-colors flex-shrink-0">
                      {idx + 1}
                    </span>

                    {/* Poster */}
                    <div className="flex-shrink-0">
                      {(m.posterUrl || m.thumbnailUrl) ? (
                        <img
                          src={m.posterUrl || m.thumbnailUrl}
                          alt={m.title}
                          loading="lazy"
                          className="w-8 h-11 sm:w-9 sm:h-[52px] object-cover rounded-md shadow-md"
                        />
                      ) : (
                        <div className="w-8 h-11 sm:w-9 sm:h-[52px] bg-[#1a1a1a] rounded-md
                          flex items-center justify-center text-sm text-gray-700">🎬</div>
                      )}
                    </div>

                    {/* Title block */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-semibold text-white group-hover:text-orange-400
                          transition-colors truncate text-xs sm:text-sm leading-snug">
                          {m.title}
                        </p>
                        {isNew && (
                          <span className="flex-shrink-0 text-[8px] font-black uppercase
                            tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20
                            rounded-full px-1.5 py-0.5 hidden sm:inline">
                            New
                          </span>
                        )}
                      </div>

                      {/* Mobile row */}
                      <div className="sm:hidden flex items-center gap-2 mt-1 flex-wrap">
                        {relDate !== "—" && (
                          <span className="text-[10px] text-gray-500">{relDate}</span>
                        )}
                        {m.totalNet > 0 && (
                          <span className="text-[10px] font-bold text-orange-400">
                            {fmtINR(m.totalNet)}
                          </span>
                        )}
                        {storedVerdict && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${vColor}`}>
                            {storedVerdict}
                          </span>
                        )}
                      </div>

                      {/* Desktop sub-row */}
                      <div className="hidden sm:flex items-center gap-1 mt-0.5 text-[10px] text-gray-600">
                        {m.language && <span>{m.language}</span>}
                        {m.lastDay > 0 && <span>· {m.lastDay}d</span>}
                      </div>
                    </div>

                    {/* Release date — sm+ */}
                    <div className="hidden sm:block w-28 flex-shrink-0">
                      <span className="text-xs text-gray-400 whitespace-nowrap">{relDate}</span>
                    </div>

                    {/* Net — sm+ */}
                    <div className="hidden sm:block w-20 text-right flex-shrink-0">
                      <span className="font-bold text-orange-400 text-sm">{fmtINR(m.totalNet)}</span>
                    </div>

                    {/* Gross — md+ */}
                    <div className="hidden md:block w-20 text-right flex-shrink-0">
                      <span className="font-bold text-sky-300 text-sm">{fmtINR(m.totalGross)}</span>
                    </div>

                    {/* Verdict — sm+ */}
                    <div className="hidden sm:flex w-24 justify-end flex-shrink-0">
                      {storedVerdict && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${vColor}`}>
                          {storedVerdict}
                        </span>
                      )}
                    </div>

                    {/* Arrow */}
                    <span className="w-4 text-right text-gray-700 group-hover:text-orange-400
                      transition-colors text-xs flex-shrink-0">→</span>
                  </Link>
                );
              })}
            </div>
          </div>

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
                ].map(({ q, a }) => (
                  <div key={q} className="border-t border-[#1c1c1c] pt-3 first:border-0 first:pt-0">
                    <p className="text-xs font-semibold text-gray-200 mb-1">{q}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}