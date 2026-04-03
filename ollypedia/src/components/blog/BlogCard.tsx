import Link from "next/link";
import Image from "next/image";
import { Clock, User } from "lucide-react";

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
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  "Movie Review":    "badge-orange",
  "Top 10":          "badge-purple",
  "Actor Spotlight": "badge-blue",
  "News":            "badge-green",
  "General":         "badge-gray",
};

export function BlogCard({ blog }: BlogCardProps) {
  const image = blog.coverImage || "/placeholder-blog.jpg";
  const cat   = blog.category || "General";
  const date  = blog.createdAt
    ? new Date(blog.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "";

  return (
    <Link href={`/blog/${blog.slug}`} className="group block card overflow-hidden">
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={image}
          alt={blog.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className={CATEGORY_COLORS[cat] || "badge-gray"}>{cat}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-display font-bold text-white text-base leading-snug line-clamp-2 group-hover:text-orange-400 transition-colors mb-2">
          {blog.title}
        </h3>
        {blog.excerpt && (
          <p className="text-gray-400 text-sm line-clamp-2 mb-3">{blog.excerpt}</p>
        )}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" /> {blog.author || "Ollypedia Team"}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {blog.readTime || 5} min read
          </span>
          {date && <span>{date}</span>}
        </div>
      </div>
    </Link>
  );
}
