"use client";
// app/box-office/[slug]/BoxOfficeClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
//  Box Office Client — interactive UI (NEW FILE, no existing code modified)
//  Consistent with Ollypedia's dark design system (orange-500 / #0a0a0a)
// ─────────────────────────────────────────────────────────────────────────────

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, Calendar, IndianRupee, BarChart3, ChevronDown, ChevronUp, Film } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BoxOfficeDay {
  day:   number;
  net:   string;
  gross: string;
  date?: string;
  note?: string;
}

interface Movie {
  _id:         string;
  title:       string;
  slug:        string;
  posterUrl?:  string;
  bannerUrl?:  string;
  releaseDate?: string;
  language?:   string;
  director?:   string;
  verdict?:    string;
  budget?:     string;
  genre?:      string[];
  cast?:       { name: string; type: string }[];
}

interface Props {
  movie:       Movie;
  initialDays: BoxOfficeDay[];
  totalNet:    number;
  totalGross:  number;
  verdict:     string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtINR(val: unknown): string {
  const n = parseFloat(String(val || "").replace(/[^0-9.]/g, ""));
  if (isNaN(n) || n === 0) return String(val || "—");
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

const VERDICT_META: Record<string, { color: string; bg: string; icon: string }> = {
  Blockbuster: { color: "#4caf82", bg: "rgba(76,175,130,0.12)",  icon: "🏆" },
  "Super Hit": { color: "#4caf82", bg: "rgba(76,175,130,0.10)",  icon: "🔥" },
  Hit:         { color: "#7ec8a0", bg: "rgba(126,200,160,0.10)", icon: "✅" },
  Average:     { color: "#c9973a", bg: "rgba(201,151,58,0.10)",  icon: "📊" },
  Flop:        { color: "#e87a6a", bg: "rgba(232,122,106,0.10)", icon: "📉" },
  Disaster:    { color: "#e05555", bg: "rgba(224,85,85,0.10)",   icon: "💥" },
  Pending:     { color: "#888",    bg: "rgba(136,136,136,0.08)", icon: "⏳" },
};

function VerdictBadge({ verdict }: { verdict: string }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.Pending;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide"
      style={{ color: meta.color, background: meta.bg, border: `1px solid ${meta.color}44` }}
    >
      {meta.icon} {verdict}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoxOfficeClient({ movie, initialDays, totalNet, totalGross, verdict }: Props) {
  const [showAll, setShowAll] = useState(false);
  const days       = initialDays;
  const visibleDays= showAll ? days : days.slice(0, 7);
  const verdictMeta= VERDICT_META[verdict] || VERDICT_META.Pending;

  // Bar chart max
  const maxNet = Math.max(...days.map((d) => parseFloat(String(d.net || "0").replace(/[^0-9.]/g, "")) || 0), 1);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
        {(movie.bannerUrl || movie.posterUrl) && (
          <>
            <img
              src={movie.bannerUrl || movie.posterUrl}
              alt={movie.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: 0.18 }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/60 to-[#0a0a0a]" />
          </>
        )}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
            <span>/</span>
            <Link href="/movies" className="hover:text-orange-400 transition-colors">Movies</Link>
            <span>/</span>
            <span className="text-gray-400">Box Office</span>
          </div>

          <div className="flex gap-6 items-start">
            {/* Poster */}
            {movie.posterUrl && (
              <div className="hidden sm:block flex-shrink-0">
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-24 h-32 object-cover rounded-lg shadow-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {/* Title block */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 text-orange-400 text-xs font-bold uppercase tracking-widest">
                <BarChart3 className="w-3.5 h-3.5" />
                Box Office Collection
              </div>
              <h1 className="text-3xl sm:text-4xl font-black leading-tight mb-3 text-white">
                {movie.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400 mb-4">
                {movie.releaseDate && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                )}
                {movie.language && <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs">{movie.language}</span>}
                {movie.director && <span className="text-xs">Dir. {movie.director}</span>}
              </div>
              {verdict !== "Pending" && <VerdictBadge verdict={verdict} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Net", value: fmtINR(totalNet),   icon: <IndianRupee className="w-4 h-4" />, color: "#f97316" },
            { label: "Total Gross", value: fmtINR(totalGross), icon: <TrendingUp  className="w-4 h-4" />, color: "#7ec8e3" },
            { label: "Days Tracked", value: days.length || "—",  icon: <Calendar    className="w-4 h-4" />, color: "#a78bfa" },
            { label: "Verdict",      value: verdict,             icon: <Film        className="w-4 h-4" />, color: verdictMeta.color },
          ].map(({ label, value, icon, color }) => (
            <div
              key={label}
              className="rounded-xl p-4 border"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: `${color}22` }}
            >
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: color + "99" }}>
                <span style={{ color }}>{icon}</span>
                {label}
              </div>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">

        {/* ── No data state ── */}
        {days.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-semibold text-gray-400 mb-2">Collection data coming soon</p>
            <p className="text-sm">Check back after the movie releases for day-wise box office figures.</p>
          </div>
        )}

        {days.length > 0 && (
          <>
            {/* ── Bar Chart visual ── */}
            <section>
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                Day-wise Net Collection
              </h2>
              <div className="bg-[#111] rounded-xl border border-[#1f1f1f] p-5 overflow-x-auto">
                <div className="flex items-end gap-2" style={{ minWidth: days.length * 52, height: 140 }}>
                  {days.map((d) => {
                    const net = parseFloat(String(d.net || "0").replace(/[^0-9.]/g, "")) || 0;
                    const pct = Math.max(4, (net / maxNet) * 100);
                    return (
                      <div key={d.day} className="flex flex-col items-center gap-1" style={{ flex: 1, minWidth: 40 }}>
                        <div
                          className="w-full rounded-t-md relative group"
                          style={{
                            height:     `${pct}%`,
                            background: "linear-gradient(to top, #f97316, #fb923c)",
                            minHeight:  6,
                            transition: "opacity 0.2s",
                          }}
                        >
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md px-2 py-0.5 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            {fmtINR(d.net)}
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 font-semibold">D{d.day}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ── Day-wise Table ── */}
            <section>
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-400" />
                Day-wise Box Office Collection
              </h2>

              <div className="rounded-xl border border-[#1f1f1f] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#1f1f1f] bg-[#111]">
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Day</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-orange-500/70 uppercase tracking-wider">Net Collection</th>
                        <th className="px-5 py-3 text-left text-xs font-bold text-sky-400/70 uppercase tracking-wider">Gross Collection</th>
                        {days.some((d) => d.note) && (
                          <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleDays.map((d, i) => (
                        <tr
                          key={d.day}
                          className="border-b border-[#1a1a1a] transition-colors hover:bg-orange-500/5"
                          style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}
                        >
                          <td className="px-5 py-3.5 font-bold text-orange-400">Day {d.day}</td>
                          <td className="px-5 py-3.5 text-gray-400 text-xs">{d.date || "—"}</td>
                          <td className="px-5 py-3.5 font-semibold text-white">{fmtINR(d.net)}</td>
                          <td className="px-5 py-3.5 font-semibold text-sky-300">{fmtINR(d.gross)}</td>
                          {days.some((x) => x.note) && (
                            <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs truncate">{d.note || "—"}</td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#2a2a2a] bg-orange-500/5">
                        <td colSpan={2} className="px-5 py-3.5 text-xs font-black text-orange-400 uppercase tracking-wider">
                          Total ({days.length} days)
                        </td>
                        <td className="px-5 py-3.5 font-black text-orange-400 text-base">{fmtINR(totalNet)}</td>
                        <td className="px-5 py-3.5 font-black text-sky-300 text-base">{fmtINR(totalGross)}</td>
                        {days.some((x) => x.note) && <td />}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {days.length > 7 && (
                  <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d]">
                    <button
                      onClick={() => setShowAll((p) => !p)}
                      className="flex items-center gap-1.5 text-orange-400 text-sm font-semibold hover:text-orange-300 transition-colors"
                    >
                      {showAll ? (
                        <><ChevronUp className="w-4 h-4" /> Show fewer days</>
                      ) : (
                        <><ChevronDown className="w-4 h-4" /> Show all {days.length} days</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* ── Analysis Card ── */}
            <section>
              <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-400" />
                Hit or Flop Analysis
              </h2>
              <div
                className="rounded-xl border p-5"
                style={{ borderColor: verdictMeta.color + "33", background: verdictMeta.bg }}
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Current Verdict</div>
                    <VerdictBadge verdict={verdict} />
                  </div>
                  {movie.budget && (
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Production Budget</div>
                      <div className="text-sm font-bold text-white">{movie.budget}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Net ROI</div>
                    <div className="text-sm font-bold" style={{ color: verdictMeta.color }}>{fmtINR(totalNet)}</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-300 leading-relaxed">
                  Based on {days.length} day{days.length !== 1 ? "s" : ""} of theatrical performance,{" "}
                  <strong className="text-white">{movie.title}</strong> has collected{" "}
                  <strong style={{ color: verdictMeta.color }}>{fmtINR(totalNet)}</strong> net and{" "}
                  <strong className="text-sky-300">{fmtINR(totalGross)}</strong> gross at the box office.{" "}
                  {verdict !== "Pending"
                    ? `The film is currently trending as a ${verdict} at the Odia cinema box office.`
                    : "Collection figures are being updated. Refresh for the latest numbers."}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  * Figures are approximate industry estimates. Last updated based on available data. Source: Ollypedia Box Office Tracker.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}