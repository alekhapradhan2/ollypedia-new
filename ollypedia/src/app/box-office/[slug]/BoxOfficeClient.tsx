"use client";
// app/box-office/[slug]/BoxOfficeClient.tsx
// ★ UPDATED: Full inter-linking sidebar with related blogs, songs, movie page.
//            Right sidebar shows all box-office days + related content.
//            Strong SEO cross-links on every section.

import Link from "next/link";
import { useState, useEffect } from "react";
import { TrendingUp, Calendar, IndianRupee, BarChart3, ChevronDown, ChevronUp, Film, Music, BookOpen, ExternalLink } from "lucide-react";

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
}

interface Props {
  movie:        Movie;
  initialDays:  BoxOfficeDay[];
  totalNet:     number;
  totalGross:   number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseN(val: unknown): number {
  const n = parseFloat(String(val || "0").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function fmtINR(val: unknown): string {
  const n = parseN(val);
  if (!n) return String(val || "—");
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function toSongSlug(str?: string): string {
  return (str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/(^-|-$)/g, "");
}

function buildPerformanceSummary(movie: Movie, days: BoxOfficeDay[], totalNet: number, totalGross: number): string {
  const title     = movie.title;
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
          <Link href={`/movies?year=${year}`}
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BoxOfficeClient({ movie, initialDays, totalNet, totalGross }: Props) {
  const [showAll, setShowAll]       = useState(false);
  const [relBlogs, setRelBlogs]     = useState<BlogPost[]>([]);
  const days        = initialDays;
  const visibleDays = showAll ? days : days.slice(0, 7);
  const maxNet      = Math.max(...days.map((d) => parseN(d.net)), 1);
  const summary     = buildPerformanceSummary(movie, days, totalNet, totalGross);
  const cast        = (movie.cast || []).slice(0, 6);
  const songs       = movie.media?.songs || [];
  const year        = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";

  // Fetch related blogs client-side
  useEffect(() => {
    if (!movie.title) return;
    fetch(`${API_BASE}/blog?limit=6&movie=${encodeURIComponent(movie.title)}`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const posts: BlogPost[] = (d.posts || d || []).slice(0, 5);
        setRelBlogs(posts);
      })
      .catch(() => {});
  }, [movie.title]);

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
                {movie.language && (
                  <span className="px-2 py-0.5 bg-white/5 rounded-md text-xs">{movie.language}</span>
                )}
                {movie.director && <span className="text-xs">Dir. {movie.director}</span>}
                {(movie.genre || []).slice(0, 2).map(g => (
                  <span key={g} className="px-2 py-0.5 bg-orange-500/10 rounded-md text-xs text-orange-300">{g}</span>
                ))}
              </div>
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
                  <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/25 hover:border-green-500/50 rounded-full text-xs font-semibold text-green-400 transition-all">
                    🎵 Songs &amp; Album
                  </Link>
                )}
                <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/25 hover:border-purple-500/50 rounded-full text-xs font-semibold text-purple-400 transition-all">
                  📝 Reviews &amp; Blogs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 mb-8">
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

      {/* ── Two-column layout: main content + sidebar ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">

          {/* ── LEFT: Main content ── */}
          <div className="space-y-8">

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
                {/* ── SEO Summary ── */}
                <section>
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
                    <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-400" />
                      {movie.title} Box Office Performance
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">{summary}</p>
                    {days.length >= 2 && (
                      <p className="text-gray-400 text-sm leading-relaxed mt-3">
                        The film released{movie.releaseDate ? ` on ${fmtDate(movie.releaseDate)}` : ""} in Odia (Ollywood) cinemas.
                        {" "}Day-wise collection data is tracked and updated on Ollypedia, Odisha&apos;s dedicated cinema database.
                      </p>
                    )}
                    {/* Cross-links within SEO summary */}
                    <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex flex-wrap gap-3 text-xs">
                      <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline font-semibold">
                        📽️ {movie.title} Full Movie Details →
                      </Link>
                      {songs.length > 0 && (
                        <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`} className="text-green-400 hover:underline font-semibold">
                          🎵 {movie.title} Songs →
                        </Link>
                      )}
                      <Link href={`/blog?movie=${encodeURIComponent(movie.title)}`} className="text-purple-400 hover:underline font-semibold">
                        📝 {movie.title} Reviews & Articles →
                      </Link>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      * Figures are approximate industry estimates. Source: Ollypedia Box Office Tracker.
                    </p>
                  </div>
                </section>

                {/* ── Bar Chart ── */}
                <section>
                  <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-400" />
                    Day-wise Net Collection — {movie.title}
                  </h2>
                  <div className="bg-[#111] rounded-xl border border-[#1f1f1f] p-5 overflow-x-auto">
                    <div className="flex items-end gap-2" style={{ minWidth: days.length * 52, height: 140 }}>
                      {days.map((d) => {
                        const net = parseN(d.net);
                        const pct = Math.max(4, (net / maxNet) * 100);
                        return (
                          <div key={d.day} className="flex flex-col items-center gap-1" style={{ flex: 1, minWidth: 40 }}>
                            <div className="w-full rounded-t-md relative group"
                              style={{ height: `${pct}%`, background: "linear-gradient(to top, #f97316, #fb923c)", minHeight: 6 }}>
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
                    {movie.title} Day-wise Box Office Collection
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
                            {days.some(d => d.screens)   && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Screens</th>}
                            {days.some(d => d.occupancy) && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Occupancy</th>}
                            {days.some(d => d.note)      && <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Notes</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleDays.map((d, i) => (
                            <tr key={d.day} className="border-b border-[#1a1a1a] hover:bg-orange-500/5 transition-colors"
                              style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)" }}>
                              <td className="px-5 py-3.5 font-bold text-orange-400">Day {d.day}</td>
                              <td className="px-5 py-3.5 text-gray-400 text-xs">{d.date || "—"}</td>
                              <td className="px-5 py-3.5 font-semibold text-white">{fmtINR(d.net)}</td>
                              <td className="px-5 py-3.5 font-semibold text-sky-300">{fmtINR(d.gross)}</td>
                              {days.some(x => x.screens)   && <td className="px-5 py-3.5 text-gray-400 text-xs">{d.screens || "—"}</td>}
                              {days.some(x => x.occupancy) && <td className="px-5 py-3.5 text-gray-400 text-xs">{d.occupancy || "—"}</td>}
                              {days.some(x => x.note)      && <td className="px-5 py-3.5 text-gray-500 text-xs max-w-xs">{d.note || "—"}</td>}
                            </tr>
                          ))}
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
                  </div>
                </section>

                {/* ── SEO Rich Content ── */}
                <section className="space-y-5">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Film className="w-5 h-5 text-orange-400" />
                    About {movie.title} Box Office Collection
                  </h2>

                  {days[0] && (
                    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                      <h3 className="text-sm font-bold text-orange-300 mb-2">{movie.title} Opening Day Collection</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {movie.title} opened to {fmtINR(days[0].net)} net ({fmtINR(days[0].gross)} gross) on its first day in Odia cinemas
                        {days[0].date ? ` on ${fmtDate(days[0].date)}` : ""}.
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
                        <h3 className="text-sm font-bold text-orange-300 mb-2">{movie.title} First Week Collection</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          In its first week (7 days), <strong className="text-white">{movie.title}</strong> collected{" "}
                          <strong className="text-orange-400">{fmtINR(w1net)}</strong> net and{" "}
                          <strong className="text-sky-300">{fmtINR(w1gross)}</strong> gross at the Odia box office.
                          {days.length > 7 && ` The film continued its theatrical run beyond the first week, bringing its total to ${fmtINR(totalNet)} net.`}
                        </p>
                      </div>
                    );
                  })()}

                  <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                    <h3 className="text-sm font-bold text-orange-300 mb-2">{movie.title} Total Collection — {days.length} Days</h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      After {days.length} day{days.length !== 1 ? "s" : ""} in theatres,{" "}
                      <strong className="text-white">{movie.title}</strong>{" "}
                      {movie.releaseDate ? `(released ${fmtDate(movie.releaseDate)}) ` : ""}
                      has earned a total of <strong className="text-orange-400">{fmtINR(totalNet)} net</strong> and{" "}
                      <strong className="text-sky-300">{fmtINR(totalGross)} gross</strong> at the worldwide box office.
                      {movie.budget ? ` The film was produced on a budget of ${movie.budget}.` : ""}
                      {" "}Ollypedia tracks day-wise collection data for all Odia (Ollywood) movies.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={`/movie/${movie.slug}`}
                        className="text-xs text-orange-400 hover:underline font-semibold">
                        View {movie.title} full movie details →
                      </Link>
                      {songs.length > 0 && (
                        <span className="text-gray-600 text-xs">·</span>
                      )}
                      {songs.length > 0 && (
                        <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`}
                          className="text-xs text-green-400 hover:underline font-semibold">
                          Listen to {movie.title} songs →
                        </Link>
                      )}
                    </div>
                  </div>

                  {cast.length > 0 && (
                    <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
                      <h3 className="text-sm font-bold text-orange-300 mb-2">Cast & Director</h3>
                      <p className="text-sm text-gray-400 leading-relaxed">
                        {movie.title} features{" "}
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

                {/* ── Related Blog Posts inline (mobile-friendly, shows before FAQ) ── */}
                {relBlogs.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      {movie.title} — Articles &amp; Reviews
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relBlogs.map(b => (
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
                      View all {movie.title} articles →
                    </Link>
                  </section>
                )}

                {/* ── Songs Section (inline, below blogs) ── */}
                {songs.length > 0 && (
                  <section>
                    <h2 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
                      <Music className="w-5 h-5 text-green-400" />
                      {movie.title} Songs &amp; Soundtrack
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

                {/* ── FAQ ── */}
                <section>
                  <h2 className="text-lg font-bold mb-4 text-white">
                    Frequently Asked Questions — {movie.title} Box Office
                  </h2>
                  <div className="space-y-3">
                    {[
                      {
                        q: `What is the total box office collection of ${movie.title}?`,
                        a: `${movie.title} has collected a total of ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross at the box office in ${days.length} day${days.length !== 1 ? "s" : ""}.`,
                      },
                      ...(days[0] ? [{
                        q: `What was ${movie.title} Day 1 box office collection?`,
                        a: `${movie.title} collected ${fmtINR(days[0].net)} net on Day 1${days[0].date ? ` (${fmtDate(days[0].date)})` : ""}.`,
                      }] : []),
                      ...(days.length >= 7 ? [{
                        q: `What is ${movie.title} first week collection?`,
                        a: `${movie.title} collected ${fmtINR(days.slice(0,7).reduce((s,d)=>s+parseN(d.net),0))} net in its first week at the Odia box office.`,
                      }] : []),
                      {
                        q: `Where to find ${movie.title} box office data?`,
                        a: `Ollypedia tracks and updates ${movie.title} day-wise box office collection including net and gross figures. Visit ollypedia.in/box-office/${movie.slug} for daily updates.`,
                      },
                      {
                        q: `Where can I read reviews and blogs about ${movie.title}?`,
                        a: `You can read full reviews, cast analysis and Ollywood blogs about ${movie.title} on Ollypedia's blog section at ollypedia.in/blog.`,
                      },
                    ].map(({ q, a }, i) => (
                      <div key={i} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
                        <p className="text-sm font-semibold text-white mb-1.5">{q}</p>
                        <p className="text-sm text-gray-400 leading-relaxed">{a}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Bottom cross-link bar ── */}
                <section className="bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 border border-orange-500/15 rounded-xl p-5">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-3">More about {movie.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/movie/${movie.slug}`}
                      className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 rounded-lg text-xs font-semibold text-orange-400 transition-all">
                      🎬 Full Movie Info
                    </Link>
                    {songs.length > 0 && (
                      <Link href={`/songs/${movie.slug}/0/${toSongSlug(songs[0]?.title) || "0"}`}
                        className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs font-semibold text-green-400 transition-all">
                        🎵 {movie.title} Songs
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
                      <Link href={`/movies?year=${year}`}
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

            {/* Related blogs (lazy loaded) */}
            <RelatedBlogsSidebar blogs={relBlogs} movieTitle={movie.title} />

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