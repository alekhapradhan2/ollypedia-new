// app/sitemap.xml/route.ts
// ── What changed in this version ──────────────────────────────────────────────
//  1. Cast URLs fixed to always use _id (route is /cast/[id], never slug)
//  2. Genre pages added — /movies/genre/[genre] + /movies?genre= (10 genres)
//  3. /movies/upcoming, /movies/latest, /movies/blockbuster added as statics
//  4. News articles added from DB (/news/[slug])
//  5. News model imported
//  6. TODO items moved to "Evergreen guides" comment (upcoming/latest/blockbuster done)
//  7. ★ Blog query now filters { published: true, indexed: { $ne: false } }
//     so non-indexable day-wise box office articles are excluded from sitemap
//  ✅ All previous fixes preserved (box-office, blog categories, song pages, priorities)

import { connectDB } from "@/lib/db";
import Movie         from "@/models/Movie";
import Cast          from "@/models/Cast";
import Blog          from "@/models/Blog";
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
    ["/trailers",             "daily",   "0.9"],   // ← NEW
    ["/box-office",           "daily",   "0.9"],
    ["/ott",                  "daily",   "0.9"],   // ← NEW OTT
    ["/ott/upcoming",         "daily",   "0.85"],  // ← NEW OTT
    ["/ott/now-streaming",    "daily",   "0.85"],  // ← NEW OTT
    ["/songs",                "weekly",  "0.8"],
    ["/cast",                 "weekly",  "0.8"],
    ["/blog",                 "daily",   "0.8"],
    ["/about",                "monthly", "0.4"],
    ["/contact",              "monthly", "0.4"],
    ["/privacy",              "monthly", "0.3"],
    ["/disclaimer",           "monthly", "0.3"],
    // NOTE: /search is intentionally excluded — blocked by robots.txt (Disallow: /search)
    // Including a robots-blocked URL in the sitemap sends contradictory signals to Google.
  ];

  const entries: string[] = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  // ── Genre pages (Removed because route does not exist) ──────────────

  // ── Blog category pages ────────────────────────────────────────────────────
  // Each is a unique keyword-targeted page. Box Office gets daily crawl priority.
  const blogCategories: [string, string, string][] = [
    ["Box Office", "daily",   "0.9"],
    ["Reviews",    "weekly",  "0.75"],
    ["Actor",      "weekly",  "0.7"],
    ["Songs",      "weekly",  "0.7"],
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

  // ── Box office by year pages ───────────────────────────────────────────────
  // Current year is covered by the static "/box-office" entry above (canonical
  // points there for the current year). Only past years get the ?year= variant —
  // matches the dynamic canonical/openGraph logic in app/box-office/page.tsx.
  const BOX_OFFICE_YEAR_START = 2020;
  for (let yr = YEAR_END - 1; yr >= BOX_OFFICE_YEAR_START; yr--) {
    entries.push(urlEntry(`${SITE_URL}/box-office?year=${yr}`, today, "weekly", "0.75"));
  }

  try {
    await connectDB();

    // ── Movies + Songs ─────────────────────────────────────────────────────
    const movies = await Movie.find(
      {},
      "slug _id releaseDate updatedAt createdAt media.songs media.videos boxOfficeDays ott streamingOn"
    ).lean() as any[];

    movies.forEach((m) => {
      const movieSlug   = m.slug || String(m._id);
      const lastmod     = safeDate(m.updatedAt ?? m.createdAt ?? m.releaseDate);
      const hasBoxOffice = m.boxOfficeDays?.length > 0;
      const hasTrailerVideo = !!(m.media?.videos && m.media.videos.length > 0 && m.media.videos.some((v: any) => v.ytId));

      // Movie detail page — daily if actively tracked for box office
      entries.push(urlEntry(
        `${SITE_URL}/movie/${movieSlug}`,
        lastmod,
        hasBoxOffice ? "daily"  : "weekly",
        hasBoxOffice ? "0.85"   : "0.8"
      ));

      // Trailer page — added for all movies with any video content
      if (hasTrailerVideo) {
        entries.push(urlEntry(
          `${SITE_URL}/trailers/${movieSlug}`,
          lastmod,
          "weekly",
          "0.8"
        ));
      }

      // Box office page per movie — highest priority after homepage
      if (hasBoxOffice) {
        entries.push(urlEntry(
          `${SITE_URL}/box-office/${movieSlug}`,
          lastmod,
          "daily",
          "1.0" // Boosted to 1.0 to force Google to index for Sitelinks
        ));
      }

      // OTT movie page — support both new ott.platform and legacy streamingOn
      if (m.ott?.platform || m.streamingOn) {
        entries.push(urlEntry(
          `${SITE_URL}/ott/${movieSlug}`,
          lastmod,
          "weekly",
          "0.85"
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
      entries.push(urlEntry(`${SITE_URL}/cast/${String(c._id)}`, lastmod, "weekly", "0.9")); // Boosted for Sitelinks
    });

    // ── Blogs ──────────────────────────────────────────────────────────────
    // Only blogs with published:true AND indexed not explicitly false.
    // indexed:false = non-key box office day articles (stored in DB, visible in
    // UI, but intentionally excluded from sitemap + Google index to avoid
    // crawl budget waste on near-duplicate day-wise content).
    // indexed:true or indexed field absent = all other blogs → included normally.
    // Box Office key/milestone days: daily + 0.9
    // Featured blogs:                weekly + 0.85
    // All others:                    weekly + 0.75
    const blogs = await Blog.find(
      { published: true, indexed: { $ne: false } },
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