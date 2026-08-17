// app/blog/page.tsx
// AdSense-ready: semantic HTML5, structured content, proper headings, no intrusive patterns
// SEO: rich meta, JSON-LD schema, keyword-rich intro section
// Features: 20/page pagination (URL-based), search that works across pages
import { SITE_URL } from "@/lib/seo";

import type { Metadata } from "next";
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

        {/* ── HERO / SEO HEADER ─────────────────────────────────────────── */}
        <header className="relative overflow-hidden border-b border-white/6" style={{ background: "linear-gradient(135deg, #050505 0%, #0f0500 40%, #080010 100%)" }}>
          <div className="absolute inset-0 pointer-events-none">
            {/* Animated Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[900px] h-[600px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />
            <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(239,68,68,0.07) 0%, transparent 70%)" }} />
            <div className="absolute -right-20 bottom-0 w-[500px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(ellipse, rgba(168,85,247,0.06) 0%, transparent 70%)" }} />
            
            <div className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: "linear-gradient(rgba(249,115,22,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.5) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }} />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

            {/* Breadcrumb — SEO + AdSense loves clear site structure */}
            <nav aria-label="Breadcrumb" className="mb-10">
              <ol
                className="flex items-center gap-1.5 text-xs text-gray-500"
                itemScope
                itemType="https://schema.org/BreadcrumbList"
              >
                <li itemScope itemType="https://schema.org/ListItem" itemProp="itemListElement">
                  <a href="/" itemProp="item" className="hover:text-orange-400 transition-colors">
                    <span itemProp="name">Home</span>
                  </a>
                  <meta itemProp="position" content="1" />
                </li>
                <span aria-hidden className="mx-0.5">
                  <ChevronRight className="w-3 h-3" />
                </span>
                <li itemScope itemType="https://schema.org/ListItem" itemProp="itemListElement">
                  {category ? (
                    <>
                      <a href="/blog" itemProp="item" className="hover:text-orange-400 transition-colors">
                        <span itemProp="name">Blog</span>
                      </a>
                      <meta itemProp="position" content="2" />
                    </>
                  ) : (
                    <>
                      <span itemProp="name" className="text-gray-400">Blog</span>
                      <meta itemProp="position" content="2" />
                    </>
                  )}
                </li>
                {category && (
                  <>
                    <span aria-hidden className="mx-0.5">
                      <ChevronRight className="w-3 h-3" />
                    </span>
                    <li itemScope itemType="https://schema.org/ListItem" itemProp="itemListElement">
                      <span itemProp="name" className="text-gray-400">{category}</span>
                      <meta itemProp="position" content="3" />
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <div className="relative grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* ── LEFT: Text content ── */}
              <div className="space-y-8">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-bold uppercase tracking-widest"
                  style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", background: "rgba(249,115,22,0.08)" }}>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  <BookOpen className="w-3.5 h-3.5" />
                  {category ? `${category} Articles` : "Odia Cinema Blog"}
                </div>

                {/* Heading */}
                <div>
                  <h1 className="font-black text-white leading-[1.05]" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
                    <span className="block text-gray-300 font-extrabold" style={{ fontSize: "0.55em", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "0.3em", color: "rgba(249,115,22,0.7)" }}>
                      Ollywood Reading
                    </span>
                    {category ? (
                      <>{category} <span style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Articles</span></>
                    ) : query ? (
                      <>Search <span style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Results</span></>
                    ) : (
                      <>Ollywood <span style={{ background: "linear-gradient(135deg, #f97316 0%, #ef4444 60%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Blog</span></>
                    )}
                  </h1>
                </div>

                {/* Description */}
                <p className="text-gray-400 leading-relaxed max-w-lg" style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.1rem)" }}>
                  {category && CATEGORY_DESCRIPTIONS[category]
                    ? CATEGORY_DESCRIPTIONS[category]
                    : query
                    ? `Showing results for "${query}" across all Odia cinema articles.`
                    : <>In-depth movie reviews, actor profiles, top lists, song breakdowns and news from <strong className="text-gray-300 font-medium">Odia cinema</strong> — updated every week.</>
                  }
                </p>

                {/* Stats row */}
                <div className="flex flex-wrap gap-6 pt-6 border-t border-white/[0.06]">
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{stats.totalPosts}</div>
                    <div className="text-xs text-gray-600 font-medium mt-0.5">Total Articles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">{stats.totalCategories}</div>
                    <div className="text-xs text-orange-500 font-medium mt-0.5">Categories</div>
                  </div>
                  {totalViews > 0 && (
                    <div className="text-center">
                      <div className="text-2xl font-black text-white">
                        {totalViews >= 1_000_000 ? `${(totalViews / 1_000_000).toFixed(1)}M` : totalViews >= 1_000 ? `${(totalViews / 1_000).toFixed(0)}K` : totalViews}
                      </div>
                      <div className="text-xs text-yellow-500 font-medium mt-0.5">Total Reads</div>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="text-2xl font-black text-white">24/7</div>
                    <div className="text-xs text-purple-500 font-medium mt-0.5">Updates</div>
                  </div>
                </div>
              </div>

              {/* ── RIGHT: Visual panel ── */}
              <div className="absolute right-0 sm:-right-4 top-0 lg:relative lg:right-auto lg:top-auto flex items-center justify-center min-h-[300px] lg:min-h-[400px] scale-[0.55] sm:scale-75 lg:scale-100 origin-top-right lg:origin-center pointer-events-none lg:pointer-events-auto opacity-20 sm:opacity-40 lg:opacity-100 z-0 lg:z-10">
                
                {/* Outer ring glow */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-80 h-80 rounded-full border border-orange-500/10 animate-[pulse_4s_ease-in-out_infinite]" />
                  <div className="absolute w-64 h-64 rounded-full border border-orange-500/15" />
                </div>

                {/* Center Icon */}
                <div className="relative z-10 flex flex-col items-center gap-6">
                  
                  {/* Main visual */}
                  <div className="relative">
                    <div className="w-40 h-40 rounded-full flex items-center justify-center shadow-2xl animate-[spin_20s_linear_infinite]"
                      style={{
                        background: "linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(239,68,68,0.15) 100%)",
                        border: "1px solid rgba(249,115,22,0.25)",
                        boxShadow: "0 0 80px rgba(249,115,22,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}>
                      <BookOpen className="w-20 h-20 text-orange-400" strokeWidth={1.2} />
                    </div>
                    {/* Play badge */}
                    <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                      style={{ background: "linear-gradient(135deg, #ef4444, #f97316)" }}>
                      <Star className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>

                  {/* Floating cards around the center */}
                  <div className="absolute -top-16 -left-20 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "3s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <Flame className="w-3 h-3" /> Hot News
                  </div>

                  <div className="absolute top-1/2 -right-24 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "2.5s", animationDelay: "1s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(249,115,22,0.3)", color: "#f97316", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <TrendingUp className="w-3 h-3" /> Movie Reviews
                  </div>

                  <div className="absolute -bottom-10 left-0 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-bounce"
                    style={{ animationDuration: "3.5s", animationDelay: "0.5s", background: "rgba(15,15,15,0.95)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                    <Eye className="w-3 h-3" /> Deep Analysis
                  </div>
                </div>
              </div>
            </div>

            {/* Unified Search & Category Row */}
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 border-t border-white/[0.06] pt-8">
              <div className="w-full sm:flex-1 sm:max-w-md">
                <Suspense>
                  <BlogSearch initialQuery={query} />
                </Suspense>
              </div>
              <div className="w-full sm:w-auto">
                {categories.length > 0 && (
                  <BlogCategoryDropdown currentCategory={category || "All"} categories={categories} />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* ══ GLOBAL BANNER AD ══ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <DisplayAd slot="8191172163" format="horizontal" className="rounded-xl border border-[#222]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── SEARCH RESULT CONTEXT ───────────────────────────────────── */}
          {isFiltered && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">
                  {total === 0
                    ? "No results found"
                    : `Found ${total} article${total !== 1 ? "s" : ""}`}
                  {query    && <> for <strong className="text-white">"{query}"</strong></>}
                  {category && <> in <strong className="text-orange-400">{category}</strong></>}
                </p>
                <a
                  href="/blog"
                  className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4"
                >
                  Clear filters
                </a>
              </div>
              {/* Category description — keyword-rich copy for category pages */}
              {category && CATEGORY_DESCRIPTIONS[category] && (
                <p className="text-xs text-gray-600 leading-relaxed border border-[#1c1c1c]
                  bg-[#0f0f0f] rounded-xl px-4 py-3">
                  {CATEGORY_DESCRIPTIONS[category]}
                </p>
              )}
            </div>
          )}

          {/* ── FEATURED POSTS ───────────────────────────────────────────── */}
          {showFeatured && (
            <section aria-labelledby="featured-heading" className="mb-12">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-5 bg-orange-500 rounded-full" aria-hidden />
                <h2
                  id="featured-heading"
                  className="text-xs font-black uppercase tracking-widest text-orange-400"
                >
                  Featured Articles
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {featured.map((b) => (
                  <BlogCard key={String(b._id)} blog={b} variant="featured" />
                ))}
              </div>
            </section>
          )}

          {/* ── MAIN ARTICLE GRID ────────────────────────────────────────── */}
          {regularBlogs.length > 0 ? (
            <section aria-labelledby="articles-heading">
              {!isFiltered && (
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1 h-5 bg-gray-600 rounded-full" aria-hidden />
                  <h2
                    id="articles-heading"
                    className="text-xs font-black uppercase tracking-widest text-gray-500"
                  >
                    {page > 1 ? `Page ${page} — All Articles` : "All Articles"}
                  </h2>
                  <span className="ml-auto text-xs text-gray-600">
                    Showing {(page - 1) * POSTS_PER_PAGE + 1}–
                    {Math.min(page * POSTS_PER_PAGE, total)} of {total}
                  </span>
                </div>
              )}

              <BlogInfiniteScroll
                initialBlogs={regularBlogs}
                totalPages={totalPages}
                searchParams={{ page: page.toString(), q: query, category }}
              />
            </section>
          ) : (
            <div className="text-center py-24">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg font-semibold mb-1">No articles found</p>
              <p className="text-gray-600 text-sm mb-4">
                {query ? `We couldn't find anything matching "${query}".` : "No posts published yet."}
              </p>
              <a href="/blog" className="text-xs text-orange-400 underline underline-offset-4">
                Browse all articles
              </a>
            </div>
          )}

          {/* ── POPULAR TAGS ─────────────────────────────────────────────── */}
          {!isFiltered && page === 1 && popularTags.length > 0 && (
            <nav aria-label="Browse by tag" className="mt-10 pt-8 border-t border-white/6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-4 bg-orange-500/50 rounded-full" aria-hidden />
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Browse by Topic
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularTags.map(({ tag, count }) => (
                  <a
                    key={tag}
                    href={`/blog?q=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-400
                      hover:text-orange-400 border border-white/10 hover:border-orange-500/30
                      bg-white/3 hover:bg-orange-500/5 rounded-full px-3 py-1.5 transition-all"
                  >
                    #{tag}
                    <span className="text-gray-700 text-[10px]">{count}</span>
                  </a>
                ))}
              </div>
            </nav>
          )}

          {/* ── RELATED CATEGORIES (NEW) ──────────────────────────────────
               Shown only on category pages. Keeps users on-site longer,
               improves internal linking, and boosts AdSense session RPM.  */}
          {isFiltered && category && relatedCategories.length > 0 && (
            <nav
              aria-label="Explore other categories"
              className="mt-10 pt-8 border-t border-white/6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-4 bg-orange-500/50 rounded-full" aria-hidden />
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-500">
                  Explore More
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {relatedCategories.map((cat) => (
                  <a
                    key={cat}
                    href={`/blog?category=${encodeURIComponent(cat)}`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400
                      hover:text-orange-400 border border-white/10 hover:border-orange-500/30
                      bg-white/3 hover:bg-orange-500/5 rounded-full px-3 py-1.5 transition-all"
                  >
                    {cat} →
                  </a>
                ))}
              </div>
            </nav>
          )}

          {/* Pagination removed in favor of Infinite Scroll */}

          {/* ── SEO CONTENT SECTION ──────────────────────────────────────── */}
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
                    About the Ollypedia Blog
                  </h2>
                  <div className="space-y-3 text-gray-400 text-sm leading-relaxed">
                    <p>
                      The <strong className="text-gray-300">Ollypedia Blog</strong> is your definitive guide to{" "}
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

                  {/* ── NEW: Last Updated timestamp ──
                       Signals freshness to both users and Google crawlers. Uses
                       a machine-readable <time> element for schema.org compatibility. */}
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
                      <a
                        key={link.href}
                        href={link.href}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/12 text-gray-400 hover:text-orange-400 hover:border-orange-500/40 transition-all"
                      >
                        {link.label} →
                      </a>
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