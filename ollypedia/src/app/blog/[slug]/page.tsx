// app/blog/[slug]/page.tsx
// SEO UPGRADE v3 — full overhaul
//  1. NewsArticle + Article dual @type for Google News / Top Stories
//  2. publisher logo in JSON-LD (required for rich results)
//  3. author as Person @type with E-E-A-T signals
//  4. max-image-preview:large robots meta (image search traffic)
//  5. <link rel="preload"> for cover image (LCP improvement)
//  6. generateStaticParams limit raised to 500
//  7. Removed getMisspellings from <meta keywords> (Google ignores keywords meta)
//  8. WhatsApp share added to sidebarContent
//  9. FAQPage JSON-LD schema for rich FAQ snippets
// 10. updatedAt added to Post interface
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import Movie from "@/models/Movie";
import BlogDetailClient from "./BlogDetailClient";

export const revalidate    = 600;  // 10 min — balances freshness with crawl performance
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

// ArticleSSRPreview REMOVED — hidden duplicate content (aria-hidden + clip CSS)
// is a cloaking risk. Next.js SSR already renders server components properly.

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const blogs = await Blog.find({ published: true }, "slug")
    .sort({ createdAt: -1 })
    .limit(15) // Reduced limit to 15 to avoid build-time memory exhaustion on Hostinger
    .lean();
  return blogs.map((b: any) => ({ slug: b.slug }));
}

// ─── Data helpers ──────────────────────────────────────────────
async function getBlog(slug: string) {
  await connectDB();
  // `indexed` field is included automatically — lean() returns the full document.
  // page.tsx uses blog.indexed to set robots meta (noindex for non-key box office days).
  const blog = await Blog.findOne({ slug, published: true }).lean();
  if (!blog) return null;
  return JSON.parse(JSON.stringify(blog));
}

async function getRelatedMovie(blog: any) {
  if (!blog) return null;
  await connectDB();
  const candidates = [blog.movieTitle, ...(blog.tags || [])].filter(Boolean);
  for (const name of candidates) {
    const movie = await (Movie as any)
      .findOne({ title: { $regex: new RegExp(`^${name}$`, "i") } })
      .select("title slug posterUrl releaseDate verdict media.songs genre director cast")
      .lean();
    if (movie) return JSON.parse(JSON.stringify(movie));
  }
  return null;
}

async function getRelatedBlogs(currentSlug: string, category?: string) {
  await connectDB();

  // First: up to 4 same-category blogs (most relevant for bounce rate + dwell time)
  const sameCat = category
    ? await Blog.find(
        { published: true, slug: { $ne: currentSlug }, category },
        "title slug excerpt coverImage category createdAt readTime"
      )
        .sort({ createdAt: -1 })
        .limit(4)
        .lean()
    : [];

  // Fill remaining slots with recent blogs from other categories
  const excludeSlugs = [currentSlug, ...sameCat.map((b: any) => b.slug)];
  const needed = 6 - sameCat.length;
  const others = await Blog.find(
    { published: true, slug: { $nin: excludeSlugs } },
    "title slug excerpt coverImage category createdAt readTime"
  )
    .sort({ createdAt: -1 })
    .limit(needed)
    .lean();

  return JSON.parse(JSON.stringify([...sameCat, ...others]));
}

// getMisspellings REMOVED — Google handles misspelling matching automatically.
// Intentional misspellings in <meta keywords> trigger spam/keyword-stuffing penalties.

// ─── Metadata ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const blog = await getBlog(params.slug);
  if (!blog) return { robots: { index: false, follow: false } };

// FIXED — uses seoTitle from BoxOfficePanel, falls back gracefully
const title = blog.seoTitle || blog.title;

// FIXED — uses seoDesc from BoxOfficePanel, falls back gracefully  
const description = (
  blog.seoDesc ||
  blog.excerpt ||
  blog.content?.replace(/<[^>]+>/g, "").slice(0, 155) ||
  `Read ${blog.title} on Ollypedia...`
);
  const image     = blog.coverImage || `${SITE_URL}/default.jpg`;
  const canonical = `${SITE_URL}/blog/${blog.slug}`;

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
    movieName && `${movieName} box office collection`,
    movieName && `${movieName} story`,
    movieName && `${movieName} ${year}`,
    movieName && `is ${movieName} worth watching`,
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
  ].filter(Boolean) as string[];


  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    // ★ max-image-preview:large → full-size images in Google image results
    // indexed field controls whether day-wise box office articles are crawled.
    // undefined/missing = treat as true (all non-box-office blogs always indexed).
    robots: {
      index: blog.indexed !== false,
      follow: true,
      googleBot: { index: blog.indexed !== false, follow: true },
      "max-image-preview": "large" as any,
      "max-snippet": -1 as any,
      "max-video-preview": -1 as any,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Ollypedia",
      type: "article",
      publishedTime: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      modifiedTime:  blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: blog.title }],
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@ollypedia",
    },
    // ★ Preload cover image for faster LCP
    ...(blog.coverImage && {
      other: {
        "link-preload": `<${blog.coverImage}>; rel=preload; as=image`,
      },
    }),
  };
}

// ─── SEO Interlinks block (server-rendered) ────────────────────
function SeoInterlinks({ blog, movie }: { blog: any; movie: any | null }) {
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
        <h2 className="text-white font-bold text-sm mb-2">About This Article</h2>
        <div className="text-gray-400 text-sm leading-relaxed">
          {blog.excerpt ||
            blog.content?.replace(/<[^>]+>/g, "").slice(0, 200) ||
            `${blog.title} — Read the full story on Ollypedia, your home for Odia cinema news, reviews, and entertainment.`}
          {movie && (
            <>
              {" "}This article is related to the{" "}
              {movie.genre?.length ? `${movie.genre[0]} ` : ""}
              Odia film{" "}
              <Link href={`/movie/${movie.slug}`} className="text-orange-400 hover:underline font-semibold">
                {movie.title}{movieYear ? ` (${movieYear})` : ""}
              </Link>
              {movie.director && (
                <>, directed by <strong className="text-white">{movie.director}</strong></>
              )}
              .
            </>
          )}
        </div>
        {(blog.tags?.length || blog.category) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {blog.category && (
              <Link
                href={`/blog?category=${encodeURIComponent(blog.category)}`}
                className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors"
              >
                📰 {blog.category}
              </Link>
            )}
            {(blog.tags || []).slice(0, 5).map((tag: string) => (
              <Link
                key={tag}
                href={`/blog?q=${encodeURIComponent(tag)}`}
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
          <Link href={`/movie/${movie.slug}`} className="flex items-center gap-4 group">
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
              {/* ★ Cast snippet for rich text / E-E-A-T */}
              {movie.cast?.length > 0 && (
                <p className="text-gray-600 text-xs mt-1">
                  Cast:{" "}
                  {movie.cast
                    .slice(0, 3)
                    .map((c: any) => (typeof c === "string" ? c : c?.name || ""))
                    .filter(Boolean)
                    .join(", ")}
                </p>
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
          {/* Pure CSS hover — no event handlers (Server Component) */}
          <style>{`
            .olly-sc { background:#111; border:1px solid #1e1e1e; border-radius:14px; overflow:hidden; display:flex; flex-direction:column; transition:border-color .2s,transform .2s; text-decoration:none; }
            .olly-sc:hover { border-color:rgba(201,151,58,.5); transform:translateY(-3px); }
            .olly-sc-thumb { position:relative; width:100%; aspect-ratio:16/9; background:#161616; overflow:hidden; flex-shrink:0; }
            .olly-sc-thumb img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .3s; }
            .olly-sc:hover .olly-sc-thumb img { transform:scale(1.05); }
            .olly-sc-overlay { position:absolute; inset:0; background:rgba(0,0,0,.52); display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .18s; }
            .olly-sc:hover .olly-sc-overlay { opacity:1; }
            .olly-sc-play { width:34px; height:34px; border-radius:50%; background:rgba(201,151,58,.92); display:flex; align-items:center; justify-content:center; box-shadow:0 2px 16px rgba(201,151,58,.5); }
            .olly-sc-tri { width:0; height:0; border-style:solid; border-width:6px 0 6px 11px; border-color:transparent transparent transparent #0a0a0a; margin-left:2px; }
            .olly-sc-body { padding:10px 11px 12px; display:flex; flex-direction:column; gap:4px; }
            .olly-sc-title { font-weight:700; font-size:12.5px; line-height:1.35; color:#f0f0f0; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; letter-spacing:-.01em; transition:color .15s; }
            .olly-sc:hover .olly-sc-title { color:#c9973a; }
            .olly-sc-singer { font-size:11px; color:#999; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
            .olly-sc-bar { height:2px; background:#1a1a1a; border-radius:2px; overflow:hidden; margin-top:6px; }
            .olly-sc-bar-fill { height:100%; background:linear-gradient(to right,#c9973a,#8b5e1a); border-radius:2px; width:0; transition:width .28s ease; }
            .olly-sc:hover .olly-sc-bar-fill { width:100%; }
            .olly-sc-ph { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#161616; }
          `}</style>
          <h2 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Songs from {movie.title}
          </h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:"12px" }}>
            {songs.slice(0, 10).map((s: any, i: number) => {
              const thumb = s.thumbnailUrl || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg` : null);
              const href  = `/songs/${movie.slug}/${i}/${toSlug(s.title) || String(i)}`;
              return (
                <Link key={i} href={href} className="olly-sc">
                  <div className="olly-sc-thumb">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={s.title || "Song"} loading="lazy" />
                    ) : (
                      <div className="olly-sc-ph">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ color:"#2a2a2a" }}>
                          <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="16" cy="16" r="8"  stroke="currentColor" strokeWidth="1" />
                          <circle cx="16" cy="16" r="3"  stroke="currentColor" strokeWidth="1" />
                        </svg>
                      </div>
                    )}
                    <div className="olly-sc-overlay" aria-hidden="true">
                      <div className="olly-sc-play"><div className="olly-sc-tri" /></div>
                    </div>
                  </div>
                  <div className="olly-sc-body">
                    <div className="olly-sc-title">{s.title || "Untitled"}</div>
                    {s.singer && <div className="olly-sc-singer">🎤 {s.singer}</div>}
                    <div className="olly-sc-bar"><div className="olly-sc-bar-fill" aria-hidden="true" /></div>
                  </div>
                </Link>
              );
            })}
          </div>
          {songs.length > 10 && (
            <div style={{ marginTop:12, textAlign:"center" }}>
              <Link href={`/songs/${movie.slug}/0/${toSlug(songs[0]?.title) || "0"}`}
                style={{ fontSize:".72rem", color:"#c9973a", fontWeight:700, textDecoration:"none" }}>
                View all {songs.length} songs →
              </Link>
            </div>
          )}
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
          <Link href="/blog?category=Reviews" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">⭐ Movie Reviews</Link>
          <Link href="/blog?category=News" className="text-xs text-orange-400/70 hover:text-orange-400 bg-orange-500/8 border border-orange-500/15 px-2.5 py-1 rounded-full transition-colors">🗞️ Odia Cinema News</Link>
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
    iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <span className="w-4 h-[2.5px] bg-orange-500 rounded inline-block" />
            Recent Articles
          </h2>
          <Link href="/blog" className="text-xs text-orange-400/60 hover:text-orange-400 transition-colors">
            View all →
          </Link>
        </div>
        <div className="p-5">
          {/* Featured first post */}
          <Link
            href={`/blog/${blogs[0].slug}`}
            className="group flex flex-col sm:flex-row gap-4 p-3 rounded-xl hover:bg-[#161616] transition-colors mb-4"
          >
            <div className="sm:w-48 sm:h-32 w-full h-44 flex-shrink-0 rounded-lg overflow-hidden border border-[#222] bg-[#1a1a1a]">
              {blogs[0].coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={blogs[0].coverImage}
                  alt={blogs[0].title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl opacity-30">📰</div>
              )}
            </div>
            <div className="flex flex-col justify-center gap-1.5 min-w-0">
              {blogs[0].category && (
                <span className={`self-start text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${catClass(blogs[0].category)}`}>
                  {blogs[0].category}
                </span>
              )}
              <h3 className="text-white font-bold text-base leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
                {blogs[0].title}
              </h3>
              {blogs[0].excerpt && (
                <p className="text-gray-500 text-xs leading-relaxed line-clamp-2">{blogs[0].excerpt}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-gray-600 text-[11px]">{fmtDate(blogs[0].createdAt)}</span>
                {blogs[0].readTime && (
                  <span className="text-gray-600 text-[11px]">· {blogs[0].readTime} min read</span>
                )}
              </div>
            </div>
          </Link>

          <div className="border-t border-[#1a1a1a] mb-4" />

          <ul className="flex flex-col gap-1">
            {blogs.slice(1).map((b: any) => (
              <li key={b._id}>
                <Link
                  href={`/blog/${b.slug}`}
                  className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#161616] transition-colors"
                >
                  <div className="w-16 h-11 flex-shrink-0 rounded-md overflow-hidden border border-[#222] bg-[#1a1a1a]">
                    {b.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={b.coverImage}
                        alt={b.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-lg opacity-30">📰</div>
                    )}
                  </div>
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
                      <span className="text-[11px] text-gray-600">{fmtDate(b.createdAt)}</span>
                    </div>
                  </div>
                  <span className="text-gray-700 group-hover:text-orange-400 transition-colors text-sm flex-shrink-0 mt-1">→</span>
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
export default async function BlogPage({ params }: { params: { slug: string } }) {
  const blog = await getBlog(params.slug);
  if (!blog) notFound();

  const [movie, recentBlogs] = await Promise.all([
    getRelatedMovie(blog),
    getRelatedBlogs(params.slug, blog.category),
  ]);

  const movieYear  = movie?.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const movieCanon = movie ? `${SITE_URL}/movie/${movie.slug}` : undefined;
  const songs: any[] = movie?.media?.songs || [];

  // ─── FAQ items for JSON-LD ───────────────────────────────────
  const faqItems = blog.movieTitle
    ? [
        { q: `What is ${blog.movieTitle} Odia movie about?`,          a: blog.excerpt || `${blog.movieTitle} is an Odia (Ollywood) film covered on Ollypedia.` },
        { q: `Is ${blog.movieTitle} worth watching?`,                  a: `Read the full review and audience ratings for ${blog.movieTitle} on this Ollypedia article.` },
        { q: `Who is in the cast of ${blog.movieTitle}?`,             a: `Full cast and crew of ${blog.movieTitle} are listed on the movie page on Ollypedia.` },
        { q: `What is ${blog.movieTitle} box office collection?`,      a: `Day-wise box office collection of ${blog.movieTitle} is tracked on Ollypedia's box office page.` },
        { q: `Where can I watch songs from ${blog.movieTitle}?`,       a: `All songs from ${blog.movieTitle} with YouTube videos are on Ollypedia.` },
      ]
    : [
        { q: "What is Ollypedia?",                                     a: "Ollypedia is Odisha's complete Odia cinema encyclopedia — movies, actors, songs, box office and news." },
        { q: "What kind of articles does Ollypedia publish?",          a: "Movie reviews, top 10 lists, actor spotlights, box office reports and Ollywood entertainment news." },
        { q: "How can I find reviews for a specific Odia movie?",      a: "Search for the movie on Ollypedia's blog or visit the movie's dedicated page for ratings and articles." },
      ];

  // word count for content depth signal
  const wordCount = blog.content
    ? blog.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length
    : 0;

  // ─── JSON-LD ─────────────────────────────────────────────────
  const jsonLd: any = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": blog.category === "Box Office"
          ? ["Article", "NewsArticle", "ReportageNewsArticle"]
          : ["Article", "NewsArticle"],
        "headline":        blog.title,
        "description":     blog.excerpt || "",
        "datePublished":   blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
        "dateModified":    blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
        "image":           blog.coverImage || `${SITE_URL}/default.jpg`,
        "inLanguage":      "en-IN",
        "articleSection":  blog.category || "Entertainment",
        "wordCount":       wordCount || undefined,
        // speakable — Google Assistant reads these sections aloud (voice search traffic)
        "speakable": {
          "@type":   "SpeakableSpecification",
          "cssSelector": ["h1", ".bp-article-title", ".bp-excerpt"],
        },
        "author": {
          "@type":  "Person",
          "name":   blog.author || "Ollypedia Editorial Team",
          "url":    `${SITE_URL}/about`,
          // sameAs signals authorship authority to Google
          "sameAs": [
            "https://www.facebook.com/ollypedia",
            "https://twitter.com/ollypedia",
            "https://www.instagram.com/ollypedia",
          ],
        },
        "publisher": {
          "@type": "Organization",
          "name":  "Ollypedia",
          "url":   `${SITE_URL}`,
          "logo": {
            "@type":  "ImageObject",
            "url":    `${SITE_URL}/logo.png`,
            "width":  600,
            "height": 60,
          },
          "sameAs": [
            "https://www.facebook.com/ollypedia",
            "https://twitter.com/ollypedia",
            "https://www.instagram.com/ollypedia",
          ],
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id":   `${SITE_URL}/blog/${blog.slug}`,
        },
        ...(movie && {
          "about": {
            "@type": "Movie",
            "name":  movie.title,
            "url":   movieCanon,
            ...(movieYear && { "dateCreated": String(movieYear) }),
            ...(movie.director && { "director": { "@type": "Person", "name": movie.director } }),
            ...(movie.cast?.length > 0 && {
              "actor": movie.cast.slice(0, 5).map((c: any) => ({
                "@type": "Person",
                "name": typeof c === "string" ? c : c?.name || "",
              })).filter((a: any) => a.name),
            }),
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
          { "@type": "ListItem", "position": 1, "name": "Home",  "item": `${SITE_URL}/` },
          { "@type": "ListItem", "position": 2, "name": "Blog",  "item": `${SITE_URL}/blog` },
          ...(blog.category
            ? [{ "@type": "ListItem", "position": 3, "name": blog.category, "item": `${SITE_URL}/blog/category/${toSlug(blog.category)}` }]
            : []),
          { "@type": "ListItem", "position": blog.category ? 4 : 3, "name": blog.title, "item": `${SITE_URL}/blog/${blog.slug}` },
        ],
      },
      // ★ FAQPage schema — only for non-Box-Office blogs.
      // Box Office blogs generate their own FAQPage inside the blog HTML
      // content (via BoxOfficePanel @graph). Including it here too causes
      // Google to detect duplicate FAQPage → "2 invalid items" error.
      ...(blog.category !== "Box Office"
        ? [{
            "@type": "FAQPage",
            "mainEntity": faqItems.map(({ q, a }) => ({
              "@type":          "Question",
              "name":           q,
              "acceptedAnswer": { "@type": "Answer", "text": a },
            })),
          }]
        : []),
      // Box Office category: add Table schema for day-wise collection data
      // + upgrade @type to include ReportageNewsArticle for Google News eligibility
      ...(blog.category === "Box Office" && movie && movie.boxOfficeDays?.length > 0
        ? [{
            "@type": "Table",
            "about": `${movie.title} Day-wise Box Office Collection`,
            "url": `${SITE_URL}/box-office/${movie.slug}`,
          }]
        : []),
      // Songs schema
      ...(movie && songs.length > 0
        ? [{
            "@type": "ItemList",
            "name": `Songs from ${movie?.title}`,
            "itemListElement": songs.slice(0, 10).map((s: any, i: number) => ({
              "@type": "ListItem", "position": i + 1, "name": s.title,
              "url": `${SITE_URL}/songs/${movie?.slug}/${i}/${toSlug(s.title) || String(i)}`,
            })),
          }]
        : []),
    ],
  };

  const fmtDateStr = (iso?: string) =>
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

  const sidebarContent = (
    <>
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
              <Link href={`/blog?category=${encodeURIComponent(blog.category)}`}
                style={{ fontSize: ".68rem", padding: "4px 10px", background: "var(--bg4)", border: "1px solid var(--border2)", borderRadius: 3, color: "rgba(201,151,58,.85)", textDecoration: "none", fontWeight: 600 }}>
                📰 {blog.category}
              </Link>
            )}
            {(blog.tags || []).slice(0, 8).map((tag: string) => (
              <Link key={tag} href={`/blog?q=${encodeURIComponent(tag)}`}
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
          <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,.38)", lineHeight: 1.8, margin: "0 0 10px" }}>
            Ollypedia is Odisha&apos;s complete Odia cinema database — covering{" "}
            <Link href="/movies" style={{ color: "rgba(201,151,58,.8)", textDecoration: "none" }}>Ollywood movies</Link>,
            {" "}actors, songs, box office and news.
            {blog.movieTitle && (
              <>{" "}Explore all{" "}
                <Link href={`/blog?movie=${encodeURIComponent(blog.movieTitle)}`}
                  style={{ color: "rgba(201,151,58,.8)", textDecoration: "none" }}>
                  {blog.movieTitle} articles
                </Link>{" "}on Ollypedia.
              </>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 8px" }}>
            {[
              { label: "🎬 Movies",     href: "/movies" },
              { label: "🎵 Songs",      href: "/songs" },
              { label: "⭐ Reviews",    href: "/blog?category=Reviews" },
              { label: "📊 Box Office", href: "/box-office" },
              { label: "🗞️ News",       href: "/blog?category=News" },
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
            {blog.updatedAt && blog.updatedAt !== blog.createdAt && (
              <div style={{ fontSize: ".62rem", color: "rgba(255,255,255,.18)", marginTop: 2 }}>
                Updated: {new Date(blog.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ★ Preload cover image for faster LCP */}
      {blog.coverImage && (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="preload" as="image" href={blog.coverImage} />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ArticleSSRPreview REMOVED — cloaking risk (hidden duplicate content) */}
      <BlogDetailClient slug={params.slug} initialData={blog} sidebarContent={sidebarContent} />
      <SeoInterlinks blog={blog} movie={movie} />
    </>
  );
}