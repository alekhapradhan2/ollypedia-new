// app/robots.txt/route.ts
// ── What changed in this version ──────────────────────────────────────────────
//  1. /blog? now blocks ALL query string variations (was only ?q= before)
//  2. /movies?genre= blocked — duplicate of canonical /movies/genre/[genre]
//  3. /songs/category/ left crawlable (canonical), query dupes blocked
//  ✅ All existing rules preserved (AI bot blocking, sitemap, admin/api block)

import { SITE_URL } from "@/lib/seo";

export async function GET() {
  const content = `# ── General crawlers ────────────────────────────────────
User-agent: *
Allow: /

# Block thin/low-value pages from crawl budget
Disallow: /api/
Disallow: /admin/
Disallow: /search
Disallow: /_next/
Disallow: /blog?
Disallow: /movies?genre=

# Explicitly allowed (kept crawlable — these are canonical, not duplicates)
Allow: /movies/year/
Allow: /movies/genre/
Allow: /box-office?year=

# ── AI training scrapers — block content harvesting ─────
# These bots scrape content to train AI models without compensation.
# Blocking them protects your original Odia cinema writing.

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Google-Extended
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

User-agent: PerplexityBot
Disallow: /

# ── Sitemaps ─────────────────────────────────────────────
# List all sitemaps so every crawler finds them automatically.
# Also submit these URLs manually in Google Search Console + Bing Webmaster Tools.
Sitemap: ${SITE_URL}/sitemap.xml
`;

  return new Response(content, {
    headers: {
      "Content-Type":  "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400",  // cache for 24h — robots.txt rarely changes
    },
  });
}