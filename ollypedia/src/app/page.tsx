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
  ChevronRight, Clapperboard, Users, Mic2, Trophy,
} from "lucide-react";
import HeroCarousel, { type HeroMovie } from "@/components/layout/HeroCarousel";

export const revalidate = 600;

export const metadata: Metadata = buildMeta({
  title: `${SITE_NAME} – The Odia Film Encyclopedia`,
  description:
    "Ollypedia is Odisha's most comprehensive Odia film database. Discover latest Ollywood movies, songs, actor biographies, box office collection, reviews and Odia film blogs.",
  keywords: [
    "Odia movies 2025", "Ollywood", "Odia cinema", "Odia films", "Babushaan",
    "Elina Samantray", "Odia actor", "Odia songs", "Odia movie reviews",
    "Ollywood box office", "Odia film blog",
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
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Box office helpers (same as /box-office/page.tsx) ────────────
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

async function getHomeData() {
  await connectDB();
  const [allMovies, latestBlogs] = await Promise.all([
    Movie.find({}, "-reviews -media.songs")
      .sort({ releaseDate: -1 })
      .limit(80)
      .lean(),
    // Latest blogs for the main grid
    Blog.find({ published: true }, "-content -reviews")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
  ]);

  // ── Hero movies ───────────────────────────────────────────────
  const heroMovies: HeroMovie[] = (allMovies as any[])
    .filter((m) => {
      const hasImage = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!hasImage) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
      return isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate);
    })
    .sort((a: any, b: any) => {
      const aUp = !a.verdict || a.verdict === "Upcoming";
      const bUp = !b.verdict || b.verdict === "Upcoming";
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : null;
      if (aUp && bUp) {
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
      director:    m.director    || undefined,
      verdict:     m.verdict     || undefined,
      synopsis:    m.synopsis    || undefined,
      thumbnailUrl: m.thumbnailUrl || undefined,
      posterUrl:   m.posterUrl   || undefined,
      bannerUrl:   m.bannerUrl   || undefined,
      media: m.media?.trailer?.ytId
        ? { trailer: { ytId: m.media.trailer.ytId } }
        : undefined,
    }));

  // ── Latest released movies ────────────────────────────────────
  const latestMovies = (allMovies as any[])
    .filter((m) => m.status !== "Upcoming" && m.releaseDate && new Date(m.releaseDate) <= _now)
    .sort((a: any, b: any) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
    .slice(0, 10);

  // ── Upcoming movies ───────────────────────────────────────────
  const upcomingMovies = (allMovies as any[])
    .filter((m) => !m.verdict || m.verdict === "Upcoming")
    .sort((a: any, b: any) => {
      const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : null;
      const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate - bDate;
    })
    .slice(0, 6);

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
    .slice(0, 6);

  return { heroMovies, latestMovies, upcomingMovies, latestBlogs, topMovies, boxOfficeMovies };
}

// ── Category pills for blog ───────────────────────────────────────
const BLOG_CATEGORIES = [
  { label: "Movie Review",    href: "/blog?cat=Movie+Review",    emoji: "🎬" },
  { label: "Actor Spotlight", href: "/blog?cat=Actor+Spotlight", emoji: "🌟" },
  { label: "Top 10",          href: "/blog?cat=Top+10",          emoji: "🏆" },
  { label: "Behind the Scenes",href: "/blog?cat=Behind+the+Scenes",emoji: "🎥" },
  { label: "Music",           href: "/blog?cat=Music",           emoji: "🎵" },
  { label: "Opinion",         href: "/blog?cat=Opinion",         emoji: "💬" },
  { label: "Box Office",      href: "/blog?cat=General",         emoji: "📊" },
  { label: "Industry News",   href: "/blog?cat=Industry+News",   emoji: "📰" },
];

export default async function HomePage() {
  const { heroMovies, latestMovies, upcomingMovies, latestBlogs, topMovies, boxOfficeMovies } =
    await getHomeData();

  return (
    <div className="min-h-screen">

      {/* ══ HERO CAROUSEL ══ */}
      {heroMovies.length > 0 ? (
        <HeroCarousel movies={heroMovies} />
      ) : (
        <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-[#0a0a0a] to-[#0a0a0a]" />
          <div className="relative z-10 text-center px-4">
            <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-none mb-4">
              Discover <span className="text-orange-500">Odia</span> Cinema
            </h1>
            <p className="text-gray-300 text-lg mb-6">
              Your ultimate guide to Ollywood — movies, actors, songs, and more.
            </p>
            <Link href="/movies" className="btn-primary inline-flex items-center gap-2">
              <Film className="w-4 h-4" /> Explore Movies
            </Link>
          </div>
        </section>
      )}

      {/* ══ STATS BAR ══ */}
      <section className="bg-[#111] border-y border-[#1f1f1f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#1f1f1f]">
            {[
              { icon: Film,      label: "Odia Movies",   value: "500+"  },
              { icon: Users,     label: "Cast Profiles",  value: "1000+" },
              { icon: Music,     label: "Odia Songs",    value: "5000+" },
              { icon: BookOpen,  label: "Blog Articles", value: "100+"  },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-6 py-4">
                <Icon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-lg font-bold text-white font-display">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-20">

        {/* ══ LATEST RELEASES ══ */}
        {latestMovies.length > 0 && (
          <section aria-label="Latest Odia movie releases">
            <SectionHeader
              title="Latest Releases"
              subtitle="Newest Odia films from Ollywood"
              href="/movies"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {latestMovies.slice(0, 10).map((m: any) => (
                <MovieCard key={String(m._id)} movie={m} />
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

        {/* ══ BOX OFFICE COLLECTION ══ */}
        {boxOfficeMovies.length > 0 && (
          <section aria-label="Odia movie box office collection">
            <SectionHeader
              title="Box Office Collection"
              subtitle="Latest Odia film box office figures & verdicts"
              href="/box-office"
            />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

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
                    <div className="relative h-52 w-full overflow-hidden">
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
                          {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : ""}
                          {(m.genre || []).length > 0 && ` · ${(m.genre as string[]).slice(0,2).join(", ")}`}
                        </p>
                        <h2 className="font-display text-xl lg:text-2xl font-bold text-white leading-snug group-hover:text-orange-300 transition-colors">
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
                        <div key={label} className="px-4 py-3 text-center">
                          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">{label}</p>
                          <p className="text-sm font-bold text-white">{val}</p>
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
                          {m.releaseDate ? new Date(m.releaseDate).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }) : ""}
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

        {/* ══ BLOG CATEGORIES ══ */}
        <section aria-label="Browse blog by category">
          <SectionHeader
            title="Browse by Category"
            subtitle="Find articles that interest you"
            href="/blog"
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BLOG_CATEGORIES.map((cat) => (
              <Link key={cat.label} href={cat.href}
                className="group flex items-center gap-3 bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 hover:bg-orange-500/5 rounded-xl px-4 py-3 transition-all">
                <span className="text-xl">{cat.emoji}</span>
                <span className="text-sm font-semibold text-gray-300 group-hover:text-orange-300 transition-colors">
                  {cat.label}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-orange-400 ml-auto transition-colors" />
              </Link>
            ))}
          </div>
        </section>

        {/* ══ UPCOMING MOVIES ══ */}
        {upcomingMovies.length > 0 && (
          <section aria-label="Upcoming Odia movies">
            <SectionHeader
              title="Upcoming Movies"
              subtitle="Odia films releasing soon — mark your calendar"
              href="/movies?verdict=Upcoming"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {upcomingMovies.map((m: any) => (
                <MovieCard key={String(m._id)} movie={m} />
              ))}
            </div>
          </section>
        )}

        {/* ══ BLOG — LATEST ARTICLES GRID ══ */}
        {latestBlogs.length > 0 && (
          <section aria-label="Latest Odia cinema blog posts">
            <SectionHeader
              title="Latest from the Blog"
              subtitle="In-depth reviews, cast spotlights and Ollywood stories"
              href="/blog"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        {/* ══ BLOCKBUSTER / TOP MOVIES (SEO + AdSense filler) ══ */}
        {topMovies.length > 0 && (
          <section aria-label="Blockbuster and superhit Odia movies">
            <SectionHeader
              title="Blockbuster Hits"
              subtitle="Top-performing Odia films of recent years"
              href="/movies"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {topMovies.map((m: any, i: number) => (
                <Link key={String(m._id)} href={`/movie/${m.slug || m._id}`}
                  className="group relative bg-[#111] border border-[#1f1f1f] hover:border-orange-500/40 rounded-xl overflow-hidden transition-all">
                  {/* Rank badge */}
                  <div className="absolute top-2 left-2 z-10 w-7 h-7 bg-orange-500 text-black text-xs font-black rounded-full flex items-center justify-center">
                    {i + 1}
                  </div>
                  {(m.posterUrl || m.thumbnailUrl) ? (
                    <div className="relative h-52 w-full">
                      <Image src={m.posterUrl || m.thumbnailUrl} alt={m.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    </div>
                  ) : (
                    <div className="h-52 bg-orange-500/5 flex items-center justify-center">
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

        {/* ══ SEO RICH CONTENT — About Ollywood ══ */}
        <section
          aria-label="About Odia cinema Ollywood"
          className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-12"
        >
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-5 h-5 text-orange-500" />
              <span className="text-orange-500 text-sm font-semibold uppercase tracking-widest">About Ollywood</span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-6 leading-tight">
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
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/movies" className="btn-primary">Browse Movies</Link>
              <Link href="/blog" className="btn-outline">Read Our Blog</Link>
              <Link href="/cast" className="btn-outline">Cast Profiles</Link>
            </div>
          </div>
        </section>

        {/* ══ WHY OLLYPEDIA — Features Grid ══ */}
        <section aria-label="What you can find on Ollypedia">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
              Everything About <span className="text-orange-500">Odia Cinema</span> in One Place
            </h2>
            <p className="text-gray-400 text-sm mt-2 max-w-xl mx-auto">
              Ollypedia is the most complete Odia film database covering movies, music, cast and box office.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="group bg-[#111] border border-[#1f1f1f] hover:border-orange-500/30 rounded-xl p-6 transition-all hover:-translate-y-0.5">
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
        <section aria-label="Frequently asked questions about Odia cinema" className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 md:p-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="font-display text-2xl font-bold text-white">
              Frequently Asked Questions — Odia Cinema
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <section className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-900/40 via-[#111] to-[#111] border border-orange-500/20 p-10 md:p-14 text-center">
          <div className="absolute inset-0 opacity-5"
            style={{ backgroundImage: "radial-gradient(circle at 50% 50%, #f97316 0%, transparent 70%)" }} />
          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl font-black text-white mb-3">
              Your Gateway to <span className="text-orange-400">Ollywood</span>
            </h2>
            <p className="text-gray-300 text-base max-w-xl mx-auto mb-8">
              Explore the complete world of Odia cinema — from classic films to today's blockbusters,
              from song lyrics to box office collections.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
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