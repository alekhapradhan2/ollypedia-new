"use client";
// app/box-office/[slug]/BoxOfficeClient.tsx
// ★ UPDATED: Full inter-linking sidebar with related blogs, songs, movie page.
//            Right sidebar shows all box-office days + related content.
//            Strong SEO cross-links on every section.

import Link from "next/link";
import { useState } from "react";
import { TrendingUp, Calendar, IndianRupee, BarChart3, ChevronDown, ChevronUp, Film, Music, BookOpen, ExternalLink } from "lucide-react";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { formatReleaseDate } from "@/lib/dateUtils";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

// ─── Types ───────────────────────────────────────────────────────────────────

interface BoxOfficeDay {
  day:        number;
  net:        number | string;
  gross:      number | string;
  date?:      string;
  note?:      string;
  screens?:   number;
  occupancy?: string;
}

interface Song {
  title?:        string;
  singer?:       string;
  musicDirector?: string;
  ytId?:         string;
  thumbnailUrl?: string;
}

interface BlogPost {
  _id:        string;
  title:      string;
  slug:       string;
  excerpt?:   string;
  coverImage?: string;
  category?:  string;
  createdAt?: string;
}

interface Movie {
  _id:          string;
  title:        string;
  slug:         string;
  posterUrl?:   string;
  bannerUrl?:   string;
  releaseDate?: string;
  language?:    string;
  director?:    string;
  verdict?:     string;
  budget?:      string;
  genre?:       string[];
  cast?:        { name: string; type: string; role?: string }[];
  synopsis?:    string;
  media?:       { songs?: Song[] };
  isReRelease?: boolean;
  reReleaseDate?: string;
  reReleaseBoxOfficeDays?: BoxOfficeDay[];
}

interface CompetingMovie {
  _id:          string;
  title:        string;
  slug:         string;
  posterUrl?:   string;
  releaseDate?: string;
  verdict?:     string;
  boxOfficeDays?: { net: number | string }[];
}

interface Props {
  movie:            Movie;
  initialDays:      BoxOfficeDay[];
  totalNet:         number;
  totalGross:       number;
  updatedAt?:       string;
  relatedBlogs?:    BlogPost[];
  competingMovies?: CompetingMovie[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * parseN — converts any currency string to raw rupees (integer).
 *   "₹7.00 L"  → 700000
 *   "7L"       → 700000
 *   "0.1 Cr"   → 1000000
 *   "3.36Cr"   → 33600000
 *   "700000"   → 700000   (bare integer ≥ 1000 trusted as rupees)
 *   "7"        → 0        (bare tiny number with no unit = corrupted)
 */
function parseN(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const s = String(val).replace(/[₹,\s]/g, "").toLowerCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.includes("cr") || s.includes("crore")) return Math.round(n * 1_00_00_000);
  if (s.includes("l") || s.includes("lakh"))   return Math.round(n * 1_00_000);
  if (n >= 1000) return Math.round(n);
  return 0;
}

function fmtINR(val: unknown): string {
  const n = parseN(val);
  if (!n) return String(val || "—");
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(d?: string, precision?: string) {
  if (!d) return "—";
  return formatReleaseDate(d, precision, "short") || "—";
}

function toSongSlug(str?: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
}

function buildPerformanceSummary(movie: Movie, days: BoxOfficeDay[], totalNet: number, totalGross: number, isReRelease: boolean = false): string {
  const title     = isReRelease ? `The re-release of ${movie.title}` : movie.title;
  const dayCount  = days.length;
  const netFmt    = fmtINR(totalNet);
  const grossFmt  = fmtINR(totalGross);
  const day1      = days[0];
  const latest    = days[days.length - 1];
  const day1Net   = day1 ? parseN(day1.net) : 0;
  const latestNet = latest ? parseN(latest.net) : 0;
  const trend     = dayCount > 1 ? (latestNet >= day1Net * 0.6 ? "holding steady" : "following a natural decline") : "";
  const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";

  let para = `${title}${releaseYear ? ` (${releaseYear})` : ""} has collected ${netFmt} net and ${grossFmt} gross at the Odia (Ollywood) box office`;
  para += dayCount === 1 ? ` on its opening day.` : ` across ${dayCount} days of its theatrical run.`;
  if (day1Net) {
    para += ` The film opened with ${fmtINR(day1Net)} net on Day 1`;
    para += dayCount > 1 && trend ? ` and has been ${trend} in subsequent days.` : `.`;
  }
  if (movie.budget) {
    para += ` Produced on a budget of ${movie.budget}, the film's box office journey is being closely tracked by Ollywood enthusiasts.`;
  }
  return para;
}

// ─── Data Disclaimer Note ────────────────────────────────────────────────────

function BoxOfficeDisclaimer() {
  return (
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
  );
}

// ─── Sidebar: All Days Mini Table ────────────────────────────────────────────

function AllDaysSidebar({ days, movie }: { days: BoxOfficeDay[]; movie: Movie }) {
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
        <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block flex-shrink-0" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">All Days Collection</span>
      </div>
      <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
        {days.map((d, i) => {
          const net  = parseN(d.net);
          const maxN = Math.max(...days.map(x => parseN(x.net)), 1);
          const pct  = Math.max(4, (net / maxN) * 100);
          return (
            <div key={d.day} className="px-4 py-2.5 border-b border-[#141414] last:border-0 hover:bg-[#141414] transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-orange-400">Day {d.day}</span>
                <span className="text-xs font-semibold text-white">{fmtINR(d.net)}</span>
              </div>
              <div className="w-full bg-[#1a1a1a] rounded-full h-1">
                <div className="h-1 rounded-full bg-orange-500/70" style={{ width: `${pct}%` }} />
              </div>
              {d.date && <div className="text-[10px] text-gray-600 mt-0.5">{d.date}</div>}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 bg-orange-500/5 border-t border-[#1a1a1a] flex justify-between">
        <span className="text-xs font-black text-orange-400 uppercase">Total ({days.length}d)</span>
        <span className="text-xs font-black text-orange-400">{fmtINR(days.reduce((s, d) => s + parseN(d.net), 0))}</span>
      </div>
    </div>
  );
}

// ─── Sidebar: Related Blogs ───────────────────────────────────────────────────

function RelatedBlogsSidebar({ blogs, movieTitle }: { blogs: BlogPost[]; movieTitle: string }) {
  if (!blogs.length) return null;
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
        <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block flex-shrink-0" />
        <BookOpen className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Articles & Reviews</span>
      </div>
      <div>
        {blogs.map((b) => (
          <Link key={b._id} href={`/blog/${b.slug}`}
            className="flex items-start gap-3 px-4 py-3 border-b border-[#141414] last:border-0 hover:bg-[#141414] transition-colors group">
            {b.coverImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.coverImage} alt={b.title}
                className="w-14 h-9 object-cover rounded flex-shrink-0 border border-[#222]" />
            ) : (
              <div className="w-14 h-9 flex-shrink-0 bg-[#1a1a1a] rounded border border-[#222] flex items-center justify-center text-base">📝</div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">{b.title}</p>
              {b.category && <p className="text-[10px] text-gray-600 mt-0.5">{b.category}</p>}
            </div>
          </Link>
        ))}
      </div>
      <div className="px-4 py-2.5 border-t border-[#1a1a1a]">
        <Link href={`/blog?movie=${encodeURIComponent(movieTitle)}`}
          className="text-xs text-orange-400/60 hover:text-orange-400 transition-colors">
          View all {movieTitle} articles →
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar: Songs ───────────────────────────────────────────────────────────

function SongsSidebar({ songs, movieSlug, movieTitle }: { songs: Song[]; movieSlug: string; movieTitle: string }) {
  if (!songs.length) return null;
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
        <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block flex-shrink-0" />
        <Music className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Songs from {movieTitle}</span>
      </div>
      <div>
        {songs.slice(0, 6).map((s, i) => {
          const thumb = s.ytId ? `https://img.youtube.com/vi/${s.ytId}/default.jpg` : s.thumbnailUrl;
          const slug  = toSongSlug(s.title) || String(i);
          return (
            <Link key={i} href={`/songs/${movieSlug}/${i}/${slug}`}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-[#141414] last:border-0 hover:bg-[#141414] transition-colors group">
              {thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt={s.title || ""} className="w-12 h-9 object-cover rounded flex-shrink-0" />
              ) : (
                <div className="w-12 h-9 flex-shrink-0 bg-[#1a1a1a] rounded flex items-center justify-center text-base">♪</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-300 group-hover:text-orange-400 transition-colors truncate">{s.title || "Untitled"}</p>
                {s.singer && <p className="text-[10px] text-gray-600 truncate">🎤 {s.singer}</p>}
              </div>
              <span className="text-orange-500/40 group-hover:text-orange-400 transition-colors text-xs">▶</span>
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-[#1a1a1a]">
        <Link href={`/movie/${movieSlug}#songs`}
          className="text-xs text-orange-400/60 hover:text-orange-400 transition-colors">
          Full soundtrack →
        </Link>
      </div>
    </div>
  );
}

// ─── Sidebar: Quick Links ─────────────────────────────────────────────────────

function QuickLinksSidebar({ movie }: { movie: Movie }) {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  return (
    <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-2">
        <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block flex-shrink-0" />
        <span className="text-xs font-bold text-white uppercase tracking-wider">Explore {movie.title}</span>
      </div>
      <div className="p-3 flex flex-col gap-2">
        <Link href={`/movie/${movie.slug}`}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-orange-500/8 hover:bg-orange-500/15 border border-orange-500/20 hover:border-orange-500/40 rounded-lg transition-all group">
          <Film className="w-4 h-4 text-orange-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-orange-400">{movie.title} — Movie Page</div>
            <div className="text-[10px] text-gray-500">Cast, story, trailer &amp; more</div>
          </div>
          <ExternalLink className="w-3 h-3 text-orange-400/40 group-hover:text-orange-400 ml-auto transition-colors" />
        </Link>

        <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`}
          className="flex items-center gap-2.5 px-3 py-2.5 bg-[#111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-orange-500/20 rounded-lg transition-all group">
          <BookOpen className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-300 group-hover:text-white">{movie.title} Articles</div>
            <div className="text-[10px] text-gray-500">Reviews &amp; blog posts</div>
          </div>
          <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
        </Link>

        {(movie.media?.songs?.length ?? 0) > 0 && (
          <Link href={`/movie/${movie.slug}#songs`}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-[#111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-orange-500/20 rounded-lg transition-all group">
            <Music className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-300 group-hover:text-white">{movie.title} Songs</div>
              <div className="text-[10px] text-gray-500">{movie.media?.songs?.length} track{(movie.media?.songs?.length ?? 0) !== 1 ? "s" : ""} · Full album</div>
            </div>
            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
          </Link>
        )}

        <Link href="/box-office"
          className="flex items-center gap-2.5 px-3 py-2.5 bg-[#111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-orange-500/20 rounded-lg transition-all group">
          <BarChart3 className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-semibold text-gray-300 group-hover:text-white">All Box Office</div>
            <div className="text-[10px] text-gray-500">Odia &amp; Ollywood collections</div>
          </div>
          <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
        </Link>

        {year && (
          <Link href={`/movies/year/${year}`}
            className="flex items-center gap-2.5 px-3 py-2.5 bg-[#111] hover:bg-[#181818] border border-[#1f1f1f] hover:border-orange-500/20 rounded-lg transition-all group">
            <Calendar className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <div>
              <div className="text-xs font-semibold text-gray-300 group-hover:text-white">More Odia Movies {year}</div>
              <div className="text-[10px] text-gray-500">All Ollywood releases {year}</div>
            </div>
            <ExternalLink className="w-3 h-3 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
          </Link>
        )}
      </div>
    </div>
  );
}


// ─── SVG Bar Chart — works for any number of days ────────────────────────────
function BoxOfficeChart({ days, maxNet }: { days: BoxOfficeDay[]; maxNet: number }) {
  const [tooltip, setTooltip] = useState<{ day: number; net: string; x: number; y: number } | null>(null);

  const CHART_H   = 180;  // SVG height px
  const BAR_AREA  = 140;  // usable bar height
  const LABEL_H   = 30;   // space for D1 labels below
  const MIN_BAR_W = 28;   // minimum bar width before scroll kicks in
  const GAP       = 6;    // gap between bars

  // Each bar unit width — grows to fill container, floors at MIN_BAR_W
  const barUnit   = Math.max(MIN_BAR_W, Math.floor(560 / Math.max(days.length, 1)));
  const svgWidth  = days.length * (barUnit + GAP);

  return (
    <div className="w-full overflow-x-auto bg-[#111] rounded-xl border border-[#1f1f1f] p-4 relative">
      <div style={{ minWidth: svgWidth }}>
      <svg
        width={svgWidth}
        height={CHART_H}
        style={{ display: "block", width: "100%" }}
        aria-label="Day-wise box office bar chart"
      >
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <linearGradient id="barGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
        </defs>

        {/* Horizontal guide lines */}
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = (BAR_AREA - frac * BAR_AREA) + 4;
          return (
            <line key={frac} x1={0} y1={y} x2={svgWidth} y2={y}
              stroke="#1f1f1f" strokeWidth={1} strokeDasharray="3 3" />
          );
        })}

        {/* Bars */}
        {days.map((d, i) => {
          const net      = parseN(d.net);
          const barH     = Math.max(6, (net / maxNet) * BAR_AREA);
          const x        = i * (barUnit + GAP);
          const y        = BAR_AREA - barH + 4;
          const isActive = tooltip?.day === d.day;

          return (
            <g key={d.day}
              onMouseEnter={(e) => {
                const rect = (e.currentTarget as SVGGElement).closest("svg")!.getBoundingClientRect();
                const cx   = x + barUnit / 2;
                setTooltip({ day: d.day, net: fmtINR(d.net), x: cx, y: y - 8 });
              }}
              onMouseLeave={() => setTooltip(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Bar */}
              <rect
                x={x} y={y}
                width={barUnit} height={barH}
                rx={4} ry={4}
                fill={isActive ? "url(#barGradHover)" : "url(#barGrad)"}
                opacity={isActive ? 1 : 0.85}
              />
              {/* Day label */}
              <text
                x={x + barUnit / 2}
                y={CHART_H - 6}
                textAnchor="middle"
                fontSize={barUnit > 36 ? 11 : 9}
                fill={isActive ? "#fb923c" : "#6b7280"}
                fontWeight={isActive ? "700" : "600"}
              >
                D{d.day}
              </text>
            </g>
          );
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <rect
              x={Math.min(tooltip.x - 30, svgWidth - 70)}
              y={tooltip.y - 24}
              width={70} height={22}
              rx={4} fill="#1a1a1a" stroke="#2a2a2a" strokeWidth={1}
            />
            <text
              x={Math.min(tooltip.x, svgWidth - 35)}
              y={tooltip.y - 8}
              textAnchor="middle"
              fontSize={11}
              fill="white"
              fontWeight="700"
            >
              {tooltip.net}
            </text>
          </g>
        )}
      </svg>
      </div>
      {days.length > 15 && (
        <p className="text-[10px] text-gray-600 text-center mt-1">← scroll to see all days</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ── Accordion FAQ item ──────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
      >
        <span className="text-sm font-semibold text-white leading-snug">{q}</span>
        <ChevronDown className={`w-4 h-4 text-orange-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1 border-t border-[#1a1a1a]">
          <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}


export default function BoxOfficeClient({ movie, initialDays, totalNet: initialTotalNet, totalGross: initialTotalGross, updatedAt, relatedBlogs = [], competingMovies = [] }: Props) {
  const [activeTrack, setActiveTrack] = useState<"original" | "re-release">("original");
  const [showAll, setShowAll] = useState(false);

  const hasReRelease = movie.reReleaseBoxOfficeDays && movie.reReleaseBoxOfficeDays.length > 0;
  const rrDays = hasReRelease ? [...(movie.reReleaseBoxOfficeDays || [])].sort((a: any, b: any) => a.day - b.day) : [];
  const rrNet = rrDays.reduce((s, d) => s + parseN(d.net), 0);
  const rrGross = rrDays.reduce((s, d) => s + parseN(d.gross), 0);

  const days        = activeTrack === "original" ? initialDays : rrDays;
  const totalNet    = activeTrack === "original" ? initialTotalNet : rrNet;
  const totalGross  = activeTrack === "original" ? initialTotalGross : rrGross;
  const visibleDays = showAll ? days : days.slice(0, 7);
  const maxNet      = Math.max(...days.map((d) => parseN(d.net)), 1);
  const summary     = buildPerformanceSummary(movie, days, totalNet, totalGross, activeTrack === "re-release");
  const trackTitle  = activeTrack === "re-release" ? `${movie.title} Re-Release` : movie.title;
  const cast        = (movie.cast || []).slice(0, 6);
  const songs       = movie.media?.songs || [];
  const year        = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  // relatedBlogs now comes from the server — no API call needed

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* ── Hero ── */}
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
            <Link href="/box-office" className="hover:text-orange-400 transition-colors">Box Office</Link>
            <span>/</span>
            <span className="text-gray-400">{movie.title}</span>
          </div>

          <div className="flex gap-6 items-start">
            {movie.posterUrl && (
              <div className="hidden sm:block flex-shrink-0">
                <img src={movie.posterUrl} alt={movie.title}
                  className="w-24 h-32 object-cover rounded-lg shadow-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}
                  loading="eager"
                  fetchPriority="high"
                  onError={(e) => (e.currentTarget.style.display = "none")} />
              </div>
            )}
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
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(movie.releaseDate)}</span>
                )}
                {movie.reReleaseDate && (
                  <span className="flex items-center gap-1 text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-md text-xs">
                    <Calendar className="w-3 h-3" /> Re-released: {fmtDate(movie.reReleaseDate)}
                  </span>
                )}
                {movie.language && (
                  <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs">{movie.language}</span>
                )}
                {movie.director && <span className="text-xs">Dir. {movie.director}</span>}
                {(movie.genre || []).slice(0, 2).map(g => (
                  <span key={g} className="px-2 py-0.5 bg-orange-500/10 rounded-md text-xs text-orange-300">{g}</span>
                ))}
              </div>
              {updatedAt && (
                <p className="text-[11px] text-gray-500 mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  <span>
                    Updated on{" "}
                    <time dateTime={new Date(updatedAt).toISOString()} className="text-gray-400 font-medium">
                      {new Date(updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </time>
                  </span>
                </p>
              )}
              {movie.verdict && movie.verdict !== "Upcoming" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/6 border border-white/10 text-gray-300 mb-4">
                  {movie.verdict}
                </span>
              )}

              {/* ── Inline cross-link pills ── */}
              <div className="flex flex-wrap gap-2 mt-2">
                <Link href={`/movie/${movie.slug}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/25 hover:border-orange-500/50 rounded-full text-xs font-semibold text-orange-400 transition-all">
                  🎬 Movie Page
                </Link>
                {songs.length > 0 && (
                  <Link href={`/songs/${movie.slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 hover:border-green-500/50 rounded-full text-xs font-semibold text-green-400 transition-all">
                    🎵 Songs &amp; Album
                  </Link>
                )}
                <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-500/50 rounded-full text-xs font-semibold text-purple-400 transition-all">
                  📝 Reviews &amp; Blogs
                </Link>
                {/* WhatsApp share — primary sharing platform in Odisha */}
                {totalNet > 0 && (
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${movie.title} Box Office Collection: ${fmtINR(totalNet)} net in ${days.length} days 🎬\n\nFull day-wise data: https://www.ollypedia.in/box-office/${movie.slug}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600/10 hover:bg-green-600/20 border border-green-600/25 hover:border-green-600/50 rounded-full text-xs font-semibold text-green-400 transition-all">
                    📲 Share on WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs for Original vs Re-Release ── */}
      {hasReRelease && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-6">
          <div className="flex items-center p-1 bg-[#111] border border-[#1f1f1f] rounded-lg w-fit">
            <button
              onClick={() => { setActiveTrack("original"); setShowAll(false); }}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTrack === "original" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              Original Release
            </button>
            <button
              onClick={() => { setActiveTrack("re-release"); setShowAll(false); }}
              className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${
                activeTrack === "re-release" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}
            >
              Re-Release
            </button>
          </div>
        </div>
      )}

      {/* ── Stats Cards ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Total Net",    value: fmtINR(totalNet),   icon: <IndianRupee className="w-4 h-4" />, color: "#f97316" },
            { label: "Total Gross",  value: fmtINR(totalGross), icon: <TrendingUp  className="w-4 h-4" />, color: "#7ec8e3" },
            { label: "Days Tracked", value: days.length || "—", icon: <Calendar    className="w-4 h-4" />, color: "#a78bfa" },
          ].map(({ label, value, icon, color }) => (
            <div key={label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1" style={{ color }}>
                {icon}
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
              </div>
              <div className="text-xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Content Ad (Visible on all screen sizes, responsive) ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <DisplayAd slot="8191172163" format="auto" />
      </div>

      {/* ── Data Disclaimer ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <BoxOfficeDisclaimer />
      </div>

      {/* ── Two-column layout: main content + sidebar ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── LEFT: Main content ── */}
          {/* min-w-0 is critical — prevents grid child from overflowing its column */}
          <div className="space-y-8 min-w-0 overflow-hidden">

            {days.length === 0 && (
              <div className="text-center py-20 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-semibold text-gray-400 mb-2">Collection data coming soon</p>
                <p className="text-sm">Check back after the movie releases for day-wise box office figures.</p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href={`/movie/${movie.slug}`}
                    className="px-4 py-2 bg-orange-500/10 border border-orange-500/25 text-orange-400 rounded-lg text-xs font-semibold hover:bg-orange-500/20 transition-all">
                    🎬 View Movie Page
                  </Link>
                </div>
              </div>
            )}

            {days.length > 0 && (
              <>
                {/* ── SEO Summary + Keyword-injected content ── */}
                <section className="space-y-4">
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                    <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      {trackTitle} Box Office Performance
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
                    {days.length >= 2 && (
                      <p className="text-gray-400 text-sm leading-relaxed mt-3">
                        The <strong className="text-gray-300">{trackTitle} Odia movie</strong> released
                        {movie.releaseDate ? ` on ${fmtDate(movie.releaseDate)}` : ""} in Odia (Ollywood) cinemas.
                        {" "}Day-wise collection data is tracked and updated on Ollypedia, Odisha&apos;s dedicated Odia film database.
                      </p>
                    )}
                    {/* Cross-links within SEO summary */}
                    <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex flex-wrap gap-3 text-xs">
                      <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline font-semibold">
                        📽️ {trackTitle} Full Movie Details →
                      </Link>
                      {songs.length > 0 && (
                        <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`} className="text-green-400 hover:underline font-semibold">
                          🎵 {trackTitle} Songs →
                        </Link>
                      )}
                      <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`} className="text-purple-400 hover:underline font-semibold">
                        📝 {trackTitle} Reviews &amp; Articles →
                      </Link>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      * Figures are approximate industry estimates. Source: Ollypedia Box Office Tracker.
                    </p>
                  </div>

                  {/* ── SEO keyword-rich paragraph 1 — movie overview ── */}
                  <div className="bg-[#0d0d0d] border border-[#181818] rounded-xl p-5">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      The <strong className="text-gray-200">{trackTitle} Odia movie</strong> is one of the notable
                      {year ? ` Ollywood films of ${year}` : " Ollywood films"}.
                      {" "}If you are searching for <em className="text-gray-300">{trackTitle} box office collection</em>,{" "}
                      <em className="text-gray-300">{trackTitle} first day collection</em>, or the{" "}
                      <em className="text-gray-300">{trackTitle} total collection</em>, Ollypedia provides verified
                      day-wise figures updated regularly.
                      {movie.director ? (
                        <>{" "}Directed by <strong className="text-gray-200">{movie.director}</strong>, this{" "}
                        {(movie.genre || []).join("/") || "Odia"} film has been tracked since its theatrical release.</>
                      ) : null}
                    </p>
                  </div>

                  {/* ── SEO keyword-rich paragraph 2 — intent content ── */}
                  <div className="bg-[#0d0d0d] border border-[#181818] rounded-xl p-5">
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Looking for the <em className="text-gray-300">{trackTitle} movie review</em>,{" "}
                      <em className="text-gray-300">{trackTitle} cast and crew</em>, or{" "}
                      <em className="text-gray-300">{trackTitle} story details</em>?
                      {" "}Ollypedia covers the complete <strong className="text-gray-200">{trackTitle} Ollywood movie</strong> — from release date and trailer
                      to songs and public reviews. This page specifically tracks the{" "}
                      <em className="text-gray-300">{trackTitle} day-wise box office collection</em>{" "}
                      including net and gross earnings at Odia cinemas across Odisha.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline">
                        → {trackTitle} full movie details
                      </Link>
                      <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`} className="text-purple-400 hover:underline">
                        → {trackTitle} movie review &amp; rating
                      </Link>
                      {songs.length > 0 && (
                        <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`} className="text-green-400 hover:underline">
                          → {trackTitle} songs
                        </Link>
                      )}
                    </div>
                  </div>
                </section>

                <div className="py-2">
                  <DisplayAd slot="8191172163" format="auto" />
                </div>

                {/* ── Bar Chart (SVG — works for any number of days) ── */}
                <section>
                  <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    Day-wise Net Collection — {trackTitle}
                  </h2>
                  <BoxOfficeChart days={days} maxNet={maxNet} />
                </section>

                <div className="py-2">
                  {/* Mid Content Ad (Visible on all screen sizes, responsive) */}
                  <DisplayAd slot="8191172163" format="auto" />
                </div>

                {/* ── Day-wise Table ── */}
                <section>
                  <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-orange-400" />
                    {trackTitle} Day-wise Box Office Collection
                  </h2>
                  <div className="space-y-4">
                    <BoxOfficeDisclaimer />
                    <div className="rounded-xl border border-[#1f1f1f] overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-[#1f1f1f] bg-[#111]">
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Day</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-orange-500/70 uppercase tracking-wider">Net Collection</th>
                            <th className="px-5 py-3 text-left text-xs font-bold text-sky-400/70 uppercase tracking-wider">Gross Collection</th>
                            {days.some(d => d.screens)   && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Screens</th>}
                            {days.some(d => d.occupancy) && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Occupancy</th>}
                            {days.some(d => d.note)      && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {days.map((d, i) => {
                            const isHidden = !showAll && i >= 7;
                            return (
                              <tr key={d.day}
                                className="border-b border-[#1a1a1a] hover:bg-orange-500/5 transition-colors"
                                style={{
                                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                                  display: isHidden ? "none" : undefined,
                                }}>
                                <td className="px-5 py-3.5 font-bold text-orange-400">Day {d.day}</td>
                                <td className="px-5 py-3.5 text-gray-400 text-xs">
                                  {d.date
                                    ? <time dateTime={d.date}>{fmtDate(d.date)}</time>
                                    : "—"}
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-white">{fmtINR(d.net)}</td>
                                <td className="px-5 py-3.5 font-semibold text-sky-300">{fmtINR(d.gross)}</td>
                                {days.some(x => x.screens)   && <td className="px-5 py-3.5 text-gray-400 text-xs">{d.screens || "—"}</td>}
                                {days.some(x => x.occupancy) && <td className="px-5 py-3.5 text-gray-400 text-xs">{d.occupancy || "—"}</td>}
                                {days.some(x => x.note)      && <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs">{d.note || "—"}</td>}
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-[#2a2a2a] bg-orange-500/5">
                            <td colSpan={2} className="px-5 py-3.5 text-xs font-black text-orange-400 uppercase tracking-wider">
                              Total ({days.length} day{days.length !== 1 ? "s" : ""})
                            </td>
                            <td className="px-5 py-3.5 font-black text-orange-400 text-base">{fmtINR(totalNet)}</td>
                            <td className="px-5 py-3.5 font-black text-sky-300 text-base">{fmtINR(totalGross)}</td>
                            {days.some(x => x.screens)   && <td />}
                            {days.some(x => x.occupancy) && <td />}
                            {days.some(x => x.note)      && <td />}
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    {days.length > 7 && (
                      <div className="px-5 py-3 border-t border-[#1a1a1a] bg-[#0d0d0d]">
                        <button onClick={() => setShowAll(p => !p)}
                          className="flex items-center gap-1.5 text-orange-400 text-sm font-semibold hover:text-orange-300 transition-colors">
                          {showAll
                            ? <><ChevronUp   className="w-4 h-4" /> Show fewer days</>
                            : <><ChevronDown className="w-4 h-4" /> Show all {days.length} days</>}
                        </button>
                      </div>
                    )}
                    </div>{/* end rounded-xl border */}
                  </div>{/* end space-y-4 */}
                </section>

                <div className="py-2">
                  {/* Mid Content Ad (Visible on all screen sizes, responsive) */}
                  <DisplayAd slot="8191172163" format="auto" />
                </div>

                {/* ── SEO Rich Content ── */}
                <section className="space-y-5">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-orange-400" />
                    About {trackTitle} Box Office Collection
                  </h2>

                  {days[0] && (
                    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                      <h3 className="text-sm font-bold text-orange-300 mb-2">{trackTitle} Opening Day Collection</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {trackTitle} opened to {fmtINR(days[0].net)} net ({fmtINR(days[0].gross)} gross) on its first day in Odia cinemas
                        {days[0].date ? <> on <time dateTime={days[0].date}>{fmtDate(days[0].date)}</time></> : ""}.
                        {days[0].screens   ? ` The film ran across ${days[0].screens} screens` : ""}
                        {days[0].occupancy ? ` with ${days[0].occupancy} occupancy` : ""}.
                        {days[0].note ? ` ${days[0].note}` : ""}
                      </p>
                    </div>
                  )}

                  {days.length >= 7 && (() => {
                    const week1  = days.slice(0, 7);
                    const w1net  = week1.reduce((s, d) => s + parseN(d.net),   0);
                    const w1gross= week1.reduce((s, d) => s + parseN(d.gross), 0);
                    return (
                      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                        <h3 className="text-sm font-bold text-orange-300 mb-2">{trackTitle} First Week Collection</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          In its first week (7 days), <strong className="text-white">{trackTitle}</strong> collected{" "}
                          <strong className="text-orange-400">{fmtINR(w1net)}</strong> net and{" "}
                          <strong className="text-sky-300">{fmtINR(w1gross)}</strong> gross at the Odia box office.
                          {days.length > 7 && ` The film continued its theatrical run beyond the first week, bringing its total to ${fmtINR(totalNet)} net.`}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-sm font-bold text-orange-300 mb-2">{trackTitle} Total Collection — {days.length} Days</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      After {days.length} day{days.length !== 1 ? "s" : ""} in theatres,{" "}
                      <strong className="text-white">{trackTitle}</strong>{" "}
                      {movie.releaseDate ? <>(released <time dateTime={movie.releaseDate}>{fmtDate(movie.releaseDate)}</time>) </> : ""}
                      has earned a total of <strong className="text-orange-400">{fmtINR(totalNet)} net</strong> and{" "}
                      <strong className="text-sky-300">{fmtINR(totalGross)} gross</strong> at the worldwide box office.
                      {movie.budget ? ` The film was produced on a budget of ${movie.budget}.` : ""}
                      {" "}Ollypedia tracks day-wise collection data for all Odia (Ollywood) movies.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/movie/${movie.slug}`}
                        className="text-xs text-orange-400 hover:underline font-semibold">
                        View {trackTitle} full movie details →
                      </Link>
                      {songs.length > 0 && (
                        <span className="text-gray-600 text-xs">·</span>
                      )}
                      {songs.length > 0 && (
                        <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`}
                          className="text-xs text-green-400 hover:underline font-semibold">
                          Listen to {trackTitle} songs →
                        </Link>
                      )}
                    </div>
                  </div>

                  {cast.length > 0 && (
                    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                      <h3 className="text-sm font-bold text-orange-300 mb-2">Cast & Director</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {trackTitle} features{" "}
                        {cast.slice(0, 4).map((c, i) => (
                          <span key={i}>
                            <strong className="text-gray-300">{c.name}</strong>
                            {c.role ? ` as ${c.role}` : ""}
                            {i < Math.min(cast.length, 4) - 1 ? ", " : ""}
                          </span>
                        ))}{movie.director ? ` directed by ${movie.director}` : ""}.
                        {movie.synopsis ? ` ${movie.synopsis.slice(0, 180)}${movie.synopsis.length > 180 ? "…" : ""}` : ""}
                      </p>
                      <div className="mt-3">
                        <Link href={`/movie/${movie.slug}`}
                          className="text-xs text-orange-400 hover:text-orange-300 font-semibold transition-colors">
                          View full movie details →
                        </Link>
                      </div>
                    </div>
                  )}
                </section>

                {/* ── Week-wise Collection Grid ── */}
                {days.length >= 7 && (() => {
                  const w1 = days.slice(0,  7).reduce((s, d) => s + parseN(d.net), 0);
                  const w2 = days.slice(7, 14).reduce((s, d) => s + parseN(d.net), 0);
                  const w3 = days.slice(14, 21).reduce((s, d) => s + parseN(d.net), 0);
                  const w4 = days.slice(21, 28).reduce((s, d) => s + parseN(d.net), 0);
                  const weeks = [
                    { label: "1st Week",  range: "Day 1–7",   net: w1, show: days.length >= 7  },
                    { label: "2nd Week",  range: "Day 8–14",  net: w2, show: days.length >= 14 },
                    { label: "3rd Week",  range: "Day 15–21", net: w3, show: days.length >= 21 },
                    { label: "4th Week",  range: "Day 22–28", net: w4, show: days.length >= 28 },
                  ].filter(w => w.show);
                  return (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-400" />
                        {trackTitle} Week-wise Box Office Collection
                      </h2>
                      <div className={`grid gap-3 ${weeks.length >= 3 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"}`}>
                        {weeks.map(w => (
                          <div key={w.label} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 text-center">
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider">{w.label}</p>
                            <p className="text-[9px] text-gray-600 mb-2">{w.range}</p>
                            <p className="text-lg font-black text-white">{fmtINR(w.net)}</p>
                            <p className="text-[9px] text-gray-600 mt-0.5">net</p>
                          </div>
                        ))}
                      </div>
                      {/* Crawlable keyword text for week-wise searches */}
                      <p className="text-[11px] text-gray-700 mt-3 leading-relaxed">
                        {trackTitle} week-wise net: {weeks.map((w, i) => (
                          <span key={w.label}>{w.label} ({w.range}) — {fmtINR(w.net)}{i < weeks.length - 1 ? " · " : ""}</span>
                        ))}. Total: {fmtINR(totalNet)} net.
                      </p>
                    </section>
                  );
                })()}

                {/* ── Collection Milestones ── */}
                {totalNet > 0 && (() => {
                  const cr = 1_00_00_000;
                  const lk = 1_00_000;
                  const thresholds = [10*lk, 25*lk, 50*lk, 75*lk, 1*cr, 2*cr, 3*cr, 5*cr, 10*cr].filter(t => t <= totalNet);
                  if (thresholds.length < 2) return null;
                  const milestones: { label: string; day: number }[] = [];
                  for (const t of thresholds) {
                    let running = 0;
                    for (const d of days) {
                      running += parseN(d.net);
                      if (running >= t) { milestones.push({ label: fmtINR(t), day: d.day }); break; }
                    }
                  }
                  if (!milestones.length) return null;
                  return (
                    <section>
                      <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-400" />
                        {trackTitle} Box Office Milestones
                      </h2>
                      <div className="flex flex-wrap gap-2">
                        {milestones.map(m => (
                          <div key={m.label} className="flex items-center gap-2 bg-[#111] border border-orange-500/15 rounded-lg px-3 py-2.5">
                            <span className="text-base">🏆</span>
                            <div>
                              <p className="text-xs font-black text-white leading-none">{m.label}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">crossed on Day {m.day}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-700 mt-3">
                        {trackTitle} crossed {milestones.map((m, i) => (
                          <span key={m.label}>{m.label} on Day {m.day}{i < milestones.length - 1 ? ", " : "."}</span>
                        ))}
                      </p>
                    </section>
                  );
                })()}

                {/* ── Related Blog Posts inline (mobile-friendly, shows before FAQ) ── */}
                {relatedBlogs.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      {trackTitle} — Articles &amp; Reviews
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relatedBlogs.map((b: BlogPost) => (
                        <Link key={b._id} href={`/blog/${b.slug}`}
                          className="flex items-start gap-3 p-3 bg-[#111] border border-[#1f1f1f] hover:border-purple-500/30 rounded-xl transition-all group">
                          {b.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={b.coverImage} alt={b.title}
                              className="w-16 h-10 object-cover rounded flex-shrink-0 border border-[#222]" />
                          ) : (
                            <div className="w-16 h-10 flex-shrink-0 bg-[#1a1a1a] rounded border border-[#222] flex items-center justify-center">📝</div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-300 group-hover:text-purple-400 transition-colors line-clamp-2 leading-snug">{b.title}</p>
                            {b.category && <p className="text-[10px] text-gray-600 mt-0.5">{b.category}</p>}
                          </div>
                        </Link>
                      ))}
                    </div>
                    <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`}
                      className="block mt-3 text-xs text-purple-400/60 hover:text-purple-400 transition-colors">
                      View all {trackTitle} articles →
                    </Link>
                  </section>
                )}

                {/* ── Songs Section (inline, below blogs) ── */}
                {songs.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                      <Music className="w-5 h-5 text-green-400" />
                      {trackTitle} Songs &amp; Soundtrack
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {songs.slice(0, 4).map((s, i) => {
                        const thumb = s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : s.thumbnailUrl;
                        const slug  = toSongSlug(s.title) || String(i);
                        return (
                          <Link key={i} href={`/songs/${movie.slug}/${i}/${slug}`}
                            className="flex items-center gap-3 p-3 bg-[#111] border border-[#1f1f1f] hover:border-green-500/30 rounded-xl transition-all group">
                            {thumb ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={thumb} alt={s.title || ""}
                                className="w-16 h-10 object-cover rounded flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-10 flex-shrink-0 bg-[#1a1a1a] rounded flex items-center justify-center text-xl">♪</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-300 group-hover:text-green-400 transition-colors truncate">{s.title || "Untitled"}</p>
                              {s.singer && <p className="text-[10px] text-gray-600 truncate">🎤 {s.singer}</p>}
                            </div>
                            <span className="text-green-500/40 group-hover:text-green-400 transition-colors text-xs flex-shrink-0">▶</span>
                          </Link>
                        );
                      })}
                    </div>
                    {songs.length > 4 && (
                      <Link href={`/movie/${movie.slug}#songs`}
                        className="block mt-3 text-xs text-green-400/60 hover:text-green-400 transition-colors">
                        View all {songs.length} songs →
                      </Link>
                    )}
                  </section>
                )}

                {/* ── Other Odia Movies Releasing Around Same Time ── */}
                {competingMovies.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                      <Film className="w-5 h-5 text-orange-400" />
                      Other Odia Movies — Box Office {year || ""}
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {competingMovies.map((m) => {
                        const mNet = (m.boxOfficeDays || []).reduce(
                          (s: number, d: any) => s + parseN(d.net), 0
                        );
                        return (
                          <Link key={m._id} href={`/box-office/${m.slug}`}
                            className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl overflow-hidden transition-all">
                            {m.posterUrl ? (
                              <img src={m.posterUrl} alt={m.title}
                                className="w-full aspect-[2/3] object-cover group-hover:opacity-90 transition-opacity" />
                            ) : (
                              <div className="w-full aspect-[2/3] bg-[#1a1a1a] flex items-center justify-center text-3xl text-gray-700">🎬</div>
                            )}
                            <div className="p-2.5">
                              <p className="text-[11px] font-bold text-white group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">{m.title}</p>
                              {mNet > 0 && <p className="text-[10px] text-orange-400 font-bold mt-1">{fmtINR(mNet)}</p>}
                              {m.verdict && <p className="text-[9px] text-gray-600 mt-0.5">{m.verdict}</p>}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    {/* Crawlable text — targets "Odia movies [year]" searches */}
                    <p className="text-[11px] text-gray-700 mt-3">
                      Other Odia (Ollywood) films releasing around the same time as {trackTitle}:{" "}
                      {competingMovies.map((m, i) => (
                        <span key={m._id}>
                          <Link href={`/box-office/${m.slug}`} className="text-gray-600 hover:text-orange-400 transition-colors">
                            {m.title}
                          </Link>
                          {i < competingMovies.length - 1 ? ", " : "."}
                        </span>
                      ))}
                    </p>
                  </section>
                )}

                {/* ── FAQ ── */}
                <section>
                  <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <span className="text-orange-400">❓</span>
                    {trackTitle} — Frequently Asked Questions
                  </h2>
                  <div className="space-y-2">
                    {([
                      {
                        q: `What is the total box office collection of ${trackTitle}?`,
                        a: `${trackTitle} has collected a total of ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross at the Odia (Ollywood) box office in ${days.length} day${days.length !== 1 ? "s" : ""}. Ollypedia tracks daily earnings for all Odia films.`,
                      },
                      ...(days[0] ? [{
                        q: `What was ${trackTitle} Day 1 opening box office collection?`,
                        a: `${trackTitle} collected ${fmtINR(days[0].net)} net (${fmtINR(days[0].gross)} gross) on opening day${days[0].date ? ` (${fmtDate(days[0].date)})` : ""}. ${days[0].screens ? `The film opened across ${days[0].screens} screens.` : ""}`,
                      }] : []),
                      ...(days.length >= 7 ? [{
                        q: `What is ${trackTitle} first week collection?`,
                        a: `In its first 7 days, ${trackTitle} collected ${fmtINR(days.slice(0,7).reduce((s,d)=>s+parseN(d.net),0))} net at the Odia box office.`,
                      }] : []),
                      {
                        q: `Is ${trackTitle} a hit or flop?`,
                        a: movie.verdict && movie.verdict !== "Upcoming"
                          ? `According to Ollypedia, ${trackTitle} is classified as "${movie.verdict}" at the box office with a total of ${fmtINR(totalNet)} net.`
                          : `The ${trackTitle} box office verdict will be updated as collection data comes in. Visit Ollypedia for the latest.`,
                      },
                      {
                        q: `What is ${trackTitle} story and cast?`,
                        a: `${trackTitle} is ${movie.genre?.length ? `a ${movie.genre.join("/")} ` : "an "}Odia film${movie.director ? ` directed by ${movie.director}` : ""}. ${cast.length > 0 ? `It stars ${cast.slice(0,3).map((c:any)=>c.name).join(", ")} in lead roles.` : ""} ${movie.synopsis ? movie.synopsis.slice(0,140)+"…" : "Visit the movie page for the full story and cast details."}`,
                      },
                      {
                        q: `Where can I watch ${trackTitle} trailer and songs?`,
                        a: `The ${trackTitle} trailer${songs.length > 0 ? ` and ${songs.length} song${songs.length>1?"s":""}` : ""} are available on Ollypedia. Visit the movie page for the official trailer, songs and lyrics.`,
                      },
                      {
                        q: `Where to find ${trackTitle} day-wise box office data?`,
                        a: `Ollypedia publishes verified day-wise box office for ${trackTitle} at ollypedia.in/box-office/${movie.slug}. Data includes net, gross, screens and occupancy updated daily.`,
                      },
                      {
                        q: `Where can I read ${trackTitle} movie review?`,
                        a: `Full ${trackTitle} movie review, cast analysis and Ollywood articles are on Ollypedia's blog at ollypedia.in/blog. User ratings and public reviews are also on the movie page.`,
                      },
                    ] as {q:string;a:string}[]).map(({ q, a }, i) => (
                      <FaqItem key={i} q={q} a={a} />
                    ))}
                  </div>
                </section>

                {/* ── Bottom cross-link bar ── */}
                <section className="bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 border border-orange-500/15 rounded-xl p-5">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">More about {trackTitle}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/movie/${movie.slug}`}
                      className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-xs font-semibold text-orange-400 transition-all">
                      🎬 Full Movie Info
                    </Link>
                    {songs.length > 0 && (
                      <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`}
                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs font-semibold text-green-400 transition-all">
                        🎵 {trackTitle} Songs
                      </Link>
                    )}
                    <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`}
                      className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-xs font-semibold text-purple-400 transition-all">
                      📰 Reviews &amp; Blogs
                    </Link>
                    <Link href="/box-office"
                      className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-lg text-xs font-semibold text-sky-400 transition-all">
                      📊 All Box Office
                    </Link>
                    {year && (
                      <Link href={`/movies/year/${year}`}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold text-gray-400 transition-all">
                        🗓 Odia Movies {year}
                      </Link>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* ── RIGHT: Sticky Sidebar ── */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">

            {/* All days mini table */}
            {days.length > 0 && (
              <AllDaysSidebar days={days} movie={movie} />
            )}

            {/* Quick explore links */}
            <QuickLinksSidebar movie={movie} />

            {/* Sidebar Ad (Visible on all screen sizes, responsive) */}
            <DisplayAd slot="8191172163" format="auto" />

            {/* Related blogs — server-fetched, always populated */}
            <RelatedBlogsSidebar blogs={relatedBlogs} movieTitle={movie.title} />

            {/* Songs */}
            {songs.length > 0 && (
              <SongsSidebar songs={songs} movieSlug={movie.slug} movieTitle={movie.title} />
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}