import type { Metadata } from "next";
import BlogDetailClient from "./BlogDetailClient";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  await connectDB();
  const blogs = await Blog.find({ published: true }, "slug")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return blogs.map((b: any) => ({ slug: b.slug }));
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

async function getBlog(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/blog/${slug}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const blog = await getBlog(params.slug);

  if (!blog) return {};

  return {
    title: blog.title,
    description: blog.excerpt || blog.content?.slice(0, 150),

    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      url: `https://ollypedia.in/blog/${blog.slug}`,
      siteName: "Ollypedia",
      images: [
        {
          url: blog.coverImage || "https://ollypedia.in/default.jpg",
          width: 1200,
          height: 630,
        },
      ],
      type: "article",
    },

    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description: blog.excerpt,
      images: [blog.coverImage],
    },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  return <BlogDetailClient slug={params.slug} />;
}