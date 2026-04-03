import type { Metadata } from "next";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { BlogCard } from "@/components/blog/BlogCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { buildMeta } from "@/lib/seo";
import Link from "next/link";

export const metadata: Metadata = buildMeta({
  title: "Odia Cinema Blog – Ollywood Reviews, News & Analysis",
  description:
    "Read the latest Odia film industry blog posts including movie reviews, actor spotlights, top-10 lists, and in-depth analysis of Ollywood cinema.",
  keywords: ["Odia movie review", "Ollywood blog", "Odia film news", "Odia cinema analysis"],
  url: "/blog",
});

const CATEGORIES = ["All", "Movie Review", "Top 10", "Actor Spotlight", "News", "General"];

async function getBlogs(category?: string, page = 1) {
  await connectDB();
  const LIMIT = 12;
  const filter: any = { published: true };
  if (category && category !== "All") filter.category = category;
  const [blogs, total] = await Promise.all([
    Blog.find(filter, "-content -reviews")
      .sort({ featured: -1, createdAt: -1 })
      .skip((page - 1) * LIMIT)
      .limit(LIMIT)
      .lean(),
    Blog.countDocuments(filter),
  ]);
  return { blogs, total, pages: Math.ceil(total / LIMIT) };
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: { category?: string; page?: string };
}) {
  const { category, page } = searchParams;
  const { blogs, total } = await getBlogs(category, Number(page) || 1);
  const featured = blogs.find((b: any) => b.featured) as any;
  const rest     = blogs.filter((b: any) => !b.featured || b !== featured);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SectionHeader
        title="Odia Cinema Blog"
        subtitle="Reviews, analysis & Ollywood stories"
      />

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={cat === "All" ? "/blog" : `/blog?category=${encodeURIComponent(cat)}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
              (!category && cat === "All") || category === cat
                ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                : "border-[#2a2a2a] text-gray-400 hover:border-orange-500/30"
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {blogs.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No blog posts found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((b: any) => (
            <BlogCard key={String(b._id)} blog={b} />
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="mt-12 bg-[#111] border border-[#1f1f1f] rounded-xl p-8 text-center">
          <p className="text-gray-400 text-lg mb-2">Blog coming soon!</p>
          <p className="text-gray-600 text-sm">
            We're working on bringing you the best Odia cinema content.
          </p>
        </div>
      )}
    </div>
  );
}
