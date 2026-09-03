// app/blog/page.tsx
// AdSense-ready: semantic HTML5, structured content, proper headings, no intrusive patterns
// SEO: rich meta, JSON-LD schema, keyword-rich intro section
// Features: 20/page pagination (URL-based), search that works across pages
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { buildMeta } from "@/lib/seo";
import { InFeedAd } from "@/components/ads/InFeedAd";
import { DisplayAd } from "@/components/ads/DisplayAd";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogSearch } from "@/components/blog/BlogSearch";
import { BlogInfiniteScroll } from "@/components/blog/BlogInfiniteScroll";
import { BlogCategoryDropdown } from "@/components/blog/BlogCategoryDropdown";
import { Search, BookOpen, TrendingUp, Star, Eye, Flame, ChevronRight } from "lucide-react";

export const revalidate = 600;

// ── SEO METADATA ──────────────────────────────────────────────────────────────

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  "Box Office":   "Day-wise Odia movie box office collection reports, hit/flop verdicts, and trade analysis for Ollywood films.",
  "Reviews":      "In-depth Odia movie reviews — honest, spoiler-aware breakdowns of the latest Ollywood releases.",
  "Actor":        "Actor profiles, filmographies, and career spotlights for Odia cinema stars.",
  "Songs":        "Top Odia song lists, music guides, and behind-the-scenes coverage from Ollywood.",
  "News":         "Latest Ollywood news, announcements, and industry updates from Odia cinema.",
  "Top Lists":    "Curated top 10 lists covering the best of Ollywood — movies, songs, actors, and more.",
};

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { page?: string; q?: string; category?: string };
}): Promise<Metadata> {
  const page       = parseInt(searchParams.page || "1", 10);
  const query      = searchParams.q || "";
  const category   = searchParams.category || "";
  // We need totalPages for the `next` link — do a lightweight count here.
  // (This runs at build/revalidation time, so the extra query is fine.)
  await connectDB();
  const filter: Record<string, any> = { published: true };
  if (category) filter.category = category;
  const total      = await Blog.countDocuments(filter);
  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  const pageLabel = page > 1 ? ` — Page ${page}` : "";
  const catLabel  = category ? ` | ${category}` : "";

  const title = query
    ? `Search: "${query}" | Blog`
    : category
    ? `${category} Articles${pageLabel} | Blog`
    : `Ollywood Blog${catLabel}${pageLabel} | Odia Cinema News, Reviews & Guides`;

  const description = category && CATEGORY_DESCRIPTIONS[category]
    ? CATEGORY_DESCRIPTIONS[category]
    : query
    ? `Search results for "${query}" on the Ollypedia Blog — Odia cinema news, reviews, and guides.`
    : "Explore the latest Ollywood blog posts — in-depth movie reviews, actor profiles, top 10 lists, song guides, and behind-the-scenes coverage of Odia cinema. Updated weekly.";

  const canonical = category
    ? `${SITE_URL}/blog?category=${encodeURIComponent(category)}${page > 1 ? `&page=${page}` : ""}`
    : page > 1
    ? `${SITE_URL}/blog?page=${page}`
    : `${SITE_URL}/blog`;

  // ── PREV link ──
  const prevPage = page > 1
    ? (page === 2
        ? (category ? `${SITE_URL}/blog?category=${encodeURIComponent(category)}` : `${SITE_URL}/blog`)
        : (category ? `${SITE_URL}/blog?category=${encodeURIComponent(category)}&page=${page - 1}` : `${SITE_URL}/blog?page=${page - 1}`))
    : undefined;

  // ── NEXT link (new) ──
  const nextPage = page < totalPages
    ? (category
        ? `${SITE_URL}/blog?category=${encodeURIComponent(category)}&page=${page + 1}`
        : `${SITE_URL}/blog?page=${page + 1}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(prevPage ? { previous: prevPage } : {}),
      ...(nextPage ? { next: nextPage } : {}),   // ← NEW: helps Google crawl all pages
    },
    robots: query ? { index: false, follow: true } : { index: true, follow: true },
    keywords: [
      "Ollywood blog", "Odia cinema news", "Odia movie reviews", "Ollywood updates",
      "Odia film industry", "Ollywood actor profiles", "Odia songs guide",
      "Odia box office blog", "Ollywood top 10", "Odia cinema 2026",
      ...(category ? [category, `${category} Odia movies`, `Ollywood ${category.toLowerCase()}`] : []),
    ],
    openGraph: {
      title,
      description,
      url:      canonical,
      siteName: "Ollypedia",
      type:     "website",
      locale:   "en_IN",
      images: [{ url: `${SITE_URL}/og-blog.jpg`, width: 1200, height: 630, alt: "Ollypedia Blog — Odia Cinema News & Reviews" }],
    },
    twitter: {
      card:        "summary_large_image",
      title,
      description,
      site:        "@ollypedia",
      images:      [`${SITE_URL}/og-blog.jpg`],
    },
  };
}

// ── JSON-LD SCHEMA ────────────────────────────────────────────────────────────

function BlogSchema({
  blogs,
  mostRecentDate,
  isHomePage,
}: {
  blogs: any[];
  mostRecentDate: string;
  isHomePage: boolean;    // ← NEW: only emit WebSite schema on the root /blog page
}) {
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Ollypedia Blog",
    description: "News, reviews, and guides about Ollywood — the Odia-language film industry based in Bhubaneswar, Odisha.",
    url: `${SITE_URL}/blog`,
    dateModified: mostRecentDate,
    publisher: {
      "@type": "Organization",
      name: "Ollypedia",
      url: `${SITE_URL}`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bhubaneswar",
        addressRegion: "Odisha",
        addressCountry: "IN",
      },
    },
    inLanguage: ["en", "or"],
    genre: "Entertainment",
    about: {
      "@type": "Thing",
      name: "Ollywood",
      description: "The Odia-language film industry",
      sameAs: "https://en.wikipedia.org/wiki/Odia_cinema",
    },
  };

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Latest Ollywood Blog Posts",
    numberOfItems: blogs.length,
    itemListElement: blogs.slice(0, 10).map((b: any, i: number) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/blog/${b.slug}`,
      name: b.title,
      // NEW: richer item data for Google
      image: b.coverImage ?? undefined,
      datePublished: b.createdAt ? new Date(b.createdAt).toISOString() : undefined,
    })),
  };

  // ── NEW: WebSite + SearchAction schema (Sitelinks Searchbox eligibility) ──
  // Only emit on the canonical root blog page — Google ignores duplicates and
  // it's wasteful to repeat on every paginated/category page.
  const websiteSchema = isHomePage
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Ollypedia",
        url: `${SITE_URL}`,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/blog?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      {websiteSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      )}
    </>
  );
}

// ── DATA FETCHING ─────────────────────────────────────────────────────────────

const POSTS_PER_PAGE = 21;

interface SearchParams {
  page?: string;
  q?: string;
  category?: string;
}

async function getBlogs({
  page = 1,
  query = "",
  category = "",
}: {
  page: number;
  query: string;
  category: string;
}) {
  await connectDB();

  const filter: Record<string, any> = { published: true };

  if (query.trim()) {
    filter.$or = [
      { title:    { $regex: query, $options: "i" } },
      { excerpt:  { $regex: query, $options: "i" } },
      { tags:     { $regex: query, $options: "i" } },
      { author:   { $regex: query, $options: "i" } },
      { category: { $regex: query, $options: "i" } },
    ];
  }

  if (category) {
    filter.category = category;
  }

  const total = await Blog.countDocuments(filter);
  const skip  = (page - 1) * POSTS_PER_PAGE;

  const blogs = await Blog.find(filter)
    .select("title slug excerpt category tags coverImage author readTime views createdAt featured")
    .sort({ featured: -1, createdAt: -1 })
    .skip(skip)
    .limit(POSTS_PER_PAGE)
    .lean();

  return {
    blogs: blogs as any[],
    total,
    totalPages: Math.ceil(total / POSTS_PER_PAGE),
  };
}

async function getCategories() {
  await connectDB();
  const cats = await Blog.distinct("category", { published: true });
  return cats.filter(Boolean) as string[];
}

async function getFeaturedBlogs() {
  await connectDB();
  const blogs = await Blog.find({ published: true, featured: true })
    .select("title slug excerpt category coverImage author readTime createdAt tags")
    .sort({ createdAt: -1 })
    .limit(2)
    .lean();
  return blogs as any[];
}

async function getPopularTags() {
  await connectDB();
  const result = await Blog.aggregate([
    { $match: { published: true } },
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
  return result.map((r: any) => ({ tag: r._id as string, count: r.count as number }));
}

async function getTotalViews() {
  await connectDB();
  const result = await Blog.aggregate([
    { $match: { published: true } },
    { $group: { _id: null, total: { $sum: "$views" } } },
  ]);
  return (result[0]?.total as number) || 0;
}

async function getMostPopularPosts() {
  await connectDB();
  const blogs = await Blog.find({ published: true, views: { $gt: 0 } })
    .select("title slug category coverImage views readTime createdAt")
    .sort({ views: -1 })
    .limit(5)
    .lean();
  return blogs as any[];
}

// ── STAT CARDS ────────────────────────────────────────────────────────────────

async function getBlogStats() {
  await connectDB();
  const [totalPosts, totalCategories] = await Promise.all([
    Blog.countDocuments({ published: true }),
    Blog.distinct("category", { published: true }).then((c) => c.length),
  ]);
  return { totalPosts, totalCategories };
}

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default async function BlogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page     = Math.max(1, parseInt(searchParams.page || "1", 10));
  const query    = searchParams.q       || "";
  const category = searchParams.category || "";

  const [{ blogs, total, totalPages }, categories, featured, stats, popularTags, totalViews, mostPopular] =
    await Promise.all([
      getBlogs({ page, query, category }),
      getCategories(),
      query || category ? Promise.resolve([]) : getFeaturedBlogs(),
      getBlogStats(),
      getPopularTags(),
      getTotalViews(),
      query || category ? Promise.resolve([]) : getMostPopularPosts(),
    ]);

  const mostRecentDate = blogs[0]?.createdAt
    ? new Date(blogs[0].createdAt).toISOString()
    : new Date().toISOString();

  const isFiltered   = !!(query || category);
  const isHomePage   = !isFiltered && page === 1;   // ← used for WebSite schema guard
  const showFeatured = !isFiltered && featured.length > 0 && page === 1;
  const regularBlogs = showFeatured
    ? blogs.filter((b) => !featured.find((f) => String(f._id) === String(b._id)))
    : blogs;

  // Related categories — all categories except the one currently active
  const relatedCategories = category
    ? categories.filter((c) => c !== category)
    : [];

  return (
    <>
      <BlogSchema blogs={blogs} mostRecentDate={mostRecentDate} isHomePage={isHomePage} />

      <main className="min-h-screen bg-[#0a0a0a] text-white">

        {/* ── EDITORIAL HEADER & TOP NAV BAR ─────────────────────────────── */}
        <header className="border-b border-[#1c1c1c] bg-[#090909]">
          
          {/* Top Editorial Ticker Bar */}
          <div className="border-b border-[#161616] bg-[#050505] text-[11px] text-zinc-400 py-2">
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-red-500 font-bold uppercase tracking-wider text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  LIVE
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-300 font-medium">
                  {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span className="text-zinc-700 hidden sm:inline">|</span>
                <span className="text-zinc-400 hidden sm:inline">Ollywood Entertainment &amp; Cinema Wire</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-400 text-[11px]">
                <span><strong>{stats.totalPosts}</strong> Stories</span>
                <span className="text-zinc-700">•</span>
                <Link href="/box-office" className="text-orange-400 hover:underline">Box Office Reports</Link>
                <span className="text-zinc-700">•</span>
                <Link href="/discussion" className="text-zinc-300 hover:text-orange-400">Community Meter</Link>
              </div>
            </div>
          </div>

          {/* Newspaper Nameplate & Search */}
          <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-4 sm:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                  <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
                  <span>/</span>
                  <Link href="/blog" className={category ? "hover:text-orange-400 transition-colors" : "text-orange-400 font-semibold"}>Entertainment News</Link>
                  {category && (
                    <>
                      <span>/</span>
                      <span className="text-orange-400 font-semibold">{category}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white font-serif">
                  {category ? (
                    <><span className="text-orange-400">{category}</span> &bull; Ollywood Wire</>
                  ) : query ? (
                    <>Search: <span className="text-orange-400">"{query}"</span></>
                  ) : (
                    <>Ollywood <span className="text-orange-400">Cinema Wire</span></>
                  )}
                </h1>
                <p className="text-zinc-400 text-xs sm:text-sm mt-1">
                  {category && CATEGORY_DESCRIPTIONS[category]
                    ? CATEGORY_DESCRIPTIONS[category]
                    : "Breaking news, honest movie reviews, daily box office analysis, and celebrity interviews from Odisha."}
                </p>
              </div>

              {/* Integrated Search Input & Category Dropdown */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-shrink-0">
                <div className="w-full sm:w-52">
                  <BlogCategoryDropdown currentCategory={category || "All"} categories={categories} />
                </div>
                <div className="w-full sm:w-72">
                  <Suspense>
                    <BlogSearch initialQuery={query} />
                  </Suspense>
                </div>
              </div>
            </div>
          </div>

          {/* Trending News Topics Strip */}
          <div className="border-t border-[#161616] bg-[#070707] py-2 text-xs">
            <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-orange-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 flex-shrink-0">
                <Flame className="w-3 h-3" /> TRENDING:
              </span>
              {[
                { label: "Box Office 2026", href: "/box-office" },
                { label: "OTT Premieres",   href: "/ott" },
                { label: "Upcoming Movies", href: "/movies" },
                { label: "Latest Trailers", href: "/trailers" },
                { label: "Movie Songs",     href: "/songs" },
                { label: "Community Meter", href: "/discussion" },
              ].map((topic) => (
                <Link
                  key={topic.label}
                  href={topic.href}
                  className="flex-shrink-0 text-[11px] text-zinc-400 hover:text-orange-400 transition-colors whitespace-nowrap px-2 py-0.5 rounded hover:bg-white/5"
                >
                  #{topic.label.replace(/\s+/g, "")}
                </Link>
              ))}
            </div>
          </div>
        </header>

        {/* ══ GLOBAL BANNER AD ══ */}
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 mt-6">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-xl border border-[#222]" />
        </div>

        {/* ══ EDITORIAL BODY ══ */}
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8">

          {/* ── SEARCH / FILTER STATUS ── */}
          {isFiltered && (
            <div className="mb-8 p-4 rounded-xl border border-[#1f1f1f] bg-[#0e0e0e] flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-300 font-medium">
                  {total === 0 ? "No articles found" : `Showing ${total} article${total !== 1 ? "s" : ""}`}
                  {query && <> for <strong className="text-white">"{query}"</strong></>}
                  {category && <> in <strong className="text-orange-400">{category}</strong></>}
                </p>
                {category && CATEGORY_DESCRIPTIONS[category] && (
                  <p className="text-xs text-zinc-500 mt-1">{CATEGORY_DESCRIPTIONS[category]}</p>
                )}
              </div>
              <Link href="/blog" className="text-xs font-bold text-orange-400 hover:underline">
                Clear Filters &times;
              </Link>
            </div>
          )}

          {/* ── TOP HEADLINE LEAD SHOWCASE (Indian Express Style 2-Col Lead News) ── */}
          {!isFiltered && page === 1 && blogs.length > 0 && (
            <section aria-label="Top Headline Stories" className="mb-12 border-b border-[#1c1c1c] pb-10">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* ── LEFT: Big Lead Headline Story (7 cols) ── */}
                {blogs[0] && (
                  <article className="lg:col-span-7 group flex flex-col justify-between">
                    <Link href={`/blog/${blogs[0].slug}`} className="block overflow-hidden rounded-2xl border border-zinc-800 bg-[#111] mb-4">
                      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
                        {blogs[0].coverImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={blogs[0].coverImage}
                            alt={blogs[0].title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">📰</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <span className="absolute bottom-4 left-4 px-2.5 py-1 rounded bg-orange-500 text-black font-black text-[10px] uppercase tracking-wider">
                          {blogs[0].category || "Lead Story"}
                        </span>
                      </div>
                    </Link>

                    <div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
                        <span>{new Date(blogs[0].createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>•</span>
                        <span>{blogs[0].readTime || 4} min read</span>
                        <span>•</span>
                        <span className="text-zinc-400">{blogs[0].author || "Ollypedia Desk"}</span>
                      </div>
                      <Link href={`/blog/${blogs[0].slug}`}>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-serif group-hover:text-orange-400 transition-colors leading-tight mb-2">
                          {blogs[0].title}
                        </h2>
                      </Link>
                      {blogs[0].excerpt && (
                        <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">
                          {blogs[0].excerpt.replace(/<[^>]*>/g, " ")}
                        </p>
                      )}
                    </div>
                  </article>
                )}

                {/* ── RIGHT: Top Stories 3-Pack (5 cols) ── */}
                <div className="lg:col-span-5 flex flex-col space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1f1f1f]">
                    <h3 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Top Breaking Stories
                    </h3>
                    <span className="text-[11px] text-zinc-500">Updated Daily</span>
                  </div>

                  <div className="divide-y divide-[#1a1a1a]">
                    {blogs.slice(1, 4).map((b, idx) => (
                      <article key={String(b._id)} className="py-4 first:pt-0 last:pb-0 group">
                        <Link href={`/blog/${b.slug}`} className="flex gap-4 items-start">
                          <span className="text-2xl font-black text-zinc-700 group-hover:text-orange-500 transition-colors font-serif flex-shrink-0 w-6">
                            0{idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-1">
                              {b.category || "Article"}
                            </span>
                            <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-orange-400 transition-colors leading-snug line-clamp-2">
                              {b.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-2">
                              <span>{new Date(b.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>
                              <span>•</span>
                              <span>{b.readTime || 3} min read</span>
                            </div>
                          </div>
                          {b.coverImage && (
                            <div className="w-20 sm:w-24 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-zinc-900 border border-zinc-800">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={b.coverImage} alt={b.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            </div>
                          )}
                        </Link>
                      </article>
                    ))}
                  </div>
                </div>

              </div>
            </section>
          )}

          {/* ── FULL-WIDTH MAGAZINE FEED (Left to Right) ── */}
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#1f1f1f]">
              <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span className="w-1.5 h-4 bg-orange-500 rounded-full inline-block" />
                {isFiltered ? "Search Results" : "All Cinema Stories & Articles"}
              </h3>
              <span className="text-xs text-zinc-500">Showing {blogs.length} articles</span>
            </div>

            {regularBlogs.length > 0 ? (
              <BlogInfiniteScroll
                initialBlogs={regularBlogs}
                totalPages={totalPages}
                searchParams={{ page: page.toString(), q: query, category }}
              />
            ) : (
              <div className="text-center py-20 bg-[#0e0e0e] rounded-2xl border border-zinc-800">
                <Search className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-300 font-bold mb-1">No articles found</p>
                <p className="text-zinc-500 text-xs mb-4">Try searching for other keywords or explore categories above.</p>
                <Link href="/blog" className="text-xs text-orange-400 font-bold hover:underline">
                  Browse All Stories
                </Link>
              </div>
            )}
          </div>

          {/* ── RELATED CATEGORIES ── */}
          {isFiltered && category && relatedCategories.length > 0 && (
            <nav
              aria-label="Explore other categories"
              className="mt-10 pt-8 border-t border-white/6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-4 bg-orange-500/50 rounded-full" aria-hidden />
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Explore More Categories
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={`/blog?category=${encodeURIComponent(cat)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400
                      hover:text-orange-400 border border-white/10 hover:border-orange-500/30
                      bg-white/3 hover:bg-orange-500/5 rounded-full px-3 py-1.5 transition-all"
                  >
                    {cat} →
                  </Link>
                ))}
              </div>
            </nav>
          )}

          {/* ── SEO CONTENT SECTION ── */}
          {!isFiltered && page === 1 && (
            <section
              aria-labelledby="about-blog-heading"
              className="mt-16 pt-10 border-t border-white/8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Left column */}
                <div>
                  <h2
                    id="about-blog-heading"
                    className="text-xl font-bold text-white mb-4"
                  >
                    About the Ollypedia Cinema Wire
                  </h2>
                  <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                    <p>
                      The <strong className="text-gray-300">Ollypedia Cinema Wire</strong> is your definitive guide to{" "}
                      <strong className="text-gray-300">Odia cinema</strong>, popularly known as{" "}
                      <strong className="text-gray-300">Ollywood</strong>. We cover everything from blockbuster
                      movie releases to indie films, from celebrated actors to emerging talent shaping the
                      future of Odisha's film industry.
                    </p>
                    <p>
                      Our <strong className="text-gray-300">movie reviews</strong> give you honest, spoiler-aware
                      breakdowns of the latest Odia films. Our{" "}
                      <strong className="text-gray-300">actor spotlights</strong> go deep into the careers and
                      filmographies of Ollywood stars like Babushan Mohanty, Elina Samantray, Sabyasachi
                      Mishra, and many more.
                    </p>
                  </div>

                  <p className="mt-4 text-xs text-gray-600">
                    Last updated:{" "}
                    <time dateTime={mostRecentDate}>
                      {new Date(mostRecentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </time>
                  </p>
                </div>

                {/* Right column */}
                <div>
                  <h3 className="text-base font-bold text-white mb-4">What You'll Find Here</h3>
                  <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                    <p>
                      Looking for the best Odia songs? Our{" "}
                      <strong className="text-gray-300">song guides and top 10 lists</strong> curate the finest
                      music from decades of Ollywood — from classical devotional numbers to modern romantic
                      hits and high-energy dance numbers.
                    </p>
                    <p>
                      Bookmark this page and return every week for fresh{" "}
                      <strong className="text-gray-300">Ollywood news, reviews, and analysis</strong> — all
                      written by passionate fans and experts of Odia cinema culture.
                    </p>
                  </div>

                  {/* Internal links */}
                  <div className="mt-5 flex flex-wrap gap-2">
                    {[
                      { label: "Box Office",      href: "/box-office" },
                      { label: "Browse Cast",     href: "/cast" },
                      { label: "Box Office News", href: "/blog?category=Box+Office" },
                      { label: "Movie Reviews",   href: "/blog?category=Reviews" },
                      { label: "Actor Profiles",  href: "/blog?category=Actor" },
                      { label: "Top Lists",       href: "/blog?category=Top+Lists" },
                      { label: "Odia Songs",      href: "/blog?category=Songs" },
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/12 text-gray-400 hover:text-orange-400 hover:border-orange-500/40 transition-all"
                      >
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

        </div>
      </main>
    </>
  );
}