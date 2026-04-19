// app/blog/page.tsx
// AdSense-ready: semantic HTML5, structured content, proper headings, no intrusive patterns
// SEO: rich meta, JSON-LD schema, keyword-rich intro section
// Features: 20/page pagination (URL-based), search that works across pages

import type { Metadata } from "next";
import { Suspense } from "react";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { buildMeta } from "@/lib/seo";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogSearch } from "@/components/blog/BlogSearch";
import { BlogPagination } from "@/components/blog/BlogPagination";
import { Search, BookOpen, TrendingUp, Star } from "lucide-react";

export const revalidate = 600;

// ── SEO METADATA ──────────────────────────────────────────────────────────────

export const metadata: Metadata = buildMeta({
  title: "Ollywood Blog | Odia Cinema News, Reviews & Guides",
  description:
    "Explore the latest Ollywood blog posts — in-depth movie reviews, actor profiles, top 10 lists, song guides, and behind-the-scenes coverage of Odia cinema. Updated weekly.",
  url: "/blog",
});

// ── JSON-LD SCHEMA ────────────────────────────────────────────────────────────

function BlogSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Ollypedia Blog",
    description:
      "News, reviews, and guides about Ollywood — the Odia-language film industry based in Bhubaneswar, Odisha.",
    url: "https://ollypedia.in/blog",
    publisher: {
      "@type": "Organization",
      name: "Ollypedia",
      url: "https://ollypedia.in",
      logo: {
        "@type": "ImageObject",
        url: "https://ollypedia.in/logo.png",
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

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
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

  const [{ blogs, total, totalPages }, categories, featured, stats] =
    await Promise.all([
      getBlogs({ page, query, category }),
      getCategories(),
      query || category ? Promise.resolve([]) : getFeaturedBlogs(),
      getBlogStats(),
    ]);

  const isFiltered = !!(query || category);
  const showFeatured = !isFiltered && featured.length > 0 && page === 1;
  const regularBlogs = showFeatured
    ? blogs.filter((b) => !featured.find((f) => String(f._id) === String(b._id)))
    : blogs;

  return (
    <>
      <BlogSchema />

      <main className="min-h-screen bg-[#0a0a0a] text-white">

        {/* ── HERO / SEO HEADER ─────────────────────────────────────────── */}
        <header className="relative overflow-hidden border-b border-white/6">
          {/* Background texture */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `radial-gradient(circle at 20% 50%, #f97316 0%, transparent 50%),
                                radial-gradient(circle at 80% 20%, #7c3aed 0%, transparent 40%)`,
            }}
          />
          <div aria-hidden className="absolute inset-0 bg-[#0a0a0a]/70" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">

            {/* Breadcrumb — SEO + AdSense loves clear site structure */}
            <nav aria-label="Breadcrumb" className="mb-6">
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
                <span aria-hidden>/</span>
                <li itemScope itemType="https://schema.org/ListItem" itemProp="itemListElement">
                  <span itemProp="name" className="text-orange-400">Blog</span>
                  <meta itemProp="position" content="2" />
                </li>
              </ol>
            </nav>

            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                {/* H1 with keyword-rich copy */}
                <h1 className="font-display text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-3">
                  Ollywood <span className="text-orange-400">Blog</span>
                </h1>
                <p className="text-gray-400 text-base md:text-lg max-w-2xl leading-relaxed">
                  In-depth movie reviews, actor profiles, top lists, song breakdowns and news
                  from <strong className="text-gray-300 font-medium">Odia cinema</strong> — updated every week.
                </p>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-gray-300">
                    <BookOpen className="w-3.5 h-3.5 text-orange-400" />
                    {stats.totalPosts}+ Articles
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-gray-300">
                    <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                    {stats.totalCategories} Categories
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/6 border border-white/10 rounded-full px-3 py-1.5 text-gray-300">
                    <Star className="w-3.5 h-3.5 text-orange-400" />
                    Weekly Updates
                  </span>
                </div>
              </div>

              {/* Search box — client component, syncs with URL params */}
              <div className="w-full md:w-80">
                <Suspense>
                  <BlogSearch initialQuery={query} />
                </Suspense>
              </div>
            </div>

            {/* Category filter pills */}
            {categories.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2" role="navigation" aria-label="Filter by category">
                <a
                  href="/blog"
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                    !category
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "border-white/15 text-gray-400 hover:border-orange-500/50 hover:text-white"
                  }`}
                >
                  All
                </a>
                {categories.map((cat) => (
                  <a
                    key={cat}
                    href={`/blog?category=${encodeURIComponent(cat)}`}
                    className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                      category === cat
                        ? "bg-orange-500 border-orange-500 text-white"
                        : "border-white/15 text-gray-400 hover:border-orange-500/50 hover:text-white"
                    }`}
                  >
                    {cat}
                  </a>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

          {/* ── SEARCH RESULT CONTEXT ───────────────────────────────────── */}
          {isFiltered && (
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  {total === 0
                    ? "No results found"
                    : `Found ${total} article${total !== 1 ? "s" : ""}`}
                  {query    && <> for <strong className="text-white">"{query}"</strong></>}
                  {category && <> in <strong className="text-orange-400">{category}</strong></>}
                </p>
              </div>
              <a
                href="/blog"
                className="text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4"
              >
                Clear filters
              </a>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {regularBlogs.map((b) => (
                  <BlogCard key={String(b._id)} blog={b} variant="standard" />
                ))}
              </div>
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

          {/* ── PAGINATION ───────────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="mt-10">
              <Suspense>
                <BlogPagination
                  currentPage={page}
                  totalPages={totalPages}
                  query={query}
                  category={category}
                />
              </Suspense>
            </div>
          )}

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
                      { label: "Browse Cast", href: "/cast" },
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