// app/box-office/page.tsx
// Box Office listing — sorted by total net, no auto-calculated verdict

import type { Metadata } from "next";
import Link              from "next/link";
import { connectDB }     from "@/lib/db";
import Movie             from "@/models/Movie";

export const revalidate = 1800;

export const metadata: Metadata = {
  title:       "Odia Box Office Collection 2026 | Ollypedia",
  description: "Complete Odia (Ollywood) box office collection report. Day-wise net and gross earnings for all latest Odia movies — updated daily on Ollypedia.",
  alternates:  { canonical: "https://ollypedia.in/box-office" },
  robots:      { index: true, follow: true },
  keywords:    ["Odia box office", "Ollywood collection", "Odia movie collection", "Odia cinema box office 2026"],
  openGraph: {
    title:       "Odia Box Office Collection | Ollypedia",
    description: "Track day-wise Odia cinema box office collection. Net and gross earnings updated daily.",
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
  if (!n) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

async function getBoxOfficeMovies() {
  await connectDB();
  const movies = await (Movie as any)
    .find(
      { "boxOfficeDays.0": { $exists: true } },
      "title slug posterUrl thumbnailUrl releaseDate language verdict boxOfficeDays updatedAt"
    )
    .sort({ updatedAt: -1 })
    .lean();
  return JSON.parse(JSON.stringify(movies));
}

export default async function BoxOfficePage() {
  const movies = await getBoxOfficeMovies();

  const enriched = movies
    .map((m: any) => {
      const days       = (m.boxOfficeDays || []).sort((a: any, b: any) => a.day - b.day);
      const totalNet   = days.reduce((s: number, d: any) => s + parseNum(d.net),   0);
      const totalGross = days.reduce((s: number, d: any) => s + parseNum(d.gross), 0);
      const lastDay    = days[days.length - 1]?.day || 0;
      return { ...m, days, totalNet, totalGross, lastDay };
    })
    .sort((a: any, b: any) => b.totalNet - a.totalNet);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type":    "CollectionPage",
    "name":     "Odia Box Office Collection | Ollypedia",
    "description": "Complete day-wise box office collection for Odia (Ollywood) movies. Updated daily.",
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
            <>
              <div className="space-y-3">
                {enriched.map((m: any, idx: number) => {
                  const movieSlug = m.slug || String(m.title || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                  // Use stored verdict only — never auto-calculate
                  const storedVerdict = m.verdict && m.verdict !== "Upcoming" ? m.verdict : null;

                  return (
                    <Link
                      key={m._id}
                      href={`/box-office/${movieSlug}`}
                      className="flex items-center gap-4 bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-orange-500/30 transition-all group"
                    >
                      {/* Rank */}
                      <div className="w-7 text-center text-base font-black text-gray-600 flex-shrink-0">
                        {idx + 1}
                      </div>

                      {/* Poster */}
                      {(m.posterUrl || m.thumbnailUrl) ? (
                        <img
                          src={m.posterUrl || m.thumbnailUrl}
                          alt={m.title}
                          className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                          style={{ boxShadow: "0 2px 10px rgba(0,0,0,0.5)" }}
                        />
                      ) : (
                        <div className="w-10 h-14 bg-[#1a1a1a] rounded-lg flex items-center justify-center flex-shrink-0 text-lg">🎬</div>
                      )}

                      {/* Title + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white group-hover:text-orange-400 transition-colors truncate text-sm">
                          {m.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          {m.releaseDate && <span>{new Date(m.releaseDate).getFullYear()}</span>}
                          {m.language && <span>· {m.language}</span>}
                          {m.lastDay > 0 && <span>· {m.lastDay} day{m.lastDay !== 1 ? "s" : ""}</span>}
                        </div>
                      </div>

                      {/* Net */}
                      <div className="text-right hidden sm:block flex-shrink-0">
                        <div className="text-xs text-gray-500 mb-0.5">Net</div>
                        <div className="font-bold text-orange-400 text-sm">{fmtINR(m.totalNet)}</div>
                      </div>

                      {/* Gross */}
                      <div className="text-right hidden md:block flex-shrink-0">
                        <div className="text-xs text-gray-500 mb-0.5">Gross</div>
                        <div className="font-bold text-sky-300 text-sm">{fmtINR(m.totalGross)}</div>
                      </div>

                      {/* Stored verdict only */}
                      {storedVerdict && (
                        <div className="flex-shrink-0">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/6 border border-white/10 text-gray-300">
                            {storedVerdict}
                          </span>
                        </div>
                      )}

                      <div className="flex-shrink-0 text-gray-600 group-hover:text-orange-400 transition-colors text-xs">→</div>
                    </Link>
                  );
                })}
              </div>

              {/* SEO content block */}
              <div className="mt-12 p-6 bg-[#111] border border-[#1f1f1f] rounded-xl">
                <h2 className="text-base font-bold text-white mb-3">Odia Box Office Collection 2026</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Ollypedia tracks day-wise box office collection for all Odia (Ollywood) movies. 
                  Our box office section covers net collection, gross collection, and day-wise performance 
                  of films from the Odia film industry. Data is sourced from industry estimates and 
                  updated regularly to give fans and trade followers the most accurate figures available 
                  for Odia cinema collections.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}