import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";
import { SITE_URL } from "@/lib/seo";

function xmlEsc(s: string) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function urlEntry(loc: string, lastmod: string, freq = "monthly", pri = "0.7") {
  return `  <url>
    <loc>${xmlEsc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`;
}

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const statics = [
    ["",           "daily",   "1.0"],
    ["/movies",    "daily",   "0.9"],
    ["/songs",     "weekly",  "0.8"],
    ["/cast",      "weekly",  "0.8"],
    ["/news",      "daily",   "0.8"],
    ["/blog",      "daily",   "0.8"],
    ["/about",     "monthly", "0.4"],
    ["/contact",   "monthly", "0.4"],
    ["/privacy",   "monthly", "0.3"],
    ["/disclaimer","monthly", "0.3"],
    ["/search",    "monthly", "0.3"],
  ];

  let entries = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  try {
    await connectDB();

    const movies = await Movie.find({}, "slug title releaseDate updatedAt").lean() as any[];
    movies.forEach((m) => {
      const slug    = m.slug || m._id;
      const lastmod = m.updatedAt ? new Date(m.updatedAt).toISOString().slice(0, 10) : today;
      entries.push(urlEntry(`${SITE_URL}/movie/${slug}`, lastmod, "weekly", "0.8"));
    });

    const casts = await Cast.find({}, "_id name updatedAt").lean() as any[];
    casts.forEach((c) => {
      const lastmod = c.updatedAt ? new Date(c.updatedAt).toISOString().slice(0, 10) : today;
      entries.push(urlEntry(`${SITE_URL}/cast/${c._id}`, lastmod, "monthly", "0.7"));
    });

    const blogs = await Blog.find({ published: true }, "slug updatedAt").lean() as any[];
    blogs.forEach((b) => {
      const lastmod = b.updatedAt ? new Date(b.updatedAt).toISOString().slice(0, 10) : today;
      entries.push(urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, "weekly", "0.7"));
    });
  } catch (_) {}

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml", "Cache-Control": "s-maxage=3600" },
  });
}
