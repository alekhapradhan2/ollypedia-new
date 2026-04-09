// src/components/Footer.tsx
import Link from "next/link";
import { Film, Instagram, Twitter, Youtube, ChevronRight } from "lucide-react";

const LINKS = {
  Explore: [
    { label: "Movies",      href: "/movies" },
    { label: "Songs",       href: "/songs" },
    { label: "Cast & Crew", href: "/cast" },
    { label: "News",        href: "/news" },
    { label: "Blog",        href: "/blog" },
  ],
  Company: [
    { label: "About Us",   href: "/about" },
    { label: "Contact",    href: "/contact" },
    { label: "Privacy",    href: "/privacy" },
    { label: "Disclaimer", href: "/disclaimer" },
  ],
};

// ─── SEO Links ─────────────────────────────────────────────────────────────────
// Movies use /movies/[category] — no conflict, that route is fresh.
// Songs use /songs/category/[category] — avoids conflict with /songs/[movieSlug]/[songIndex].
// Blog guides use /blog/odia-guides/[slug] — avoids conflict with /blog/[slug] (DB-driven).
const SEO_LINKS = {
  "Explore Movies & Songs": [
    { label: "Odia Movies 2026",        href: "/movies/2026" },
    { label: "Odia Movies 2025",        href: "/movies/2025" },
    { label: "Odia Movies 2024",        href: "/movies/2024" },
    { label: "Upcoming Odia Movies",    href: "/movies/upcoming" },
    { label: "Latest Odia Movies",      href: "/movies/latest" },
    { label: "Blockbuster Odia Movies", href: "/movies/blockbuster" },
    { label: "Odia Songs 2026",         href: "/songs/category/2026" },
    { label: "Latest Odia Songs",       href: "/songs/category/latest" },
    { label: "Trending Songs",          href: "/songs/category/trending" },
    { label: "Old Hit Songs",           href: "/songs/category/classics" },
    { label: "Top Singers",             href: "/songs/category/singers" },
  ],
  "Learn / Discover": [
    { label: "Know About Odia Movies",  href: "/blog/odia-guides/odia-movies" },
    { label: "History of Ollywood",     href: "/blog/odia-guides/history-of-ollywood" },
    { label: "Top 10 Odia Movies",      href: "/blog/odia-guides/top-10-odia-movies" },
    { label: "Best Odia Songs List",    href: "/blog/odia-guides/best-odia-songs" },
    { label: "Famous Odia Actors",      href: "/blog/odia-guides/odia-actors" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-[#0d0d0d] border-t border-[#1a1a1a] mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* SEO sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-[#1a1a1a]">
          {Object.entries(SEO_LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-4 flex items-center gap-1.5">
                <span className="w-4 h-px bg-orange-500" />
                {section}
              </h3>
              <ul className="flex flex-wrap gap-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-orange-400 bg-[#161616] hover:bg-orange-500/10 border border-[#222] hover:border-orange-500/30 px-3 py-1.5 rounded-full transition-all duration-200"
                    >
                      <ChevronRight className="w-3 h-3 opacity-50" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <Film className="w-5 h-5 text-white" />
              </div>
              <span className="font-display text-xl font-bold text-white">
                Olly<span className="text-orange-500">pedia</span>
              </span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
              Ollypedia is the most comprehensive encyclopedia of Odia (Ollywood) cinema —
              covering movies, songs, actors, box office, and news from Odisha&apos;s vibrant film industry.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 text-gray-500 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors" aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {Object.entries(LINKS).map(([section, links]) => (
            <div key={section}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">
                {section}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-gray-400 hover:text-orange-400 transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-[#1a1a1a] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()} Ollypedia. All rights reserved.
          </p>
          <p className="text-gray-600 text-xs">
            Celebrating the richness of Odia cinema 🎬
          </p>
        </div>

      </div>
    </footer>
  );
}