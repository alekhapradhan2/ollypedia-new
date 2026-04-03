import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";
import { SITE_URL } from "@/lib/seo";

// Escape XML special characters
function xmlEsc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Safe date formatter (fixes INVALID DATE issue)
function safeDate(date: any) {
  const d = new Date(date);
  return isNaN(d.getTime())
    ? new Date().toISOString().split("T")[0]
    : d.toISOString().split("T")[0];
}

// Generate XML entry
function urlEntry(
  loc: string,
  lastmod: string,
  freq = "monthly",
  pri = "0.7"
) {
  return `  <url>
    <loc>${xmlEsc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`;
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const statics: [string, string, string][] = [
    ["", "daily", "1.0"],
    ["/movies", "daily", "0.9"],
    ["/songs", "weekly", "0.8"],
    ["/cast", "weekly", "0.8"],
    ["/news", "daily", "0.8"],
    ["/blog", "daily", "0.8"],
    ["/about", "monthly", "0.4"],
    ["/contact", "monthly", "0.4"],
    ["/privacy", "monthly", "0.3"],
    ["/disclaimer", "monthly", "0.3"],
    ["/search", "monthly", "0.3"],
  ];

  let entries = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  try {
    await connectDB();

    // Movies
    const movies = await Movie.find({}, "slug updatedAt").lean() as any[];
    movies.forEach((m) => {
      const slug = m.slug || m._id;
      const lastmod = safeDate(m.updatedAt);
      entries.push(
        urlEntry(`${SITE_URL}/movie/${slug}`, lastmod, "weekly", "0.8")
      );
    });

    console.log("Movies count:", movies.length);

    // Cast
    const casts = await Cast.find({}, "_id updatedAt").lean() as any[];
    casts.forEach((c) => {
      const lastmod = safeDate(c.updatedAt);
      entries.push(
        urlEntry(`${SITE_URL}/cast/${c._id}`, lastmod, "monthly", "0.7")
      );
    });

    console.log("Casts count:", casts.length);

    // Blogs
    const blogs = await Blog.find(
      { published: true },
      "slug updatedAt"
    ).lean() as any[];
    blogs.forEach((b) => {
      const lastmod = safeDate(b.updatedAt);
      entries.push(
        urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, "weekly", "0.7")
      );
    });

    console.log("Blogs count:", blogs.length);
  } catch (err) {
    console.error("Sitemap Error:", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}