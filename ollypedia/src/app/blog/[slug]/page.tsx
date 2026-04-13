// app/blog/[slug]/page.tsx
// Fixes applied:
//  1. Server-side data fetch — BlogDetailClient was a black box to Google
//     (client-only fetch = blank page for crawler = "crawled not indexed")
//  2. notFound() on missing/unpublished blog → eliminates Soft 404s
//  3. Explicit canonical URL
//  4. robots: index/follow explicitly set
//  5. description always has a real fallback (never empty string)
//  6. Article structured data (JSON-LD) added
//  7. publishedTime / modifiedTime in OpenGraph for Google News signals

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";
import BlogDetailClient from "./BlogDetailClient";

export const revalidate    = 3600;
export const dynamicParams = true;

// ─── Static params ─────────────────────────────────────────────
export async function generateStaticParams() {
  await connectDB();
  const blogs = await Blog.find({ published: true }, "slug")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  return blogs.map((b: any) => ({ slug: b.slug }));
}

// ─── Data helper ───────────────────────────────────────────────
// FIX: fetch directly from DB on the server, not via an API round-trip.
// An API fetch during SSR can silently fail (cold start, env mismatch)
// returning null → blank page → "crawled not indexed".
async function getBlog(slug: string) {
  await connectDB();
  const blog = await Blog.findOne({ slug, published: true }).lean();
  if (!blog) return null;
  return JSON.parse(JSON.stringify(blog)); // serialise ObjectIds
}

// ─── Metadata ─────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const blog = await getBlog(params.slug);

  // FIX: missing blog → noindex instead of empty metadata object
  if (!blog) {
    return { robots: { index: false, follow: false } };
  }

  const title       = `${blog.title} | Ollypedia`;
  const description = (
    blog.excerpt ||
    blog.content?.replace(/<[^>]+>/g, "").slice(0, 155) ||
    `Read ${blog.title} on Ollypedia – Odia cinema news and reviews.`
  );
  const image     = blog.coverImage || "https://ollypedia.in/default.jpg";
  const canonical = `https://ollypedia.in/blog/${blog.slug}`;

  return {
    title,
    description,

    // FIX: canonical prevents duplicate indexing when blog is shared via ?ref= params
    alternates: { canonical },

    // FIX: explicit robots directive
    robots: { index: true, follow: true, googleBot: { index: true, follow: true } },

    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Ollypedia",
      type: "article",
      // FIX: publish timestamps help Google treat this as fresh news content
      publishedTime: blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
      modifiedTime:  blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: blog.title }],
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image], // FIX: was [blog.coverImage] which can be undefined
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────
export default async function BlogPage({
  params,
}: {
  params: { slug: string };
}) {
  const blog = await getBlog(params.slug);

  // FIX: hard 404 for missing / unpublished posts → no more Soft 404s
  if (!blog) notFound();

  // Article structured data — helps Google understand this is editorial content
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline":        blog.title,
    "description":     blog.excerpt || "",
    "datePublished":   blog.createdAt ? new Date(blog.createdAt).toISOString() : undefined,
    "dateModified":    blog.updatedAt ? new Date(blog.updatedAt).toISOString() : undefined,
    "image":           blog.coverImage || "https://ollypedia.in/default.jpg",
    "author":          { "@type": "Organization", "name": "Ollypedia" },
    "publisher": {
      "@type": "Organization",
      "name": "Ollypedia",
      "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" },
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `https://ollypedia.in/blog/${blog.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/*
        BlogDetailClient still handles the interactive UI.
        Pass the pre-fetched blog as a prop so it doesn't need
        to re-fetch on the client — this also means Google sees
        full content even with JS disabled.
      */}
      <BlogDetailClient slug={params.slug} initialData={blog} />
    </>
  );
}