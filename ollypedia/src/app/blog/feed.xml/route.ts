// app/blog/feed.xml/route.ts
// Serve an RSS 2.0 feed for the latest 20 Ollywood blog posts.
// Add <link rel="alternate" type="application/rss+xml" title="Ollypedia Blog" href="/blog/feed.xml">
// to your root layout's <head> so browsers and crawlers discover it automatically.
import { SITE_URL } from "@/lib/seo";

import { connectDB } from "@/lib/db";
import Blog from "@/models/Blog";

const FEED_URL = `${SITE_URL}/blog/feed.xml`;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  await connectDB();

  const blogs = await Blog.find({ published: true })
    .select("title slug excerpt category tags coverImage author createdAt views readTime")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const mostRecent = blogs[0]?.createdAt
    ? new Date(blogs[0].createdAt as string | Date).toUTCString()
    : new Date().toUTCString();

  const items = (blogs as any[])
    .map((b) => {
      const url      = `${SITE_URL}/blog/${b.slug}`;
      const pubDate  = new Date(b.createdAt).toUTCString();
      const title    = escapeXml(b.title ?? "");
      const excerpt  = escapeXml(b.excerpt ?? "");
      const author   = escapeXml(b.author ?? "Ollypedia");
      const category = escapeXml(b.category ?? "");
      const image    = b.coverImage ? `<enclosure url="${escapeXml(b.coverImage)}" type="image/jpeg" length="0"/>` : "";
      const tags     = (b.tags ?? [])
        .map((t: string) => `<category>${escapeXml(t)}</category>`)
        .join("\n        ");

      return `
    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${excerpt}</description>
      <author>noreply@ollypedia.in (${author})</author>
      <category>${category}</category>
      ${tags}
      <pubDate>${pubDate}</pubDate>
      ${image}
    </item>`;
    })
    .join("");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
>
  <channel>
    <title>Ollypedia Blog — Odia Cinema News &amp; Reviews</title>
    <link>${SITE_URL}/blog</link>
    <description>In-depth movie reviews, actor profiles, top lists, song breakdowns and news from Odia cinema — updated every week.</description>
    <language>en-in</language>
    <copyright>Copyright ${new Date().getFullYear()} Ollypedia</copyright>
    <lastBuildDate>${mostRecent}</lastBuildDate>
    <ttl>600</ttl>
    <image>
      <url>${SITE_URL}/logo.png</url>
      <title>Ollypedia Blog</title>
      <link>${SITE_URL}/blog</link>
    </image>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // Cache for 10 minutes on CDN — matches your revalidate = 600
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
    },
  });
}