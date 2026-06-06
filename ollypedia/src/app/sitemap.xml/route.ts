// app/sitemap.xml/route.ts
// ── What changed in this version ──────────────────────────────────────────────
//  1. Cast URLs fixed to always use _id (route is /cast/[id], never slug)
//  2. Genre pages added — /movies/genre/[genre] + /movies?genre= (10 genres)
//  3. /movies/upcoming, /movies/latest, /movies/blockbuster added as statics
//  4. News articles added from DB (/news/[slug])
//  5. News model imported
//  6. TODO items moved to "Evergreen guides" comment (upcoming/latest/blockbuster done)
//  ✅ All previous fixes preserved (box-office, blog categories, song pages, priorities)

import { connectDB } from "@/lib/db";
import Movie         from "@/models/Movie";
import Cast          from "@/models/Cast";
import Blog          from "@/models/Blog";
import News          from "@/models/News";
import { SITE_URL }  from "@/lib/seo";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // ── Static pages ──────────────────────────────────────────────────────────
  const statics: [string, string, string][] = [
    ["",                      "daily",   "1.0"],
    ["/movies",               "daily",   "0.9"],
    ["/movies/upcoming",      "daily",   "0.9"],
    ["/movies/latest",        "daily",   "0.85"],
    ["/movies/blockbuster",   "weekly",  "0.8"],
    ["/box-office",           "daily",   "0.9"],
    ["/songs",                "weekly",  "0.8"],
    ["/cast",                 "weekly",  "0.8"],
    ["/news",                 "daily",   "0.8"],
    ["/blog",                 "daily",   "0.8"],
    ["/about",                "monthly", "0.4"],
    ["/contact",              "monthly", "0.4"],
    ["/privacy",              "monthly", "0.3"],
    ["/disclaimer",           "monthly", "0.3"],
    ["/search",               "monthly", "0.3"],
  ];

  const entries: string[] = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  // ── Genre pages ────────────────────────────────────────────────────────────
  const genres = [
    "Action", "Romance", "Comedy", "Drama", "Family",
    "Thriller", "Mythological", "Horror", "Social", "Devotional",
  ];
  genres.forEach((g) => {
    entries.push(urlEntry(`${SITE_URL}/movies/genre/${encodeURIComponent(g.toLowerCase())}`, today, "weekly", "0.75"));
    entries.push(urlEntry(`${SITE_URL}/movies?genre=${encodeURIComponent(g)}`, today, "weekly", "0.75"));
  });

  // ── Blog category pages ────────────────────────────────────────────────────
  // Each is a unique keyword-targeted page. Box Office gets daily crawl priority.
  const blogCategories: [string, string, string][] = [
    ["Box Office", "daily",   "0.9"],
    ["Reviews",    "weekly",  "0.75"],
    ["Actor",      "weekly",  "0.7"],
    ["Songs",      "weekly",  "0.7"],
    ["News",       "daily",   "0.75"],
    ["Top Lists",  "monthly", "0.7"],
  ];

  blogCategories.forEach(([cat, freq, pri]) => {
    entries.push(
      urlEntry(
        `${SITE_URL}/blog?category=${encodeURIComponent(cat)}`,
        today,
        freq,
        pri
      )
    );
  });

  // ── Songs category pages ───────────────────────────────────────────────────
  const songCategories: [string, string][] = [
    ["2026",     "0.8"],
    ["latest",   "0.8"],
    ["trending", "0.8"],
    ["classics", "0.7"],
    ["singers",  "0.7"],
  ];

  songCategories.forEach(([cat, pri]) => {
    entries.push(urlEntry(`${SITE_URL}/songs/category/${cat}`, today, "weekly", pri));
  });

  // ── Movies by year pages ───────────────────────────────────────────────────
  const YEAR_START = 2000;
  const YEAR_END   = new Date().getFullYear();
  for (let yr = YEAR_END; yr >= YEAR_START; yr--) {
    const freq = yr >= YEAR_END - 1 ? "daily"   : yr >= YEAR_END - 4 ? "monthly" : "yearly";
    const pri  = yr >= YEAR_END - 1 ? "0.85"    : yr >= YEAR_END - 4 ? "0.75"    : "0.6";
    entries.push(urlEntry(`${SITE_URL}/movies/year/${yr}`, today, freq, pri));
  }

  try {
    await connectDB();

    // ── Movies + Songs ─────────────────────────────────────────────────────
    const movies = await Movie.find(
      {},
      "slug _id releaseDate updatedAt createdAt media.songs boxOfficeDays"
    ).lean() as any[];

    movies.forEach((m) => {
      const movieSlug   = m.slug || String(m._id);
      const lastmod     = safeDate(m.updatedAt ?? m.createdAt ?? m.releaseDate);
      const hasBoxOffice = m.boxOfficeDays?.length > 0;

      // Movie detail page — daily if actively tracked for box office
      entries.push(urlEntry(
        `${SITE_URL}/movie/${movieSlug}`,
        lastmod,
        hasBoxOffice ? "daily"  : "weekly",
        hasBoxOffice ? "0.85"   : "0.8"
      ));

      // Box office page per movie — NEW, highest priority after homepage
      if (hasBoxOffice) {
        entries.push(urlEntry(
          `${SITE_URL}/box-office/${movieSlug}`,
          lastmod,
          "daily",
          "0.9"
        ));
      }

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

    // ── Cast ───────────────────────────────────────────────────────────────
    const casts = await Cast.find({}, "_id slug name updatedAt createdAt").lean() as any[];

    casts.forEach((c) => {
      if (!c.name?.trim()) return;
      const lastmod = safeDate(c.updatedAt ?? c.createdAt);
      // Route is /cast/[id] — always use MongoDB _id, never slug
      entries.push(urlEntry(`${SITE_URL}/cast/${String(c._id)}`, lastmod, "monthly", "0.7"));
    });

    // ── Blogs ──────────────────────────────────────────────────────────────
    // Box Office blogs: daily + 0.9  — rank for "[movie] day N collection" searches
    // Featured blogs:   weekly + 0.85
    // Others:           weekly + 0.75 (upgraded from flat 0.7)
    const blogs = await Blog.find(
      { published: true },
      "slug category featured updatedAt createdAt"
    ).lean() as any[];

    blogs.forEach((b) => {
      if (!b.slug?.trim()) return;
      const lastmod     = safeDate(b.updatedAt ?? b.createdAt);
      const isBoxOffice = b.category === "Box Office";
      const isFeatured  = !!b.featured;
      const freq        = isBoxOffice ? "daily"  : "weekly";
      const pri         = isBoxOffice ? "0.9"    : isFeatured ? "0.85" : "0.75";
      entries.push(urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, freq, pri));
    });

    // ── News articles ──────────────────────────────────────────────────────
    const newsItems = await News.find(
      {},
      "slug _id updatedAt createdAt"
    ).lean() as any[];

    newsItems.forEach((n: any) => {
      const newsSlug = n.slug?.trim() || String(n._id);
      const lastmod  = safeDate(n.updatedAt ?? n.createdAt);
      entries.push(urlEntry(`${SITE_URL}/news/${newsSlug}`, lastmod, "weekly", "0.75"));
    });

  } catch (err) {
    console.error("Sitemap generation error:", err);
  }

  // ── Evergreen guide pages (add once created) ──────────────────────────────
  //  /blog/odia-guides/odia-movies
  //  /blog/odia-guides/history-of-ollywood
  //  /blog/odia-guides/top-10-odia-movies
  //  /blog/odia-guides/best-odia-songs
  //  /blog/odia-guides/odia-actors

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type":  "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=600",
    },
  });
}
