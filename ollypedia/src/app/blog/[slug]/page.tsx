import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import { buildMeta, articleJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Clock, User, Calendar, Tag } from "lucide-react";

async function getBlog(slug: string) {
  await connectDB();
  const blog = await Blog.findOne({ slug, published: true }).lean();
  if (blog) await Blog.findByIdAndUpdate((blog as any)._id, { $inc: { views: 1 } });
  return blog as any;
}

async function getRelatedBlogs(blog: any) {
  if (!blog) return [];
  await connectDB();
  return Blog.find(
    { published: true, _id: { $ne: blog._id }, category: blog.category },
    "-content -reviews"
  ).limit(3).lean();
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const blog = await getBlog(params.slug);
  if (!blog) return {};
  return buildMeta({
    title: blog.seoTitle || blog.title,
    description: blog.seoDesc || blog.excerpt || blog.content?.slice(0, 160),
    keywords: blog.tags,
    image: blog.coverImage,
    url: `/blog/${blog.slug}`,
    type: "article",
  });
}

export default async function BlogDetailPage({ params }: { params: { slug: string } }) {
  const [blog, related] = await Promise.all([
    getBlog(params.slug),
    getBlog(params.slug).then((b: any) => getRelatedBlogs(b)),
  ]);
  if (!blog) notFound();

  const structuredData = [
    articleJsonLd(blog),
    breadcrumbJsonLd([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: blog.title, url: `/blog/${blog.slug}` },
    ]),
  ];

  return (
    <>
      {structuredData.map((sd, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Breadcrumb crumbs={[{ label: "Blog", href: "/blog" }, { label: blog.title }]} />

        {/* Cover image */}
        {blog.coverImage && (
          <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 border border-[#1f1f1f]">
            <Image src={blog.coverImage} alt={blog.title} fill className="object-cover" priority />
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge-orange">{blog.category}</span>
            {blog.tags?.slice(0, 3).map((tag: string) => (
              <span key={tag} className="badge-gray">{tag}</span>
            ))}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-black text-white leading-tight mb-4">
            {blog.title}
          </h1>
          {blog.excerpt && (
            <p className="text-xl text-gray-400 leading-relaxed mb-4">{blog.excerpt}</p>
          )}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-[#1f1f1f]">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> {blog.author || "Ollypedia Team"}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {new Date(blog.createdAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {blog.readTime || 5} min read
            </span>
            {blog.views > 0 && <span>{blog.views.toLocaleString()} views</span>}
          </div>
        </div>

        {/* Content */}
        <article className="prose-odia">
          {blog.content ? (
            <div dangerouslySetInnerHTML={{ __html: blog.content }} />
          ) : (
            <p className="text-gray-400">Content coming soon…</p>
          )}
        </article>

        {/* Tags */}
        {blog.tags?.length > 0 && (
          <div className="mt-8 pt-6 border-t border-[#1f1f1f]">
            <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
              <Tag className="w-4 h-4" /> Tags
            </p>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag: string) => (
                <span key={tag} className="badge-gray">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Related */}
        {(related as any[]).length > 0 && (
          <div className="mt-12 pt-8 border-t border-[#1f1f1f]">
            <h2 className="font-display font-bold text-2xl text-white mb-6">Related Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(related as any[]).map((b: any) => (
                <Link key={String(b._id)} href={`/blog/${b.slug}`} className="group block card overflow-hidden">
                  {b.coverImage && (
                    <div className="relative aspect-video">
                      <Image src={b.coverImage} alt={b.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-semibold text-white line-clamp-2 group-hover:text-orange-400 transition-colors">
                      {b.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
