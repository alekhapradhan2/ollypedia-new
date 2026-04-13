// app/sitemap.xml/route.ts
// Changes vs previous version:
//  1. Songs category pages re-added — /songs/category/[2026|latest|trending|classics|singers]
//     These pages now exist (page.tsx with generateStaticParams) so they're safe to include.
//  2. Movies filter pages (/movies/2026 etc.) still EXCLUDED — pages don't exist yet
//  3. Blog guide pages (/blog/odia-guides/*) still EXCLUDED — pages don't exist yet
//  ✅ All other fixes from previous version preserved

import { connectDB } from "@/lib/db";
import Movie from "@/models/Movie";
import Cast from "@/models/Cast";
import Blog from "@/models/Blog";
import { SITE_URL } from "@/lib/seo";

// ─── Helpers ──────────────────────────────────────────────────
function xmlEsc(s: string) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeDate(value: unknown): string {
  const today = new Date().toISOString().split("T")[0];
  if (!value) return today;
  const d = new Date(value as any);
  if (isNaN(d.getTime())) return today;
  const year = d.getFullYear();
  if (year < 2000 || year > new Date().getFullYear() + 1) return today;
  return d.toISOString().split("T")[0];
}

function toSlug(str?: string): string {
  return (str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function urlEntry(loc: string, lastmod: string, freq = "monthly", pri = "0.7") {
  return `  <url>
    <loc>${xmlEsc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>
  </url>`;
}

// ─── Route ────────────────────────────────────────────────────
export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  const statics: [string, string, string][] = [
    ["",            "daily",   "1.0"],
    ["/movies",     "daily",   "0.9"],
    ["/songs",      "weekly",  "0.8"],
    ["/cast",       "weekly",  "0.8"],
    ["/news",       "daily",   "0.8"],
    ["/blog",       "daily",   "0.8"],
    ["/about",      "monthly", "0.4"],
    ["/contact",    "monthly", "0.4"],
    ["/privacy",    "monthly", "0.3"],
    ["/disclaimer", "monthly", "0.3"],
    ["/search",     "monthly", "0.3"],
  ];

  // ── Songs category pages ────────────────────────────────────
  // These pages EXIST via app/songs/category/[category]/page.tsx
  // generateStaticParams covers: 2026, latest, trending, classics, singers
  const songCategories: [string, string][] = [
    ["2026",     "0.8"],
    ["latest",   "0.8"],
    ["trending", "0.8"],
    ["classics", "0.7"],
    ["singers",  "0.7"],
  ];

  const entries: string[] = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  // Add song category pages
  songCategories.forEach(([cat, pri]) => {
    entries.push(urlEntry(`${SITE_URL}/songs/category/${cat}`, today, "weekly", pri));
  });

  try {
    await connectDB();

    // ── Movies + Songs ────────────────────────────────────────
    const movies = await Movie.find(
      {},
      "slug _id releaseDate updatedAt createdAt media.songs"
    ).lean() as any[];

    movies.forEach((m) => {
      const movieSlug = m.slug || String(m._id);
      const lastmod   = safeDate(m.updatedAt ?? m.createdAt ?? m.releaseDate);

      entries.push(urlEntry(`${SITE_URL}/movie/${movieSlug}`, lastmod, "weekly", "0.8"));

      if (m.media?.songs?.length) {
        m.media.songs.forEach((s: any, i: number) => {
          if (!s?.title?.trim()) return;

          const songSlug = s.slug || toSlug(s.title);
          if (!songSlug) return;

          entries.push(
            urlEntry(`${SITE_URL}/songs/${movieSlug}/${i}/${songSlug}`, lastmod, "weekly", "0.7")
          );
        });
      }
    });

    // ── Cast ─────────────────────────────────────────────────
    const casts = await Cast.find(
      {},
      "_id slug name updatedAt createdAt"
    ).lean() as any[];

    casts.forEach((c) => {
      if (!c.name?.trim()) return;

      const castPath = c.slug?.trim() ? c.slug : String(c._id);
      const lastmod  = safeDate(c.updatedAt ?? c.createdAt);

      entries.push(urlEntry(`${SITE_URL}/cast/${castPath}`, lastmod, "monthly", "0.7"));
    });

    // ── Blogs ─────────────────────────────────────────────────
    const blogs = await Blog.find(
      { published: true },
      "slug updatedAt createdAt"
    ).lean() as any[];

    blogs.forEach((b) => {
      if (!b.slug?.trim()) return;
      const lastmod = safeDate(b.updatedAt ?? b.createdAt);
      entries.push(urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, "weekly", "0.7"));
    });

  } catch (err) {
    console.error("Sitemap generation error:", err);
  }

  // NOTE: The following footer links are NOT in the sitemap because no pages exist yet.
  // Build these pages first, then add them here:
  //
  //  Movies filter pages (need app/movies/[filter]/page.tsx):
  //    /movies/2026, /movies/2025, /movies/2024
  //    /movies/upcoming, /movies/latest, /movies/blockbuster
  //
  //  Blog guide pages (need app/blog/odia-guides/[slug]/page.tsx):
  //    /blog/odia-guides/odia-movies
  //    /blog/odia-guides/history-of-ollywood
  //    /blog/odia-guides/top-10-odia-movies
  //    /blog/odia-guides/best-odia-songs
  //    /blog/odia-guides/odia-actors

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=600",
    },
  });
}