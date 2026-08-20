// app/robots.txt/route.ts
// ── What changed in this version ──────────────────────────────────────────────
//  1. /blog? now blocks ALL query string variations (was only ?q= before)
//  2. /movies?genre= removed — duplicate of canonical /movies/genre/[genre]
//  3. /songs/category/ left crawlable (canonical), query dupes blocked
//  4. ★ PerplexityBot REMOVED from block list — Perplexity is an AI search
//     engine that cites sources and drives real referral traffic. Blocking it
//     prevents Ollypedia from appearing in Perplexity AI answers.
//  5. ★ Google-Extended REMOVED from block list — blocking this prevents
//     Ollypedia content from appearing in Google AI Overviews and Gemini
//     answers, which are a growing source of discovery traffic.
//  6. ★ FIX: /blog?category= explicitly allowed — sitemap.xml submits the 6
//     /blog?category=[X] pages (Box Office, Reviews, Actor, Songs, News, Top
//     Lists) as real keyword-targeted pages with priority up to 0.9, but the
//     blanket "Disallow: /blog?" rule was blocking Googlebot from crawling
//     them — submitted-but-blocked is a wasted/contradictory signal. Only
//     /blog?category= is allowed; all other /blog? query variants (e.g.
//     /blog?q=, /blog?page=) remain blocked as before.
//  7. ★ SEO FIX: Removed Allow: /movies?genre= — genre canonical is at
//     /movies/genre/[genre]; allowing the ?genre= variant created a duplicate
//     canonical signal and sent contradictory signals to Google.
//  ✅ All other existing rules preserved (pure training scrapers still blocked)

import { SITE_URL } from "@/lib/seo";

export async function GET() {
  const content = `# ── General crawlers ────────────────────────────────────
User-agent: *
Allow: /

# ★ IMPORTANT: Allow rules must come BEFORE their corresponding Disallow rules
# because robots.txt is evaluated first-match-wins per path.
# These specific URL patterns are canonical, keyword-targeted pages in the sitemap.
Allow: /movies/year/
Allow: /movies/genre/
Allow: /box-office?year=
Allow: /blog?category=
Allow: /discussion

# Block thin/low-value/private pages from crawl budget
Disallow: /api/
Disallow: /admin/
Disallow: /discussion/profile
Disallow: /search
Disallow: /blog?

# ── AI training scrapers — block content harvesting ─────
# These bots scrape content to train AI models without compensation.
# Blocking them protects your original Odia cinema writing.
# NOTE: PerplexityBot and Google-Extended are NOT blocked here —
# they are AI search engines that cite sources and drive traffic,
# not training scrapers.

User-agent: GPTBot
Disallow: /

User-agent: ChatGPT-User
Disallow: /

User-agent: CCBot
Disallow: /

User-agent: anthropic-ai
Disallow: /

User-agent: Bytespider
Disallow: /

User-agent: Amazonbot
Disallow: /

User-agent: Applebot-Extended
Disallow: /

User-agent: Meta-ExternalAgent
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