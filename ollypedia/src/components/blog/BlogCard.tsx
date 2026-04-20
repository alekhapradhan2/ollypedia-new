// components/blog/BlogCard.tsx
import Link from "next/link";
import Image from "next/image";
import { Clock, User, Calendar, ArrowRight, Eye } from "lucide-react";

interface BlogCardProps {
  blog: {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    coverImage?: string;
    author?: string;
    readTime?: number;
    category?: string;
    createdAt?: string;
    views?: number;
    tags?: string[];
  };
  variant?: "featured" | "standard" | "compact";
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  "Movie Review":    { bg: "bg-orange-950",  text: "text-orange-400",  dot: "bg-orange-400"  },
  "Top 10":          { bg: "bg-purple-950",  text: "text-purple-400",  dot: "bg-purple-400"  },
  "Actor Spotlight": { bg: "bg-sky-950",     text: "text-sky-400",     dot: "bg-sky-400"     },
  "News":            { bg: "bg-emerald-950", text: "text-emerald-400", dot: "bg-emerald-400" },
  "Song Guide":      { bg: "bg-pink-950",    text: "text-pink-400",    dot: "bg-pink-400"    },
  "General":         { bg: "bg-zinc-800",    text: "text-zinc-400",    dot: "bg-zinc-400"    },
};

function CategoryBadge({ category }: { category: string }) {
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES["General"];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {category}
    </span>
  );
}

export function BlogCard({ blog, variant = "standard" }: BlogCardProps) {
  const image    = blog.coverImage || "/placeholder-blog.jpg";
  const cat      = blog.category   || "General";
  const author   = blog.author     || "Ollypedia Team";
  const readTime = blog.readTime   || 5;

  // Strip HTML tags + decode entities so raw markup never leaks into card previews
  const cleanExcerpt = blog.excerpt
    ? blog.excerpt
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{2,}/g, " ")
        .trim()
    : undefined;

  const date     = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  // ── FEATURED ──────────────────────────────────────────────────────────────────
  if (variant === "featured") {
    return (
      <article
        itemScope
        itemType="https://schema.org/BlogPosting"
        className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-orange-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-orange-500/20"
      >
        <Link href={`/blog/${blog.slug}`} className="block">
          <div className="relative aspect-video overflow-hidden">
            <Image
              src={image}
              alt={`Cover image for ${blog.title}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
            <div className="absolute top-3 right-3 bg-orange-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
              ★ Featured
            </div>
            <div className="absolute bottom-3 left-3">
              <CategoryBadge category={cat} />
            </div>
          </div>

          <div className="p-5">
            <h2
              itemProp="headline"
              className="font-bold text-white text-lg leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors mb-2"
            >
              {blog.title}
            </h2>

            {cleanExcerpt && (
              <p itemProp="description" className="text-zinc-400 text-sm leading-relaxed line-clamp-2 mb-4">
                {cleanExcerpt}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <User className="w-3 h-3 text-orange-400" />
                  <span itemProp="author">{author}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime} min read
                </span>
                {date && (
                  <span className="hidden sm:flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <time itemProp="datePublished" dateTime={blog.createdAt}>{date}</time>
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Read <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // ── COMPACT ───────────────────────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <article
        itemScope
        itemType="https://schema.org/BlogPosting"
        className="group border border-zinc-800 bg-zinc-900 rounded-xl hover:border-orange-500 transition-all duration-200"
      >
        <Link href={`/blog/${blog.slug}`} className="flex gap-3 p-3">
          <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
            <Image
              src={image}
              alt={`Thumbnail for ${blog.title}`}
              fill
              sizes="80px"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="min-w-0 flex-1">
            <CategoryBadge category={cat} />
            <h3
              itemProp="headline"
              className="font-semibold text-white text-xs leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors mt-1.5"
            >
              {blog.title}
            </h3>
            <span className="text-[10px] text-zinc-600 mt-1 block">
              <time dateTime={blog.createdAt}>{date}</time> · {readTime} min
            </span>
          </div>
        </Link>
      </article>
    );
  }

  // ── STANDARD (default) ────────────────────────────────────────────────────────
  return (
    <article
      itemScope
      itemType="https://schema.org/BlogPosting"
      className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-orange-500 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/15"
    >
      <Link href={`/blog/${blog.slug}`} className="flex flex-col h-full">

        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden flex-shrink-0 bg-zinc-800">
          <Image
            src={image}
            alt={`Cover image for ${blog.title}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
          <div className="absolute top-3 left-3">
            <CategoryBadge category={cat} />
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col flex-1 p-4">
          <h2
            itemProp="headline"
            className="font-bold text-white text-sm leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors duration-200 mb-2"
          >
            {blog.title}
          </h2>

          {cleanExcerpt && (
            <p
              itemProp="description"
              className="text-zinc-500 text-xs leading-relaxed line-clamp-2 mb-3"
            >
              {cleanExcerpt}
            </p>
          )}

          {/* Footer meta */}
          <div className="mt-auto pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span itemProp="author" className="font-medium text-zinc-400 truncate max-w-[90px]">
                {author}
              </span>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                {readTime} min
              </span>
              {blog.views !== undefined && (
                <>
                  <span className="text-zinc-700">·</span>
                  <span className="flex items-center gap-1 shrink-0">
                    <Eye className="w-3 h-3" />
                    {blog.views.toLocaleString()}
                  </span>
                </>
              )}
            </div>
            {date && (
              <time
                itemProp="datePublished"
                dateTime={blog.createdAt}
                className="text-[10px] text-zinc-600 shrink-0"
              >
                {date}
              </time>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}