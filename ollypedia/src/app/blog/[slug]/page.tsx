// app/blog/[slug]/page.tsx
// SEO UPGRADE v2:
//  1. Server-side data fetch (was already fixed)
//  2. notFound() on missing/unpublished blog
//  3. Canonical URL + explicit robots
//  4. Article JSON-LD structured data
//  5. publishedTime / modifiedTime for Google News
//  6. ★ NEW: Rich keyword set targeting movie name searches
//  7. ★ NEW: SeoInterlinks block — cross-links to related movie + songs
//  8. ★ NEW: Odia-specific long-tail keywords (e.g. "Odia movie review 2025")

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import Movie from "@/models/Movie";
import BlogDetailClient from "./BlogDetailClient";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── helpers ───────────────────────────────────────────────────
function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const blogs = await Blog.find({ published: true }, "slug")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return blogs.map((b: any) => ({ slug: b.slug }));
}

// ─── Data helpers ──────────────────────────────────────────────
async function getBlog(slug: string) {
  await connectDB();
  const blog = await Blog.findOne({ slug, published: true }).lean();
  if (!blog) return null;
  return JSON.parse(JSON.stringify(blog));
}

/**
 * Try to find a movie whose title matches blog.movieTitle or a tag.
 * Used to build cross-links: blog → movie page + that movie's songs.
 */
async function getRelatedMovie(blog: any) {
  if (!blog) return null;
  await connectDB();

  // Try exact movieTitle field first, then fall back to tags
  const candidates = [
    blog.movieTitle,
    ...(blog.tags || []),
  ].filter(Boolean);

  for (const name of candidates) {
    const movie = await (Movie as any)
      .findOne({ title: { $regex: new RegExp(`^${name}$`, "i") } })
      .select("title slug posterUrl releaseDate verdict media.songs genre director")
      .lean();
    if (movie) return JSON.parse(JSON.stringify(movie));
  }
  return null;
}

// ★ Fetch recent blogs excluding the current one
async function getRecentBlogs(currentSlug: string) {
  await connectDB();
  const blogs = await Blog.find(
    { published: true, slug: { $ne: currentSlug } },
    "title slug excerpt coverImage category createdAt readTime"
  )
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  return JSON.parse(JSON.stringify(blogs));
}

// ─── Metadata ─────────────────────────────────────────────────

// --- Fuzzy misspelling generator ---
function getMisspellings(title: string): string[] {
  if (!title) return [];
  const variants = new Set<string>();
  const words = title.trim().split(/\s+/);
  for (const word of words) {
    if (word.length < 3) continue;
    const w = word.toLowerCase();
    variants.add(w.replace(/([aeiou])\1+/g, "$1"));
    variants.add(w.replace(/([aeiou])(?!\1)/g, "$1$1"));
    variants.add(w.slice(0, -1));
    variants.add(w.replace(/a/g, "e"));
    variants.add(w.replace(/a/g, "o"));
    variants.add(w.replace(/e/g, "i"));
    variants.add(w.replace(/u/g, "o"));
    for (let i = 0; i < w.length - 1; i++) {
      variants.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2));
    }
    variants.add(w.replace(/h/g, ""));
    variants.add(w.replace(/([sc])([aeiou])/g, "$1h$2"));
    variants.add(w.replace(/ph/g, "f"));
    variants.add(w.replace(/f/g, "ph"));
  }
  const result: string[] = [];
  variants.forEach((v) => {
    if (v && v !== title.toLowerCase() && v.length > 2) {
      result.push(v);
      result.push(`${v} odia movie`);
      result.push(`${v} odia film`);
    }
  });
  return result;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const blog = await getBlog(params.slug);
  if (!blog) return { robots: { index: false, follow: false } };

  const title       = `${blog.title} | Ollypedia`;
  const description = (
    blog.excerpt ||
    blog.content?.replace(/<[^>]+>/g, "").slice(0, 155) ||
    `Read ${blog.title} on Ollypedia – Odia cinema news and reviews.`
  );
  const image     = blog.coverImage || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/blog/${blog.slug}`;

  // ★ Rich keyword set — movie name + Odia long-tails
  const movieName = blog.movieTitle || "";
  const year      = blog.createdAt ? new Date(blog.createdAt).getFullYear() : "";
  const keywords  = [
    blog.title,
    movieName,
    movieName && `${movieName} review`,
    movieName && `${movieName} odia movie`,
    movieName && `${movieName} odia film`,
    movieName && `${movieName} ollywood`,
    movieName && `${movieName} songs`,
    movieName && `${movieName} cast`,
    movieName && `${movieName} ${year}`,
    "Odia movie review",
    "Ollywood movie review",
    "Odia film news",
    "Odia cinema",
    "Ollywood news",
    year && `Odia movie ${year}`,
    year && `Ollywood ${year}`,
    "Odisha film",
    "Odia movie blog",
    ...(blog.tags || []),
    ...getMisspellings(movieName || blog.title),
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Ollypedia",
      type: "article",
      publishedTime: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      modifiedTime:  blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: blog.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

// ─── SEO Interlinks block (server-rendered) ────────────────────
// Always visible to Google regardless of JS. Links blog → movie → songs.
function SeoInterlinks({
  blog,
  movie,
}: {
  blog: any;
  movie: any | null;
}) {
  const movieYear = movie?.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : "";
  const songs: any[] = movie?.media?.songs || [];

  return (
    <section
      aria-label="Related content"
      className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-4"
    >
      {/* ── About box ── */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 mb-5">
        <h2 className="text-white font-bold text-sm mb-2">
          About This Article
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          {blog.excerpt ||
            blog.content?.replace(/<[^>]+>/g, "").slice(0, 200) ||
            `${blog.title} — Read the full story on Ollypedia, your home for Odia cinema news, reviews, and entertainment.`}
          {movie && (
            <>
              {" "}This article is related to the{" "}
              {movie.genre?.length ? `${movie.genre[0]} ` : ""}
              Odia film{" "}
              <Link
                href={`/movie/${movie.slug}`}
                className="text-orange-400 hover:underline font-semibold"
              >
                {movie.title}{movieYear ? ` (${movieYear})` : ""}
              </Link>
              {movie.director && (
                <>, directed by <strong className="text-white">{movie.director}</strong></>
              )}
              .
            </>
          )}
        </p>

        {/* Tag pills */}
        {(blog.tags?.length || blog.category) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {blog.category && (
              <Link
                href={`/blog/category/${toSlug(blog.category)}`}
                className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
              >
                📰 {blog.category}
              </Link>
            )}
            {(blog.tags || []).slice(0, 5).map((tag: string) => (
              <Link
                key={tag}
                href={`/blog/tag/${toSlug(tag)}`}
                className="text-xs text-gray-500 hover:text-orange-400 bg-[#181818] border border-[#252525] px-2.5 py-1 rounded-full transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Related movie card ── */}
      {movie && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 mb-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Related Odia Film
          </h2>
          <Link
            href={`/movie/${movie.slug}`}
            className="flex items-center gap-4 group"
          >
            {movie.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={movie.posterUrl}
                alt={`${movie.title} poster`}
                width={64}
                height={96}
                className="w-16 h-24 object-cover rounded-lg border border-[#222] group-hover:border-orange-500/40 transition-colors"
              />
            ) : (
              <div className="w-16 h-24 bg-[#1a1a1a] rounded-lg border border-[#222] flex items-center justify-center text-2xl">
                🎬
              </div>
            )}
            <div>
              <p className="text-white font-bold text-base group-hover:text-orange-400 transition-colors">
                {movie.title}{movieYear ? ` (${movieYear})` : ""}
              </p>
              {movie.verdict && (
                <p className="text-xs mt-1 font-semibold" style={{
                  color: movie.verdict === "Blockbuster" || movie.verdict === "Super Hit" ? "#4acf82"
                    : movie.verdict === "Hit" ? "#a3e8a0"
                    : movie.verdict === "Average" ? "#e8c87a"
                    : "#e59595"
                }}>
                  {movie.verdict}
                </p>
              )}
              {movie.genre?.length && (
                <p className="text-gray-500 text-xs mt-1">{movie.genre.join(" · ")}</p>
              )}
              <p className="text-orange-400/60 text-xs mt-2 group-hover:text-orange-400 transition-colors">
                View Full Movie Page →
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Songs from this movie ── */}
      {songs.length > 0 && (
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-5 mb-5">
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Songs from {movie.title}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {songs.slice(0, 10).map((s: any, i: number) => (
              <li key={i}>
                <Link
                  href={`/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`}
                  className="text-xs text-gray-400 hover:text-orange-400 bg-[#181818] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all"
                >
                  🎵 {s.title}
                  {s.singer ? <span className="text-gray-600 ml-1">· {s.singer}</span> : ""}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Site-wide discovery links ── */}
      <div className="bg-[#0a0a0a] border border-[#181818] rounded-xl p-5">
        <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
          Explore Ollypedia
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/blog" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">📰 All Blogs</Link>
          <Link href="/movies" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🎬 All Movies</Link>
          <Link href="/songs" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🎵 All Songs</Link>
          <Link href="/blog/category/movie-review" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">⭐ Movie Reviews</Link>
          <Link href="/blog/category/news" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🗞️ Odia Cinema News</Link>
          <Link href="/songs/category/latest" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🆕 Latest Songs</Link>
          <Link href="/songs/category/trending" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🔥 Trending Songs</Link>
        </div>
      </div>
    </section>
  );
}

// ─── Recent Blogs section (server-rendered) ───────────────────
function RecentBlogs({ blogs }: { blogs: any[] }) {
  if (!blogs.length) return null;

  const fmtDate = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "";

  const CAT_COLORS: Record<string, string> = {
    "Movie Review":    "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    "Actor Spotlight": "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "Top 10":          "bg-orange-500/15 text-orange-400 border-orange-500/20",
    News:              "bg-green-500/15  text-green-400  border-green-500/20",
    Upcoming:          "bg-blue-500/15   text-blue-400   border-blue-500/20",
    General:           "bg-pink-500/15   text-pink-400   border-pink-500/20",
  };
  const catClass = (cat?: string) =>
    CAT_COLORS[cat || ""] || "bg-orange-500/15 text-orange-400 border-orange-500/20";

  return (
    <section
      aria-label="Recent articles"
      className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-10 mt-2"
    >
      <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Recent Articles
          </h2>
          <Link
            href="/blog"
            className="text-xs text-orange-400/60 hover:text-orange-400 transition-colors"
          >
            View all →
          </Link>
        </div>

        {/* Grid — first card is featured (wide), rest are compact */}
        <div className="p-5">
          {/* Featured first post */}
          <Link
            href={`/blog/${blogs[0].slug}`}
            className="group flex flex-col sm:flex-row gap-4 p-3 rounded-xl hover:bg-[#161616] transition-colors mb-4"
          >
            {/* Thumbnail */}
            <div className="sm:w-48 sm:h-32 w-full h-44 flex-shrink-0 rounded-lg overflow-hidden border border-[#222] bg-[#1a1a1a]">
              {blogs[0].coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blogs[0].coverImage}
                  alt={blogs[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">
                  📰
                </div>
              )}
            </div>
            {/* Info */}
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              {blogs[0].category && (
                <span
                  className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catClass(blogs[0].category)}`}
                >
                  {blogs[0].category}
                </span>
              )}
              <h3 className="text-white font-bold text-base leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
                {blogs[0].title}
              </h3>
              {blogs[0].excerpt && (
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">
                  {blogs[0].excerpt}
                </p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-600 text-[11px]">
                  {fmtDate(blogs[0].createdAt)}
                </span>
                {blogs[0].readTime && (
                  <span className="text-gray-600 text-[11px]">
                    · {blogs[0].readTime} min read
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Divider */}
          <div className="border-t border-[#1a1a1a] mb-4" />

          {/* Remaining 5 posts — compact list */}
          <ul className="flex flex-col gap-1">
            {blogs.slice(1).map((b: any) => (
              <li key={b._id}>
                <Link
                  href={`/blog/${b.slug}`}
                  className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#161616] transition-colors"
                >
                  {/* Small thumb */}
                  <div className="w-16 h-11 flex-shrink-0 rounded-md overflow-hidden border border-[#222] bg-[#1a1a1a]">
                    {b.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverImage}
                        alt={b.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg opacity-30">
                        📰
                      </div>
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-300 group-hover:text-orange-400 transition-colors line-clamp-2 leading-snug">
                      {b.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {b.category && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catClass(b.category)}`}>
                          {b.category}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-600">
                        {fmtDate(b.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <span className="text-gray-700 group-hover:text-orange-400 transition-colors text-sm flex-shrink-0 mt-1">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default async function BlogPage({
  params,
}: {
  params: { slug: string };
}) {
  const blog  = await getBlog(params.slug);
  if (!blog) notFound();

  const [movie, recentBlogs] = await Promise.all([
    getRelatedMovie(blog),
    getRecentBlogs(params.slug),
  ]);

  const movieYear   = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const movieCanon  = movie ? `https://ollypedia.in/movie/${movie.slug}` : undefined;
  const songs: any[] = movie?.media?.songs || [];

  const jsonLd: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "headline":       blog.title,
        "description":    blog.excerpt || "",
        "datePublished":  blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
        "dateModified":   blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
        "image":          blog.coverImage || "https://ollypedia.in/default.jpg",
        "author":         { "@type": "Organization", "name": "Ollypedia" },
        "publisher": {
          "@type": "Organization",
          "name": "Ollypedia",
          "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" },
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `https://ollypedia.in/blog/${blog.slug}`,
        },
        ...(movie && {
          "about": {
            "@type": "Movie",
            "name": movie.title,
            "url":  movieCanon,
            ...(movieYear && { "dateCreated": String(movieYear) }),
          },
        }),
        "keywords": [
          blog.title, movie?.title,
          movie && `${movie.title} review`,
          movie && `${movie.title} odia`,
          "Odia movie", "Ollywood", "Odia cinema",
          ...(blog.tags || []),
        ].filter(Boolean).join(", "),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home",  "item": "https://ollypedia.in/" },
          { "@type": "ListItem", "position": 2, "name": "Blog",  "item": "https://ollypedia.in/blog" },
          ...(blog.category
            ? [{ "@type": "ListItem", "position": 3, "name": blog.category, "item": `https://ollypedia.in/blog/category/${toSlug(blog.category)}` }]
            : []),
          { "@type": "ListItem", "position": blog.category ? 4 : 3, "name": blog.title, "item": `https://ollypedia.in/blog/${blog.slug}` },
        ],
      },
      ...(songs.length > 0
        ? [{
            "@type": "ItemList",
            "name": `Songs from ${movie?.title}`,
            "itemListElement": songs.slice(0, 10).map((s: any, i: number) => ({
              "@type": "ListItem", "position": i + 1, "name": s.title,
              "url": `https://ollypedia.in/songs/${movie?.slug}/${i}/${toSlug(s.title) || String(i)}`,
            })),
          }]
        : []),
    ],
  };

  const fmtDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  const CAT_COLORS: Record<string, string> = {
    "Movie Review":    "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
    "Actor Spotlight": "bg-purple-500/15 text-purple-400 border-purple-500/20",
    "Top 10":          "bg-orange-500/15 text-orange-400 border-orange-500/20",
    "Box Office":      "bg-green-500/15  text-green-400  border-green-500/20",
    News:              "bg-green-500/15  text-green-400  border-green-500/20",
    Upcoming:          "bg-blue-500/15   text-blue-400   border-blue-500/20",
    General:           "bg-pink-500/15   text-pink-400   border-pink-500/20",
  };
  const catClass = (cat?: string) => CAT_COLORS[cat || ""] || "bg-orange-500/15 text-orange-400 border-orange-500/20";

  // ── Sidebar SEO content injected after Article Info ──
  const sidebarContent = (
    <>
      {/* Related Articles */}
      {recentBlogs.length > 0 && (
        <div className="bp-sidebar-box" style={{ marginTop: 0 }}>
          <div className="bp-sidebar-hd" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Related Articles</span>
            <Link href="/blog" style={{ fontSize: ".65rem", color: "rgba(201,151,58,.6)", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
          </div>
          {recentBlogs.slice(0, 5).map((b: any) => (
            <Link key={b._id} href={`/blog/${b.slug}`} style={{ textDecoration: "none" }}>
              <div className="bp-rel-item">
                {b.coverImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.coverImage} alt={b.title} className="bp-rel-thumb" loading="lazy" />
                ) : (
                  <div className="bp-rel-ph">📰</div>
                )}
                <div className="bp-rel-info">
                  <div className="bp-rel-title">{b.title}</div>
                  <div className="bp-rel-meta" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                    {b.category && (
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${catClass(b.category)}`}>
                        {b.category}
                      </span>
                    )}
                    <span>{fmtDate(b.createdAt)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Trending Searches */}
      <div className="bp-sidebar-box" style={{ marginTop: 0 }}>
        <div className="bp-sidebar-hd">🔍 Trending Searches</div>
        <div className="bp-sidebar-body" style={{ padding: "8px 0" }}>
          {[
            ...(blog.movieTitle ? [
              `${blog.movieTitle} review`,
              `${blog.movieTitle} box office`,
              `${blog.movieTitle} cast`,
              `${blog.movieTitle} songs`,
              `${blog.movieTitle} story`,
            ] : []),
            "Latest Odia movies 2026",
            "Ollywood box office collection",
            "Best Odia films to watch",
          ].slice(0, 7).map((term, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "7px 16px", borderBottom: "1px solid var(--border)",
              fontSize: ".72rem", color: "rgba(255,255,255,.38)",
            }}>
              <span style={{ color: "rgba(201,151,58,.5)", flexShrink: 0 }}>🔍</span>
              {term}
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      {(blog.tags?.length > 0 || blog.category) && (
        <div className="bp-sidebar-box" style={{ marginTop: 0 }}>
          <div className="bp-sidebar-hd">🏷️ Tags</div>
          <div className="bp-sidebar-body" style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {blog.category && (
              <Link href={`/blog/category/${toSlug(blog.category)}`}
                style={{ fontSize: ".68rem", padding: "4px 10px", background: "var(--bg4)", border: "1px solid var(--border2)", borderRadius: 3, color: "rgba(201,151,58,.85)", textDecoration: "none", fontWeight: 600 }}>
                📰 {blog.category}
              </Link>
            )}
            {(blog.tags || []).slice(0, 8).map((tag: string) => (
              <Link key={tag} href={`/blog/tag/${toSlug(tag)}`}
                style={{ fontSize: ".68rem", padding: "4px 10px", background: "var(--bg4)", border: "1px solid var(--border2)", borderRadius: 3, color: "rgba(255,255,255,.4)", textDecoration: "none" }}>
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* About Ollypedia SEO box */}
      <div className="bp-sidebar-box" style={{ marginTop: 0 }}>
        <div className="bp-sidebar-hd">📖 About Ollypedia</div>
        <div className="bp-sidebar-body" style={{ paddingTop: 10 }}>
          <p style={{ fontSize: ".72rem", color: "rgba(255,255,255,.38)", lineHeight: 1.8, margin: "0 0 10px" }}>
            Ollypedia is Odisha&apos;s complete Odia cinema database — covering{" "}
            <Link href="/movies" style={{ color: "rgba(201,151,58,.8)", textDecoration: "none" }}>Ollywood movies</Link>,
            {" "}actors, songs, box office and news.
            {blog.movieTitle && (
              <>{" "}Explore all <Link href={`/blog?movie=${encodeURIComponent(blog.movieTitle)}`}
                style={{ color: "rgba(201,151,58,.8)", textDecoration: "none" }}>{blog.movieTitle} articles</Link> on Ollypedia.</>
            )}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 8px" }}>
            {[
              { label: "🎬 Movies", href: "/movies" },
              { label: "🎵 Songs", href: "/songs" },
              { label: "⭐ Reviews", href: "/blog/category/movie-review" },
              { label: "📊 Box Office", href: "/box-office" },
              { label: "🗞️ News", href: "/blog/category/news" },
            ].map(item => (
              <Link key={item.href} href={item.href} style={{
                fontSize: ".65rem", padding: "4px 10px",
                background: "rgba(201,151,58,.08)", border: "1px solid rgba(201,151,58,.18)",
                borderRadius: 3, color: "rgba(201,151,58,.75)", textDecoration: "none", fontWeight: 600,
              }}>{item.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Author / E-E-A-T */}
      <div className="bp-sidebar-box" style={{ marginTop: 0 }}>
        <div className="bp-sidebar-hd">✍️ Author</div>
        <div className="bp-sidebar-body" style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: "rgba(201,151,58,.18)", borderRadius: "50%",
            flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
            color: "#c9973a", fontSize: ".8rem", fontWeight: 800,
          }}>O</div>
          <div>
            <div style={{ fontSize: ".76rem", fontWeight: 700, color: "var(--text)" }}>
              {blog.author || "Ollypedia Editorial Team"}
            </div>
            <div style={{ fontSize: ".65rem", color: "rgba(255,255,255,.3)", marginTop: 2 }}>
              Specialists in Odia cinema coverage
            </div>
            {blog.createdAt && (
              <div style={{ fontSize: ".62rem", color: "rgba(255,255,255,.22)", marginTop: 4 }}>
                Published: {new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogDetailClient slug={params.slug} initialData={blog} sidebarContent={sidebarContent} />
      <SeoInterlinks blog={blog} movie={movie} />
      <RecentBlogs blogs={recentBlogs} />
    </>
  );
}