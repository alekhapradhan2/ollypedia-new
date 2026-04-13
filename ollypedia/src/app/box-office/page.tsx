// app/box-office/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
//  Box Office listing page  —  NEW FILE
//  Route: /box-office
//  Shows all movies that have box office data, sorted by collection
// ─────────────────────────────────────────────────────────────────────────────

import type { Metadata } from "next";
import Link              from "next/link";
import { connectDB }     from "@/lib/db";
import Movie             from "@/models/Movie";

export const revalidate = 1800;

export const metadata: Metadata = {
  title:       "Odia Box Office Collection 2025 | Ollypedia",
  description: "Complete Odia (Ollywood) box office collection report. Day-wise net and gross earnings, hit or flop verdict for all latest Odia movies.",
  alternates:  { canonical: "https://ollypedia.in/box-office" },
  robots:      { index: true, follow: true },
  openGraph: {
    title:       "Odia Box Office Collection | Ollypedia",
    description: "Track day-wise Odia cinema box office collection. Hit, Flop & Blockbuster verdicts updated daily.",
    url:         "https://ollypedia.in/box-office",
    siteName:    "Ollypedia",
    type:        "website",
  },
};

function parseNum(s: unknown): number {
  const v = parseFloat(String(s || "").replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
}

function fmtINR(n: number): string {
  if (!n) return "TBA";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function getVerdict(totalNet: number, budget?: string): string {
  if (!totalNet) return "Pending";
  const b = parseNum(budget);
  if (b > 0) {
    const r = totalNet / b;
    if (r >= 3) return "Blockbuster";
    if (r >= 2) return "Super Hit";
    if (r >= 1.2) return "Hit";
    if (r >= 0.8) return "Average";
    return "Flop";
  }
  if (totalNet > 5_00_00_000) return "Blockbuster";
  if (totalNet > 2_00_00_000) return "Super Hit";
  if (totalNet > 1_00_00_000) return "Hit";
  if (totalNet > 50_00_000)   return "Average";
  return "Flop";
}

const VERDICT_COLORS: Record<string, string> = {
  Blockbuster: "#4caf82",
  "Super Hit": "#4caf82",
  Hit:         "#7ec8a0",
  Average:     "#c9973a",
  Flop:        "#e87a6a",
  Disaster:    "#e05555",
  Pending:     "#666",
};

async function getBoxOfficeMovies() {
  await connectDB();
  const movies = await (Movie as any)
    .find(
      { "boxOfficeDays.0": { $exists: true } },
      "title slug posterUrl bannerUrl releaseDate language verdict budget boxOfficeDays"
    )
    .sort({ updatedAt: -1 })
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

export default async function BoxOfficePage() {
  const movies = await getBoxOfficeMovies();

  const enriched = movies.map((m: any) => {
    const days      = (m.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
    const totalNet  = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
    const totalGross= days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
    const lastDay   = days[days.length - 1]?.day || 0;
    const verdict   = getVerdict(totalNet, m.budget);
    return { ...m, days, totalNet, totalGross, lastDay, verdict };
  });

  // Sort by totalNet descending
  enriched.sort((a: any, b: any) => b.totalNet - a.totalNet);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type":    "CollectionPage",
    "name":     "Odia Box Office Collection | Ollypedia",
    "description": "Complete day-wise box office collection for Odia (Ollywood) movies.",
    "url":      "https://ollypedia.in/box-office",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-screen bg-[#0a0a0a] text-white">
        {/* Header */}
        <div className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
              <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-gray-400">Box Office</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              Odia Box Office Collection
            </h1>
            <p className="text-gray-400 text-sm max-w-xl">
              Day-wise net and gross earnings for Odia (Ollywood) movies. Updated daily with verified figures.
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {enriched.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              <p className="text-lg">No box office data available yet.</p>
              <p className="text-sm mt-2">Check back soon for collection reports.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {enriched.map((m: any, idx: number) => {
                const vc = VERDICT_COLORS[m.verdict] || "#666";
                const slug = m.slug || String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                return (
                  <Link
                    key={m._id}
                    href={`/box-office/${slug}`}
                    className="flex items-center gap-5 bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-orange-500/30 transition-all group"
                  >
                    {/* Rank */}
                    <div className="w-8 text-center text-lg font-black text-gray-600 flex-shrink-0">
                      {idx + 1}
                    </div>

                    {/* Poster */}
                    {(m.posterUrl || m.thumbnailUrl) ? (
                      <img
                        src={m.posterUrl || m.thumbnailUrl}
                        alt={m.title}
                        className="w-12 h-16 object-cover rounded-lg flex-shrink-0"
                        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.6)" }}
                      />
                    ) : (
                      <div className="w-12 h-16 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0 text-xl">🎬</div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                        {m.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA"}
                        {m.language ? ` · ${m.language}` : ""}
                        {m.lastDay ? ` · ${m.lastDay} days` : ""}
                      </div>
                    </div>

                    {/* Net */}
                    <div className="text-right hidden sm:block flex-shrink-0">
                      <div className="text-xs text-gray-500 mb-0.5">Net</div>
                      <div className="font-bold text-orange-400">{fmtINR(m.totalNet)}</div>
                    </div>

                    {/* Gross */}
                    <div className="text-right hidden md:block flex-shrink-0">
                      <div className="text-xs text-gray-500 mb-0.5">Gross</div>
                      <div className="font-bold text-sky-300">{fmtINR(m.totalGross)}</div>
                    </div>

                    {/* Verdict */}
                    <div className="flex-shrink-0">
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ color: vc, background: vc + "18", border: `1px solid ${vc}33` }}
                      >
                        {m.verdict}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}