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

/**
 * Bulletproof date formatter for sitemap <lastmod>.
 * Google requires W3C datetime format: YYYY-MM-DD
 * Handles: Date objects, ISO strings, timestamps, null, undefined, invalid dates.
 * Falls back to today's date so the tag is ALWAYS valid.
 */
function safeDate(value: unknown): string {
  const today = new Date().toISOString().split("T")[0];

  if (value == null) return today;

  let d: Date;

  if (value instanceof Date) {
    d = value;
  } else if (typeof value === "string" || typeof value === "number") {
    d = new Date(value);
  } else if (
    typeof value === "object" &&
    value !== null &&
    "$date" in (value as Record<string, unknown>)
  ) {
    // MongoDB Extended JSON format: { $date: "..." }
    d = new Date((value as Record<string, unknown>)["$date"] as string);
  } else {
    return today;
  }

  // Final NaN guard
  if (isNaN(d.getTime())) return today;

  // Clamp: reject dates before 2000 or in the future (both cause issues)
  const year = d.getFullYear();
  if (year < 2000 || year > new Date().getFullYear() + 1) return today;

  return d.toISOString().split("T")[0];
}

// Generate one <url> block
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

  const entries = statics.map(([p, f, pr]) =>
    urlEntry(`${SITE_URL}${p}`, today, f, pr)
  );

  try {
    await connectDB();

    // ── Movies ──────────────────────────────────────────────────
    const movies = await Movie.find(
      {},
      "slug title releaseDate updatedAt createdAt"
    ).lean() as any[];

    movies.forEach((m) => {
      const slug    = m.slug || String(m._id);
      // Prefer updatedAt → createdAt → releaseDate → today
      const lastmod = safeDate(m.updatedAt ?? m.createdAt ?? m.releaseDate);
      entries.push(
        urlEntry(`${SITE_URL}/movie/${slug}`, lastmod, "weekly", "0.8")
      );
    });

    // ── Cast ────────────────────────────────────────────────────
    const casts = await Cast.find(
      {},
      "_id updatedAt createdAt"
    ).lean() as any[];

    casts.forEach((c) => {
      const lastmod = safeDate(c.updatedAt ?? c.createdAt);
      entries.push(
        urlEntry(`${SITE_URL}/cast/${String(c._id)}`, lastmod, "monthly", "0.7")
      );
    });

    // ── Blogs ───────────────────────────────────────────────────
    const blogs = await Blog.find(
      { published: true },
      "slug updatedAt createdAt"
    ).lean() as any[];

    blogs.forEach((b) => {
      const lastmod = safeDate(b.updatedAt ?? b.createdAt);
      entries.push(
        urlEntry(`${SITE_URL}/blog/${b.slug}`, lastmod, "weekly", "0.7")
      );
    });

  } catch (err) {
    console.error("Sitemap generation error:", err);
    // Continue — static entries are still valid even if DB fails
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}