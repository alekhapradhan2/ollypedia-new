import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";
import { SITE_URL } from "@/lib/seo";

// Escape XML
function xmlEsc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Safe date formatter
function safeDate(value: unknown): string {
  const today = new Date().toISOString().split("T")[0];

  if (!value) return today;

  const d = new Date(value as any);
  if (isNaN(d.getTime())) return today;

  const year = d.getFullYear();
  if (year < 2000 || year > new Date().getFullYear() + 1) return today;

  return d.toISOString().split("T")[0];
}

// URL entry builder
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

  const entries: string[] = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  try {
    await connectDB();

    // ── Movies ─────────────────────────────
    const movies = await Movie.find(
      {},
      "slug releaseDate updatedAt createdAt media.songs"
    ).lean() as any[];

    movies.forEach((m) => {
      const slug = m.slug || String(m._id);
      const lastmod = safeDate(m.updatedAt ?? m.createdAt ?? m.releaseDate);

      // Movie page
      entries.push(
        urlEntry(`${SITE_URL}/movie/${slug}`, lastmod, "weekly", "0.8")
      );

      // ── Songs from Movie ─────────────────
      if (m.media?.songs?.length) {
        m.media.songs.forEach((s: any, i: number) => {
          if (!s) return;

          // Prefer DB slug if exists
          let songSlug = s.slug;

          // fallback slug (safe)
          if (!songSlug && s.title) {
            songSlug = s.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, "")
              .replace(/\s+/g, "-")
              .replace(/-+/g, "-")
              .trim();
          }

          if (!songSlug) return;

          entries.push(
            urlEntry(
              `${SITE_URL}/songs/${slug}/${i}/${songSlug}`,
              lastmod,
              "weekly",
              "0.8"
            )
          );
        });
      }
    });

    // ── Cast ──────────────────────────────
    const casts = await Cast.find(
      {},
      "_id updatedAt createdAt"
    ).lean() as any[];

    casts.forEach((c) => {
      const lastmod = safeDate(c.updatedAt ?? c.createdAt);

      entries.push(
        urlEntry(
          `${SITE_URL}/cast/${String(c._id)}`,
          lastmod,
          "monthly",
          "0.7"
        )
      );
    });

    // ── Blogs ─────────────────────────────
    const blogs = await Blog.find(
      { published: true },
      "slug updatedAt createdAt"
    ).lean() as any[];

    blogs.forEach((b) => {
      if (!b.slug) return;

      const lastmod = safeDate(b.updatedAt ?? b.createdAt);

      entries.push(
        urlEntry(
          `${SITE_URL}/blog/${b.slug}`,
          lastmod,
          "weekly",
          "0.7"
        )
      );
    });

  } catch (err) {
    console.error("Sitemap generation error:", err);
  }

  // ── SEO Footer Pages ─────────────────────
const seoPages = [
  "/movies/2026",
  "/movies/2025",
  "/movies/2024",
  "/movies/upcoming",
  "/movies/latest",
  "/movies/blockbuster",

  "/songs/category/2026",
  "/songs/category/latest",
  "/songs/category/trending",
  "/songs/category/classics",
  "/songs/category/singers",

  "/blog/odia-guides/odia-movies",
  "/blog/odia-guides/history-of-ollywood",
  "/blog/odia-guides/top-10-odia-movies",
  "/blog/odia-guides/best-odia-songs",
  "/blog/odia-guides/odia-actors",
];

seoPages.forEach((path) => {
  entries.push(
    urlEntry(`${SITE_URL}${path}`, today, "weekly", "0.7")
  );
});

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",

      // 🔥 IMPORTANT: no cache for testing
      "Cache-Control": "no-store",
    },
  });
}