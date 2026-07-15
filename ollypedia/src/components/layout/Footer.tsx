// src/components/Footer.tsx
// Server component — fetches recently RELEASED movies & latest published blogs from MongoDB.
// Revalidates every 60 seconds so new content shows without redeploy.
//
// SEO_LINKS fix:
//  - Songs category links preserved (pages exist at /songs/category/[category]/page.tsx)
//  - Movies filter links (/movies/2026 etc.) point to /movies with a hash — safe fallback
//    until app/movies/[filter]/page.tsx is built. Replace with real hrefs once pages exist.

import Link from "next/link";
import { Film, Instagram, Twitter, Youtube, ChevronRight, Clock, Star } from "lucide-react";
import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";

// ── Revalidate every 60 s ─────────────────────────────────────────────────────
export const revalidate = 600;

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecentMovie {
  _id: string;
  title: string;
  slug: string;
  posterUrl?: string;
  releaseDate?: string;
  verdict?: string;
  avgRating?: number;
  reviewCount?: number;
}

interface RecentBlog {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  createdAt?: string;
  coverImage?: string;
  movieTitle?: string;
  readTime?: number;
}

// ── Data fetching ─────────────────────────────────────────────────────────────
async function getRecentData(): Promise<{ movies: RecentMovie[]; blogs: RecentBlog[] }> {
  try {
    await connectDB();

    let BlogModel: any;
    try { BlogModel = (await import("@/models/Blog")).default; } catch { BlogModel = null; }

    const today = new Date();

    const [rawMovies, blogs] = await Promise.all([
      (Movie as any)
        .find({
          releaseDate: { $exists: true, $ne: null, $lte: today },
          verdict: { $nin: ["Upcoming", null, ""] },
        })
        .sort({ releaseDate: -1 })
        .limit(5)
        .select("title slug posterUrl releaseDate verdict reviews")
        .lean(),
      BlogModel
        ? BlogModel.find({ published: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .select("title slug category createdAt coverImage movieTitle readTime")
          .lean()
        : [],
    ]);

    const movies = (rawMovies as any[]).map((m: any) => {
      const reviews: { rating?: number }[] = m.reviews ?? [];
      const rated = reviews.filter((r) => typeof r.rating === "number" && r.rating > 0);
      const avg = rated.length
        ? rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length
        : 0;
      return {
        _id: String(m._id),
        title: m.title,
        slug: m.slug,
        posterUrl: m.posterUrl,
        releaseDate: m.releaseDate,
        verdict: m.verdict,
        avgRating: Math.round(avg * 10) / 10,
        reviewCount: rated.length,
      };
    });

    return {
      movies: JSON.parse(JSON.stringify(movies)) as RecentMovie[],
      blogs: JSON.parse(JSON.stringify(blogs)) as RecentBlog[],
    };
  } catch {
    return { movies: [], blogs: [] };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso?: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fullReleaseDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Renders 5 stars: filled / half / empty based on a 0–5 rating
function StarRating({ rating, count }: { rating: number; count: number }) {
  if (!count || rating <= 0) return null;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const fill = rating >= i ? "full" : rating >= i - 0.5 ? "half" : "empty";
    stars.push(
      <span key={i} className="relative inline-block w-3 h-3">
        <svg viewBox="0 0 20 20" className="w-3 h-3 text-gray-700 absolute inset-0" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69L9.05 2.927z" />
        </svg>
        {fill !== "empty" && (
          <svg
            viewBox="0 0 20 20"
            className="w-3 h-3 text-amber-400 absolute inset-0"
            fill="currentColor"
            style={fill === "half" ? { clipPath: "inset(0 50% 0 0)" } : {}}
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.175 0l-3.37 2.448c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.951-.69L9.05 2.927z" />
          </svg>
        )}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5">
      {stars}
      <span className="text-[10px] text-amber-400/70 ml-0.5 font-medium">{rating.toFixed(1)}</span>
      <span className="text-[10px] text-gray-700">({count})</span>
    </span>
  );
}

const VERDICT_COLOR: Record<string, string> = {
  "Blockbuster": "text-green-400",
  "Super Hit": "text-green-400",
  "Hit": "text-green-400",
  "Average": "text-yellow-400",
  "Flop": "text-red-400",
  "Disaster": "text-red-400",
  "Upcoming": "text-sky-400",
};

const VERDICT_BG: Record<string, string> = {
  "Blockbuster": "bg-green-500/10 border-green-500/20",
  "Super Hit": "bg-green-500/10 border-green-500/20",
  "Hit": "bg-green-500/10 border-green-500/20",
  "Average": "bg-yellow-500/10 border-yellow-500/20",
  "Flop": "bg-red-500/10 border-red-500/20",
  "Disaster": "bg-red-500/10 border-red-500/20",
  "Upcoming": "bg-sky-500/10 border-sky-500/20",
};

const CATEGORY_ICON: Record<string, string> = {
  "Movie Review": "🎬",
  "Actor Spotlight": "🌟",
  "Top 10": "🏆",
  "Music": "🎵",
  "Behind the Scenes": "🎥",
  "Industry News": "📰",
  "Opinion": "💬",
  "General": "✍️",
};

// ── Static link sets ──────────────────────────────────────────────────────────
const NAV_LINKS = {
  Explore: [
    { label: "Movies", href: "/movies" },
    { label: "Trailers", href: "/trailers" },
    { label: "Songs", href: "/songs" },
    { label: "OTT Releases", href: "/ott" },
    { label: "Cast & Crew", href: "/cast" },
    { label: "News", href: "/news" },
    { label: "Blog", href: "/blog" },
  ],
  Company: [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "HTML Sitemap", href: "/sitemap" },
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
  ],
};

const SEO_LINKS = {
  "Explore Movies & Songs": [
    { label: "Odia Movies 2026", href: "/movies" },
    { label: "Odia Movies 2025", href: "/movies" },
    { label: "Odia Movies 2024", href: "/movies" },
    { label: "Upcoming Odia Movies", href: "/movies" },
    { label: "Latest Odia Movies", href: "/movies" },
    { label: "Blockbuster Odia Movies", href: "/movies" },
    { label: "Ollywood Trailers 2026", href: "/trailers" },
    { label: "Upcoming Movie Trailers", href: "/trailers?status=upcoming" },
    { label: "Official Odia Teasers", href: "/trailers?type=teaser" },
    { label: "Odia Songs 2026", href: "/songs/category/2026" },
    { label: "Latest Odia Songs", href: "/songs/category/latest" },
    { label: "Trending Songs", href: "/songs/category/trending" },
    { label: "Old Hit Songs", href: "/songs/category/classics" },
    { label: "Top Singers", href: "/songs/category/singers" },
  ],
  "Learn / Discover": [
    { label: "Know About Odia Movies", href: "/blog/odia-guides/odia-movies" },
    { label: "History of Ollywood", href: "/blog/odia-guides/history-of-ollywood" },
    { label: "Top 10 Odia Movies", href: "/blog/odia-guides/top-10-odia-movies" },
    { label: "Best Odia Songs List", href: "/blog/odia-guides/best-odia-songs" },
    { label: "Famous Odia Actors", href: "/blog/odia-guides/odia-actors" },
  ],
};

// ── Component ─────────────────────────────────────────────────────────────────
export async function Footer() {
  const { movies, blogs } = await getRecentData();

  return (
    <footer
      className="bg-[#0a0a0a] border-t border-[#1c1c1c] mt-16"
      aria-label="Site footer"
      itemScope
      itemType="https://schema.org/WPFooter"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* ══════════════════════════════════════════════════════
            SEO PILL LINKS
        ══════════════════════════════════════════════════════ */}
        <nav aria-label="SEO quick links">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 pb-8 sm:pb-10 border-b border-[#1c1c1c]">
            {Object.entries(SEO_LINKS).map(([section, links]) => (
              <div key={section}>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500 mb-3 sm:mb-4 flex items-center gap-2">
                  <span className="w-5 h-px bg-orange-500/60" aria-hidden="true" />
                  {section}
                </h3>
                <ul className="flex flex-wrap gap-1.5 sm:gap-2">
                  {links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-orange-400 bg-[#141414] hover:bg-orange-500/8 border border-[#1e1e1e] hover:border-orange-500/25 px-2.5 py-1 rounded-full transition-all duration-200"
                      >
                        <ChevronRight className="w-2.5 h-2.5 opacity-40" aria-hidden="true" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════
            RECENTLY RELEASED MOVIES  +  LATEST ARTICLES
        ══════════════════════════════════════════════════════ */}
        {(movies.length > 0 || blogs.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 py-8 sm:py-10 border-b border-[#1c1c1c]">

            {/* Recent Movies */}
            {movies.length > 0 && (
              <section aria-label="Recently released Odia movies">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-4 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-700" aria-hidden="true" />
                  Recently Released
                </h3>
                <ul className="space-y-2.5 sm:space-y-3">
                  {movies.map((movie) => {
                    const verdictColor = VERDICT_COLOR[movie.verdict ?? ""] ?? "text-gray-500";
                    const verdictBg = VERDICT_BG[movie.verdict ?? ""] ?? "bg-gray-500/10 border-gray-500/20";
                    return (
                      <li key={movie._id}>
                        <Link
                          href={`/movie/${movie.slug}`}
                          className="group flex gap-3 items-start hover:bg-[#111] rounded-xl p-2 -mx-2 transition-colors"
                          title={`${movie.title} — Odia Movie`}
                        >
                          {/* Poster */}
                          <div className="w-9 h-12 sm:w-10 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a] relative">
                            {movie.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={movie.posterUrl}
                                alt={`${movie.title} poster`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                width={40}
                                height={56}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Star className="w-4 h-4 text-gray-700" aria-hidden="true" />
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-300 line-clamp-1 group-hover:text-orange-400 transition-colors">
                              {movie.title}
                            </p>
                            <p className="text-[11px] text-gray-600 mt-0.5">
                              {fullReleaseDate(movie.releaseDate)}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {movie.verdict && (
                                <span className={`text-[9px] font-bold tracking-widest uppercase ${verdictColor} ${verdictBg} border px-1.5 py-px rounded`}>
                                  {movie.verdict}
                                </span>
                              )}
                              {movie.avgRating !== undefined && movie.reviewCount !== undefined && (
                                <StarRating rating={movie.avgRating} count={movie.reviewCount} />
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/movies"
                  className="inline-flex items-center gap-1 mt-4 sm:mt-5 text-xs text-orange-400/50 hover:text-orange-400 transition-colors"
                  aria-label="View all Odia movies"
                >
                  View all movies <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              </section>
            )}

            {/* Latest Blogs */}
            {blogs.length > 0 && (
              <section aria-label="Latest Ollywood articles">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-4 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-700" aria-hidden="true" />
                  Latest Articles
                </h3>
                <ul className="space-y-2.5 sm:space-y-3">
                  {blogs.map((blog) => {
                    const icon = blog.category ? CATEGORY_ICON[blog.category] : null;
                    return (
                      <li key={blog._id}>
                        <Link
                          href={`/blog/${blog.slug}`}
                          className="group flex gap-3 items-start hover:bg-[#111] rounded-xl p-2 -mx-2 transition-colors"
                          title={blog.title}
                        >
                          {/* Cover or icon */}
                          <div className="w-9 h-12 sm:w-10 sm:h-14 flex-shrink-0 rounded-lg overflow-hidden bg-[#1a1a1a] relative">
                            {blog.coverImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={blog.coverImage}
                                alt={blog.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                width={40}
                                height={56}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-lg">
                                {icon}
                              </div>
                            )}
                          </div>

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-gray-300 line-clamp-2 group-hover:text-orange-400 transition-colors leading-snug">
                              {blog.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {blog.category && (
                                <span className="text-[9px] font-bold tracking-widest uppercase text-orange-400/55 bg-orange-500/8 border border-orange-500/15 px-1.5 py-px rounded">
                                  {blog.category}
                                </span>
                              )}
                              {blog.createdAt && (
                                <span className="text-[11px] text-gray-600 flex items-center gap-0.5">
                                  <Clock className="w-2.5 h-2.5" aria-hidden="true" />
                                  <time dateTime={blog.createdAt}>{timeAgo(blog.createdAt)}</time>
                                </span>
                              )}
                              {blog.readTime && (
                                <span className="text-[11px] text-gray-700">
                                  {blog.readTime} min read
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1 mt-4 sm:mt-5 text-xs text-orange-400/50 hover:text-orange-400 transition-colors"
                  aria-label="View all Ollywood articles"
                >
                  View all articles <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </Link>
              </section>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SEO RICH TEXT BLOCK
        ══════════════════════════════════════════════════════ */}
        <div className="py-8 sm:py-10 border-b border-[#1c1c1c]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500 mb-4 sm:mb-5 flex items-center gap-2">
            <span className="w-5 h-px bg-orange-500/60" aria-hidden="true" />
            About Ollypedia — Odia Cinema Encyclopedia
          </h3>
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 text-[12px] text-gray-600 leading-relaxed"
            itemScope
            itemType="https://schema.org/Organization"
          >
            <meta itemProp="name" content="Ollypedia" />
            <meta itemProp="description" content="Odisha's most complete online encyclopedia for Odia movies and the Ollywood film industry." />
            <p>
              <strong className="text-gray-500" itemProp="name">Ollypedia</strong> is Odisha&apos;s most
              complete online encyclopedia for{" "}
              <strong className="text-gray-500">Odia movies</strong> and the{" "}
              <strong className="text-gray-500">Ollywood film industry</strong>. From classic films of the
              1950s to the latest blockbusters of 2026, we catalogue every Odia film with full cast, crew,
              songs, box office data, and reviews — all in one place.
            </p>
            <p>
              Explore detailed profiles of your favourite{" "}
              <Link href="/cast" className="text-gray-500 hover:text-orange-400 transition-colors">
                Odia actors and actresses
              </Link>
              , discover the stories behind{" "}
              <Link href="/songs" className="text-gray-500 hover:text-orange-400 transition-colors">
                hit Odia songs
              </Link>
              , and follow the latest{" "}
              <Link href="/news" className="text-gray-500 hover:text-orange-400 transition-colors">
                Ollywood news
              </Link>{" "}
              and announcements. We cover music directors, cinematographers, directors, and every creative
              talent shaping Odia cinema today.
            </p>
            <p>
              Our{" "}
              <Link href="/blog" className="text-gray-500 hover:text-orange-400 transition-colors">
                Ollywood blog
              </Link>{" "}
              publishes in-depth{" "}
              <Link href="/blog" className="text-gray-500 hover:text-orange-400 transition-colors">
                Odia movie reviews
              </Link>
              , top-10 lists, cast spotlights, and behind-the-scenes features. Whether you&apos;re looking for
              the best Odia movies to watch, upcoming releases, or box office verdicts — Ollypedia is your
              definitive guide to Odia cinema.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            MAIN NAV GRID
        ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 pt-8 sm:pt-10">

          {/* Brand — full width on mobile, spans 2 cols on md+ */}
          <div className="col-span-2 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-3 sm:mb-4" aria-label="Ollypedia home">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center" aria-hidden="true">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Olly<span className="text-orange-500">pedia</span>
              </span>
            </Link>

            <p className="text-gray-500 text-[13px] leading-relaxed max-w-sm">
              The most comprehensive encyclopedia of{" "}
              <strong className="font-medium text-gray-400">Odia cinema</strong> — covering
              Ollywood movies, songs, actors, box office results, and industry news from
              Odisha&apos;s vibrant film industry since its founding.
            </p>

            {/* SEO keyword pills */}
            <div className="flex flex-wrap gap-1.5 mt-3 sm:mt-4">
              {["Odia Movies", "Ollywood", "Odia Songs", "Odia Actors", "Box Office"].map((kw) => (
                <span
                  key={kw}
                  className="text-[10px] text-gray-700 border border-[#1e1e1e] px-2 py-0.5 rounded-full"
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Social links */}
            <div className="flex items-center gap-2 mt-4 sm:mt-5">
              <a
                href="#"
                className="p-2 text-gray-600 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                aria-label="Ollypedia on YouTube"
                rel="noopener noreferrer"
              >
                <Youtube className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="https://www.instagram.com/ollypedia.in/"
                target="_blank"
                className="p-2 text-gray-600 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                aria-label="Ollypedia on Instagram"
                rel="noopener noreferrer"
              >
                <Instagram className="w-4 h-4" aria-hidden="true" />
              </a>
              <a
                href="#"
                className="p-2 text-gray-600 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                aria-label="Ollypedia on Twitter / X"
                rel="noopener noreferrer"
              >
                <Twitter className="w-4 h-4" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Nav columns — each takes 1 col on mobile (2-col grid), 1 col on md */}
          {Object.entries(NAV_LINKS).map(([section, links]) => (
            <nav key={section} aria-label={`${section} links`}>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-600 mb-3 sm:mb-4">
                {section}
              </h3>
              <ul className="space-y-2 sm:space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-gray-500 hover:text-orange-400 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            BOTTOM BAR
        ══════════════════════════════════════════════════════ */}
        <div className="border-t border-[#1c1c1c] mt-8 sm:mt-10 pt-5 sm:pt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-gray-700 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} Ollypedia. All rights reserved.
          </p>

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-4 gap-y-1.5">
            <Link
              href="/privacy"
              className="text-gray-700 text-xs hover:text-gray-400 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/disclaimer"
              className="text-gray-700 text-xs hover:text-gray-400 transition-colors"
            >
              Disclaimer
            </Link>
            <Link
              href="/terms-and-conditions"
              className="text-gray-700 text-xs hover:text-gray-400 transition-colors"
            >
              Terms &amp; Conditions
            </Link>
            <span className="text-gray-700 text-xs hidden sm:inline">
              Celebrating the richness of Odia cinema 🎬
            </span>
          </div>

          {/* Show tagline below links on very small screens */}
          <p className="text-gray-700 text-xs text-center sm:hidden">
            Celebrating the richness of Odia cinema 🎬
          </p>
        </div>

      </div>
    </footer>
  );
}